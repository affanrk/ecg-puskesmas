"""
WebSocket endpoint - refactored from monitor.py
Handles real-time device monitoring and recording control.
Now uses services and repositories for cleaner separation.
"""
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from datetime import datetime

from services.device.state import device_state_manager
from services.device.watchdog import device_watchdog_service
from repositories.patient import PatientRepository
from repositories.session import SessionRepository
from core.dependencies import get_patient_repository, get_session_repository
from core.exceptions import DatabaseException
from utils.constants import WSMessageType
from utils.logger import logger
import uuid


router = APIRouter()


class WebSocketHandler:
    """
    Handles WebSocket message routing and command processing.
    Separates message handling from connection management.
    """
    
    def __init__(
        self,
        websocket: WebSocket,
        patient_repo: PatientRepository,
        session_repo: SessionRepository
    ):
        self.websocket = websocket
        self.patient_repo = patient_repo
        self.session_repo = session_repo
        self.current_device_id: str | None = None
        
    # ========================================================================
    # MESSAGE ROUTING
    # ========================================================================
    
    async def handle_message(self, message: dict):
        """
        Route incoming WebSocket message to appropriate handler.
        """
        message_type = message.get("type")
        
        handlers = {
            WSMessageType.PONG.value: self._handle_pong,
            WSMessageType.SUBSCRIBE.value: self._handle_subscribe,
            WSMessageType.UNSUBSCRIBE.value: self._handle_unsubscribe,
            WSMessageType.START_RECORDING.value: self._handle_start_recording,
            WSMessageType.STOP_RECORDING.value: self._handle_stop_recording,
            WSMessageType.CANCEL_RECORDING.value: self._handle_cancel_recording,
        }
        
        handler = handlers.get(message_type)
        
        if handler:
            await handler(message)
        else:
            logger.warning(f"[WebSocket] Unknown message type: {message_type}")
            await self._send_error(f"Unknown message type: {message_type}")
            
    # ========================================================================
    # MESSAGE HANDLERS
    # ========================================================================
    
    async def _handle_pong(self, message: dict):
        """Handle heartbeat pong response"""
        pass  # Just acknowledge, no action needed
        
    async def _handle_subscribe(self, message: dict):
        """
        Subscribe to device updates.
        Handles device locking and initial state broadcast.
        """
        device_id = message.get("device_id")
        
        if not device_id:
            # Treat empty device_id as unsubscribe request
            if self.current_device_id:
                await self._unsubscribe_from_current_device()
            return
            
        # Unsubscribe from previous device if any
        if self.current_device_id:
            await self._unsubscribe_from_current_device()
            
        # Attempt subscription
        success = device_state_manager.subscribe_to_device(
            self.websocket,
            device_id
        )
        
        if not success:
            await self._send_error(f"Device {device_id} is currently in use")
            # Still update device list
            await device_state_manager.notify_device_list_update()
            return
            
        # Subscription successful
        self.current_device_id = device_id
        
        # Send current state
        await self._send_initial_state(device_id)
        
        # Notify all clients about device list change
        await device_state_manager.notify_device_list_update()
        
    async def _handle_unsubscribe(self, message: dict):
        """Unsubscribe from current device"""
        await self._unsubscribe_from_current_device()
        
    async def _handle_start_recording(self, message: dict):
        """
        Start new recording session.
        Creates patient if needed, initializes session.
        """
        device_id = message.get("device_id")
        patient_id = message.get("subject_id")
        
        if not device_id or not patient_id:
            await self._send_error("Missing device_id or subject_id")
            return
            
        # Extract patient data
        patient_data = {
            "patient_id": patient_id,
            "name": message.get("patient_name", "Unknown"),
            "age": str(message.get("umur", 0)),
            "gender": message.get("jenis_kelamin", "L"),
            "pob": message.get("tempat_lahir", ""),
            "dob": self._parse_date(message.get("tanggal_lahir")),
            "medical_history": message.get("riwayat_penyakit", "Normal")
        }
        
        # Save patient data asynchronously
        await self._save_patient_async(patient_data)
        
        # Get device state
        state = device_state_manager.get_state(device_id)
        
        if state.is_recording:
            await self._send_error("Device is already recording")
            return
            
        # Create new recording session
        recording_id = str(uuid.uuid4())
        
        try:
            # Ensure patient exists
            self.patient_repo.get_or_create(
                patient_id=patient_id,
                name=patient_data["name"],
                gender=patient_data["gender"],
                age=patient_data["age"],
                pob=patient_data["pob"],
                dob=patient_data["dob"],
                medical_history=patient_data["medical_history"]
            )
            
            # Create session
            self.session_repo.create_session(
                recording_id=recording_id,
                device_id=device_id,
                patient_id=patient_id,
                created_by="OPERATOR"
            )
            
            # Update device state
            state.is_recording = True
            state.recording_id = recording_id
            state.subject_id = patient_id
            state.samples_collected = 0
            state.segment_count = 1
            state.status_message = "Recording..."
            
            # Broadcast state update
            await device_state_manager.notify_state_update(device_id)
            
            logger.info(
                f"[WebSocket] Started recording {recording_id} "
                f"for patient {patient_id} on device {device_id}"
            )
            
        except DatabaseException as e:
            logger.error(f"[WebSocket] Failed to start recording: {e}")
            await self._send_error("Failed to start recording. Database error.")
            
    async def _handle_stop_recording(self, message: dict):
        """Stop recording (manual stop)"""
        device_id = message.get("device_id")
        
        if not device_id:
            await self._send_error("Missing device_id")
            return
            
        await device_watchdog_service.force_cancel_recording(
            device_id,
            reason="Manual stop"
        )
        
    async def _handle_cancel_recording(self, message: dict):
        """Cancel recording (user deselected device)"""
        device_id = message.get("device_id")
        
        if not device_id:
            await self._send_error("Missing device_id")
            return
            
        await device_watchdog_service.force_cancel_recording(
            device_id,
            reason="User deselected device"
        )
        
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    async def _send_initial_state(self, device_id: str):
        """
        Send initial state information to newly subscribed client.
        """
        state = device_state_manager.get_state(device_id)
        
        # Base state
        state_data = {
            "type": WSMessageType.STATE_UPDATE.value,
            "device_id": device_id,
            "is_recording": state.is_recording,
            "status_message": state.status_message,
            "recording_id": state.recording_id,
            "subject_id": state.subject_id
        }
        
        # If recording, fetch patient info
        if state.is_recording and state.subject_id:
            patient = self.patient_repo.get_by_patient_id(state.subject_id)
            if patient:
                state_data.update({
                    "patient_name": patient.name,
                    "patient_age": patient.age,
                    "patient_gender": patient.gender,
                    "patient_riwayat": patient.medical_history,
                    "patient_pob": patient.pob,
                    "patient_dob": patient.dob.isoformat() if patient.dob else None
                })
                
        await self.websocket.send_json(state_data)
        
    async def _unsubscribe_from_current_device(self):
        """Unsubscribe from currently subscribed device"""
        if not self.current_device_id:
            return
            
        device_id = self.current_device_id
        state = device_state_manager.get_state(device_id)
        
        # If recording, cancel it
        if state.is_recording:
            logger.warning(
                f"[WebSocket] User disconnected during recording on {device_id}"
            )
            await device_watchdog_service.force_cancel_recording(
                device_id,
                reason="Client disconnected/unsubscribed"
            )
            
        # Unsubscribe
        device_state_manager.unsubscribe_from_device(self.websocket)
        self.current_device_id = None
        
        # Notify device list update
        await device_state_manager.notify_device_list_update()
        
    async def _save_patient_async(self, patient_data: dict):
        """
        Save patient data asynchronously.
        Runs in thread pool to avoid blocking.
        """
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            self._save_patient_sync,
            patient_data
        )
        
    def _save_patient_sync(self, patient_data: dict):
        """Synchronous patient save (runs in thread pool)"""
        try:
            self.patient_repo.merge_patient(patient_data)
        except Exception as e:
            logger.error(f"[WebSocket] Failed to save patient: {e}")
            
    def _parse_date(self, date_str: str | None):
        """Parse date string to date object"""
        if not date_str:
            return None
            
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return None
            
    async def _send_error(self, message: str):
        """Send error message to client"""
        await self.websocket.send_json({
            "type": WSMessageType.ERROR.value,
            "message": message
        })
        
    # ========================================================================
    # CLEANUP
    # ========================================================================
    
    async def cleanup(self):
        """Cleanup on disconnect"""
        # Unsubscribe from device
        await self._unsubscribe_from_current_device()
        
        # Remove from broadcast connections
        device_state_manager.unregister_broadcast_connection(self.websocket)


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    patient_repo: PatientRepository = Depends(get_patient_repository),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Main WebSocket endpoint for real-time device monitoring.
    
    Handles:
    - Device discovery and subscription
    - Recording start/stop
    - Live data streaming
    - Performance monitoring
    """
    await websocket.accept()
    
    # Register for broadcasts
    device_state_manager.register_broadcast_connection(websocket)
    
    # Create handler
    handler = WebSocketHandler(websocket, patient_repo, session_repo)
    
    try:
        # Send initial device list
        device_list = device_state_manager.get_all_device_summaries()
        await websocket.send_json({
            "type": WSMessageType.DEVICE_LIST_UPDATE.value,
            "devices": device_list
        })
        
        # Message loop
        while True:
            data = await websocket.receive_json()
            await handler.handle_message(data)
            
    except WebSocketDisconnect:
        logger.info("[WebSocket] Client disconnected")
    except Exception as e:
        logger.error(f"[WebSocket] Error: {e}")
    finally:
        # Cleanup
        await handler.cleanup()
