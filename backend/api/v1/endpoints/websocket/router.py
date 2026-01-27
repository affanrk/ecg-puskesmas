from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import uuid

from services.device import device_state_manager, device_watchdog_service
from repositories.session import SessionRepository
from core.dependencies import get_session_repository
from core import DatabaseException
from utils import logger, WSMessageType

router = APIRouter()

class WebSocketHandler:
    """
    Handles individual WebSocket connections and their interactions with devices and recordings.
    """
    def __init__(self, websocket: WebSocket, session_repo: SessionRepository):
        """
        Initializes the WebSocketHandler.
        
        Args:
            websocket: The FastAPI WebSocket object for the current connection.
            session_repo: The SessionRepository instance for database operations.
        """
        self.websocket = websocket
        self.session_repo = session_repo
        self.current_device_id: str | None = None
        
    async def handle_message(self, message: dict):
        """
        Routes incoming WebSocket messages to the appropriate handler method based on message type.
        
        Args:
            message: The incoming JSON message from the WebSocket client.
        """
        m_type = message.get("type")
        handlers = {
            "subscribe_to_device": self._handle_subscribe, # Fixed mapping
            "unsubscribe": self._handle_unsubscribe,
            "start_recording": self._handle_start_recording,
            "stop_recording": self._handle_stop_recording,
        }
        handler = handlers.get(m_type)
        if handler: 
            await handler(message)
        elif m_type == "ping":
            await self.websocket.send_json({"type": "pong"})
            
    async def _handle_subscribe(self, message: dict):
        """
        Handles 'subscribe_to_device' messages. Attempts to subscribe the WebSocket
        to a specified device, locking it if successful.
        
        Args:
            message: The incoming 'subscribe_to_device' message containing the 'device_id'.
        """
        device_id = message.get("device_id")
        if not device_id:
            return
        
        success = device_state_manager.subscribe_to_device(self.websocket, device_id)
        if success:
            self.current_device_id = device_id
            
            # Send confirmation
            await self.websocket.send_json({
                "type": WSMessageType.DEVICE_STATUS_UPDATE.value,
                "device_id": device_id,
                "status": "Connected"
            })
            
            # Send INITIAL STATE immediately so UI reflects recording status
            state = device_state_manager.get_state(device_id)
            await self.websocket.send_json({
                "type": WSMessageType.STATE_UPDATE.value,
                "device_id": device_id,
                "is_recording": state.is_recording,
                "status_message": state.status_message,
                "recording_id": state.recording_id,
                "subject_id": state.subject_id
            })
            
            # Notify everyone that this device is now locked
            await device_state_manager.notify_device_list_update()
        else:
            # Notify failure
            await self.websocket.send_json({
                "type": "error",
                "message": f"Device {device_id} is busy or locked."
            })
        
    async def _handle_unsubscribe(self, message: dict):
        """
        Handles 'unsubscribe' messages. Unsubscribes the WebSocket from its
        current device and unlocks the device.
        
        Args:
            message: The incoming 'unsubscribe' message.
        """
        if self.current_device_id:
            unlocked = device_state_manager.unsubscribe_from_device(self.websocket)
            self.current_device_id = None
            if unlocked:
                await device_state_manager.notify_device_list_update()
            
    async def _handle_start_recording(self, message: dict):
        """
        Handles 'start_recording' messages. Initiates a new recording session
        for the subscribed device.
        
        Args:
            message: The incoming 'start_recording' message containing 'device_id' and 'user_id'.
        """
        device_id = message.get("device_id")
        user_id_raw = message.get("user_id") or message.get("subject_id")
        
        if not device_id or not user_id_raw:
            return
        
        try:
            user_id = int(user_id_raw)
        except ValueError:
            logger.error(f"Invalid user_id format: {user_id_raw}")
            return
        
        recording_id = str(uuid.uuid4())
        try:
            self.session_repo.create_session(recording_id, device_id, user_id)
            
            state = device_state_manager.get_state(device_id)
            state.is_recording = True
            state.recording_id = recording_id
            state.subject_id = str(user_id)
            state.segment_count = 1
            state.status_message = "Recording..."
            
            await device_state_manager.notify_state_update(device_id)
        except DatabaseException as e:
            logger.error(f"Failed to create session in DB: {e}", exc_info=True)
            await self.websocket.send_json({"type": "error", "message": "Failed to create recording session in database."})
        except Exception as e: 
            logger.error(f"Failed to start recording: {e}", exc_info=True)
            await self.websocket.send_json({"type": "error", "message": "Failed to start recording due to an unexpected error."})

    async def _handle_stop_recording(self, message: dict):
        """
        Handles 'stop_recording' messages. Forces cancellation of the current recording
        for the specified device.
        
        Args:
            message: The incoming 'stop_recording' message containing 'device_id'.
        """
        device_id = message.get("device_id")
        if device_id:
            await device_watchdog_service.force_cancel_recording(device_id)

    async def cleanup(self):
        """
        Performs cleanup operations when the WebSocket connection is closed.
        Unsubscribes from the current device and unregisters from broadcast updates.
        """
        if self.current_device_id: 
            unlocked = device_state_manager.unsubscribe_from_device(self.websocket)
            if unlocked:
                await device_state_manager.notify_device_list_update()
        device_state_manager.unregister_broadcast_connection(self.websocket)

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    s_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Main WebSocket endpoint for real-time communication with connected clients.
    Handles device subscriptions, recording control, and broadcast updates.
    """
    await websocket.accept()
    
    # Register for broadcasts (device list updates, etc.)
    device_state_manager.register_broadcast_connection(websocket)
    
    # Send initial device list immediately
    device_list = device_state_manager.get_all_device_summaries()
    await websocket.send_json({
        "type": WSMessageType.DEVICE_LIST_UPDATE.value,
        "devices": device_list
    })
    
    handler = WebSocketHandler(websocket, s_repo)
    try:
        while True:
            data = await websocket.receive_json()
            await handler.handle_message(data)
    except WebSocketDisconnect:
        logger.info(f"[WebSocket] Client {websocket.client.host}:{websocket.client.port} disconnected.")
    except Exception as e: 
        logger.error(f"[WebSocket] Unexpected error in websocket_endpoint: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": "An unexpected server error occurred."})
        except RuntimeError:
            # Client already disconnected, cannot send message
            pass
    finally: 
        await handler.cleanup()
