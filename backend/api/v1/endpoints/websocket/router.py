from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import uuid
import asyncio
import numpy as np

from services.device import device_state_manager, device_watchdog_service
from services.analysis import signal_processor
from repositories.session import SessionRepository
from core.dependencies import get_session_repository
from core import DatabaseException
from utils import logger, WSMessageType, SAMPLING_RATE

router = APIRouter()


class WebSocketHandler:

    def __init__(self, websocket: WebSocket, session_repo: SessionRepository):

        self.websocket = websocket
        self.session_repo = session_repo
        self.current_device_id: str | None = None

    async def handle_message(self, message: dict):

        m_type = message.get("type")
        handlers = {
            WSMessageType.SUBSCRIBE.value: self._handle_subscribe,
            WSMessageType.UNSUBSCRIBE.value: self._handle_unsubscribe,
            WSMessageType.START_RECORDING.value: self._handle_start_recording,
            WSMessageType.STOP_RECORDING.value: self._handle_stop_recording,
            WSMessageType.CALCULATE_LIVE_BPM.value: self._handle_calculate_live_bpm,
        }
        handler = handlers.get(m_type)
        if handler:
            await handler(message)
        elif m_type == WSMessageType.PING.value:
            await self.websocket.send_json({"type": WSMessageType.PONG.value})

    async def _handle_calculate_live_bpm(self, message: dict):

        device_id = message.get("device_id")
        data = message.get("data")

        if not device_id or not data or not isinstance(data, list):
            return

        try:
            loop = asyncio.get_running_loop()
            bpm = await loop.run_in_executor(
                None,
                signal_processor.calculate_bpm_fast,
                np.array(data),
                SAMPLING_RATE,
            )

            if bpm and bpm > 0:
                await device_state_manager.broadcast_to_device(
                    device_id,
                    WSMessageType.LIVE_METRICS.value,
                    {"device_id": device_id, "data": {"bpm": bpm}},
                )
        except Exception as e:
            logger.error(f"Failed to calculate live BPM: {e}")

    async def _handle_subscribe(self, message: dict):

        device_id = message.get("device_id")
        if not device_id:
            return

        success = device_state_manager.subscribe_to_device(self.websocket, device_id)
        if success:
            self.current_device_id = device_id

            await self.websocket.send_json(
                {
                    "type": WSMessageType.DEVICE_STATUS_UPDATE.value,
                    "device_id": device_id,
                    "status": "Connected",
                }
            )

            state = device_state_manager.get_state(device_id)
            await self.websocket.send_json(
                {
                    "type": WSMessageType.STATE_UPDATE.value,
                    "device_id": device_id,
                    "is_recording": state.is_recording,
                    "status_message": state.status_message,
                    "recording_id": state.recording_id,
                    "subject_id": state.subject_id,
                }
            )

            await device_state_manager.notify_device_list_update()
        else:

            await self.websocket.send_json(
                {
                    "type": WSMessageType.ERROR.value,
                    "message": f"Device {device_id} is busy or locked.",
                }
            )

    async def _handle_unsubscribe(self, message: dict):

        if self.current_device_id:
            unlocked = device_state_manager.unsubscribe_from_device(self.websocket)
            self.current_device_id = None
            if unlocked:
                await device_state_manager.notify_device_list_update()

    async def _handle_start_recording(self, message: dict):

        device_id = message.get("device_id")
        user_id_raw = message.get("user_id") or message.get("subject_id")
        source = message.get("source", "WEB")

        if not device_id or not user_id_raw:
            return

        try:
            user_id = int(user_id_raw)
        except ValueError:
            logger.error(f"Invalid user_id format: {user_id_raw}")
            return

        recording_id = str(uuid.uuid4())
        try:
            self.session_repo.create_session(
                recording_id, device_id, user_id, created_by=source
            )

            state = device_state_manager.get_state(device_id)
            state.is_recording = True
            state.recording_id = recording_id
            state.subject_id = str(user_id)
            state.segment_count = 1
            state.recording_source = source
            state.status_message = "Recording..."

            await device_state_manager.notify_state_update(device_id)
        except DatabaseException as e:
            logger.error(f"Failed to create session in DB: {e}", exc_info=True)
            await self.websocket.send_json(
                {
                    "type": WSMessageType.ERROR.value,
                    "message": "Failed to create recording session in database.",
                }
            )
        except Exception as e:
            logger.error(f"Failed to start recording: {e}", exc_info=True)
            await self.websocket.send_json(
                {
                    "type": WSMessageType.ERROR.value,
                    "message": "Failed to start recording due to an unexpected error.",
                }
            )

    async def _handle_stop_recording(self, message: dict):

        device_id = message.get("device_id")
        if device_id:
            await device_watchdog_service.force_cancel_recording(device_id)

    async def cleanup(self):

        if self.current_device_id:
            unlocked = device_state_manager.unsubscribe_from_device(self.websocket)
            if unlocked:
                await device_state_manager.notify_device_list_update()
        device_state_manager.unregister_broadcast_connection(self.websocket)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, s_repo: SessionRepository = Depends(get_session_repository)
):

    await websocket.accept()

    device_state_manager.register_broadcast_connection(websocket)

    device_list = device_state_manager.get_all_device_summaries()
    await websocket.send_json(
        {"type": WSMessageType.DEVICE_LIST_UPDATE.value, "devices": device_list}
    )

    handler = WebSocketHandler(websocket, s_repo)
    try:
        while True:
            data = await websocket.receive_json()
            await handler.handle_message(data)
    except WebSocketDisconnect:
        logger.info(
            f"[WebSocket] Client {websocket.client.host}:{websocket.client.port} disconnected."
        )
    except Exception as e:
        logger.error(
            f"[WebSocket] Unexpected error in websocket_endpoint: {e}", exc_info=True
        )
        try:
            await websocket.send_json(
                {"type": "error", "message": "An unexpected server error occurred."}
            )
        except RuntimeError:

            pass
    finally:
        await handler.cleanup()
