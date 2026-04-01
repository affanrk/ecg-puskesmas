from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
import uuid
import asyncio
import numpy as np
from jose import jwt, JWTError

from core import settings
from core.dependencies import get_session_repository, get_user_repository
from repositories.user import UserRepository
from repositories.session import SessionRepository
from services.device import device_state_manager, device_watchdog_service
from services.analysis import (
    signal_processor_5leads,
    signal_processor_12leads,
)
from core import DatabaseException
from core.exceptions.definitions import AppException
from utils import logger, WSMessageType, SAMPLING_RATE

router = APIRouter()


class WebSocketHandler:
    def __init__(
        self,
        websocket: WebSocket,
        session_repo: SessionRepository,
        user_repo: UserRepository,
        user_id: str,
        sid: str,
    ):
        self.websocket = websocket
        self.session_repo = session_repo
        self.user_repo = user_repo
        self.user_id = user_id
        self.sid = sid
        self.current_device_id: str | None = None

    async def verify_session(self) -> bool:
        try:
            db_user = self.user_repo.find_by_id(self.user_id)
            if not db_user or db_user.current_session_id != self.sid:
                return False

            self.user_repo.refresh_user(db_user)

            if db_user.current_session_id != self.sid:
                return False
            return True
        except Exception as e:
            logger.error(f"[WS] Error verifying session in WebSocket: {e}")
            return False

    async def handle_message(self, message: dict) -> bool:
        m_type = message.get("type", "")

        if not await self.verify_session():
            logger.warning(
                f"[WS] Session mismatch or expired for User ID {self.user_id}. Kicking connection."
            )
            try:
                await self.websocket.send_json(
                    {
                        "type": WSMessageType.ERROR.value,
                        "message": "Session expired: User logged in from another device",
                    }
                )
                await self.websocket.close(code=4003)
            except Exception:
                pass
            return False

        if m_type in [WSMessageType.PING.value, WSMessageType.PONG.value]:
            logger.debug(f"[WS] Received {m_type.upper()} from {self.user_id}")
        elif m_type == WSMessageType.CALCULATE_LIVE_BPM.value:
            logger.debug(f"[WS] Received calculation request from {self.user_id}")
        else:
            logger.debug(f"[WS] Received {m_type} from User ID {self.user_id}")

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
            logger.debug(f"[WS] Echoed PONG to {self.user_id}")
        elif m_type == WSMessageType.PONG.value:
            logger.debug(f"[WS] Received PONG keep-alive from {self.user_id}")
        else:
            logger.warning(f"[WS] Unhandled message type: {m_type}")

        return True

    async def _handle_calculate_live_bpm(self, message: dict):
        try:
            device_id = message.get("device_id")
            data = message.get("data")

            if not device_id or not data or not isinstance(data, list):
                logger.warning(
                    f"[WS] Invalid live BPM calculation request from {self.user_id}"
                )
                return

            state = device_state_manager.get_state(device_id)
            proc = (
                signal_processor_12leads
                if state.current_lead_mode == 12
                else signal_processor_5leads
            )

            loop = asyncio.get_running_loop()
            bpm = await loop.run_in_executor(
                None,
                proc.calculate_bpm_fast,
                np.array(data),
                SAMPLING_RATE,
            )

            if bpm and bpm > 0:
                await device_state_manager.broadcast_to_device(
                    device_id,
                    WSMessageType.CALCULATE_LIVE_BPM.value,
                    {"device_id": device_id, "data": {"bpm": bpm}},
                )
        except AppException as e:
            logger.error(f"[WS] Application error in _handle_calculate_live_bpm: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": str(e)}
            )
        except Exception as e:
            logger.error(f"[WS] Unexpected error in _handle_calculate_live_bpm: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": "Internal Server Error"}
            )

    async def _handle_subscribe(self, message: dict):
        try:
            device_id = message.get("device_id")
            if not device_id:
                return

            success = await device_state_manager.subscribe_to_device(
                self.websocket, device_id
            )
            if success:
                self.current_device_id = device_id
                logger.info(
                    f"[WS] User {self.user_id} subscribed to device {device_id}"
                )

                await self.websocket.send_json(
                    {
                        "type": "subscription_success",
                        "device_id": device_id,
                    }
                )

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
            else:
                logger.warning(
                    f"[WS] User {self.user_id} failed to subscribe to device {device_id} (missing or busy)"
                )
                await self.websocket.send_json(
                    {
                        "type": WSMessageType.DEVICE_DISCONNECTED.value,
                        "device_id": device_id,
                        "reason": "Device no longer available or locked",
                    }
                )
        except AppException as e:
            logger.error(f"[WS] Application error in _handle_subscribe: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": str(e)}
            )
        except Exception as e:
            logger.error(f"[WS] Unexpected error in _handle_subscribe: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": "Internal Server Error"}
            )

    async def _handle_unsubscribe(self, message: dict):
        try:
            if self.current_device_id:
                device_id = self.current_device_id
                logger.info(f"[WS] User {self.user_id} unsubscribed from {device_id}")
                unlocked = await device_state_manager.unsubscribe_from_device(
                    self.websocket
                )
                self.current_device_id = None

                await self.websocket.send_json(
                    {
                        "type": "unsubscription_success",
                        "device_id": device_id,
                    }
                )

                if unlocked:
                    await device_state_manager.notify_device_list_update()
        except AppException as e:
            logger.error(f"[WS] Application error in _handle_unsubscribe: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": str(e)}
            )
        except Exception as e:
            logger.error(f"[WS] Unexpected error in _handle_unsubscribe: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": "Internal Server Error"}
            )

    async def _handle_start_recording(self, message: dict):
        try:
            device_id = message.get("device_id")
            user_id = self.user_id
            source = message.get("source", "WEB")
            lead_mode_req = message.get("lead_mode")

            if not device_id:
                logger.warning(
                    f"[WS] Missing device_id for start_recording from user {user_id}"
                )
                return

            logger.info(
                f"[WS] User {user_id} starting recording on {device_id} (Source: {source})"
            )
            recording_id = str(uuid.uuid4())
            if not device_state_manager.has_device(device_id):
                logger.warning(
                    f"[WS] Cannot start recording, device {device_id} is not connected."
                )
                return

            state = device_state_manager.get_state(device_id)

            if lead_mode_req and state.current_lead_mode != lead_mode_req:
                logger.warning(
                    f"[WS] Mismatch lead_mode for {device_id}. Req: {lead_mode_req}, Actual: {state.current_lead_mode}"
                )
                return

            device_type = "12LEADS" if state.current_lead_mode == 12 else "5LEADS"

            self.session_repo.create_session(
                recording_id,
                device_id,
                user_id,
                created_by=source,
                device_type=device_type,
            )

            state.is_recording = True
            state.recording_id = recording_id
            state.subject_id = str(user_id)
            state.segment_count = 1
            state.recording_source = source
            state.status_message = "Recording..."

            await device_state_manager.notify_state_update(device_id)
            logger.info(f"[WS] Recording started: {recording_id}")
        except AppException as e:
            logger.error(f"[WS] Application error in _handle_start_recording: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": str(e)}
            )
        except DatabaseException as e:
            logger.error(f"[WS] Failed to create session in DB: {e}")
            await self.websocket.send_json(
                {
                    "type": WSMessageType.ERROR.value,
                    "message": "Failed to create recording session in database.",
                }
            )
        except Exception as e:
            logger.error(f"[WS] Unexpected error in _handle_start_recording: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": "Internal Server Error"}
            )

    async def _handle_stop_recording(self, message: dict):
        try:
            device_id = message.get("device_id")
            if device_id:
                logger.info(
                    f"[WS] User {self.user_id} stopping (cancelling) recording on {device_id}"
                )
                await device_watchdog_service.force_cancel_recording(device_id)
        except AppException as e:
            logger.error(f"[WS] Application error in _handle_stop_recording: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": str(e)}
            )
        except Exception as e:
            logger.error(f"[WS] Unexpected error in _handle_stop_recording: {e}")
            await self.websocket.send_json(
                {"type": WSMessageType.ERROR.value, "message": "Internal Server Error"}
            )

    async def cleanup(self):
        if self.current_device_id:
            state = device_state_manager.get_state(self.current_device_id)
            if state.is_recording and state.subject_id == str(self.user_id):
                logger.info(
                    f"[WS] User {self.user_id} disconnected during active recording on {self.current_device_id}. Cancelling recording."
                )
                await device_watchdog_service.force_cancel_recording(
                    self.current_device_id
                )

            unlocked = await device_state_manager.unsubscribe_from_device(
                self.websocket
            )
            if unlocked:
                await device_state_manager.notify_device_list_update()

        device_state_manager.unregister_broadcast_connection(self.websocket)
        device_state_manager.unregister_user_connection(self.websocket)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(None),
    s_repo: SessionRepository = Depends(get_session_repository),
    u_repo: UserRepository = Depends(get_user_repository),
):
    await websocket.accept()
    client_host = websocket.client.host if websocket.client else "unknown"
    logger.info(f"[WS] Connection attempt from {client_host}")

    if not token:
        logger.warning(f"[WS] Connection rejected: Missing token from {client_host}")
        await websocket.send_json(
            {"type": "error", "message": "Missing authentication token"}
        )
        await websocket.close(code=4001)
        return

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        sid: str = payload.get("sid")

        if not email or not sid:
            raise JWTError("Invalid token payload")

        db_user = u_repo.find_by_identifier(email)
        if not db_user or not db_user.is_active:
            logger.warning(
                f"[WS] Connection rejected: User inactive or not found ({email})"
            )
            raise JWTError("User not found or inactive")

        if db_user.current_session_id and db_user.current_session_id != sid:
            logger.warning(f"[WS] Connection rejected: Session expired for {email}")
            await websocket.send_json({"type": "error", "message": "Session expired"})
            await websocket.close(code=4003)
            return

        user_id = db_user.id
        logger.info(
            f"[WS] User {user_id} (@{db_user.username}) authenticated successfully"
        )

    except JWTError as e:
        logger.error(f"[WS] Auth failed for {client_host}: {e}")
        await websocket.send_json(
            {"type": "error", "message": "Invalid or expired token"}
        )
        await websocket.close(code=4001)
        return

    device_state_manager.register_broadcast_connection(websocket)
    device_state_manager.register_user_connection(str(user_id), websocket)

    device_list = device_state_manager.get_all_device_summaries()
    await websocket.send_json(
        {"type": WSMessageType.DEVICE_LIST_UPDATE.value, "devices": device_list}
    )

    handler = WebSocketHandler(websocket, s_repo, u_repo, str(user_id), str(sid))

    try:
        while True:
            if websocket.client_state.name == "DISCONNECTED":
                break
            data = await websocket.receive_json()
            is_valid = await handler.handle_message(data)
            if not is_valid:
                break
    except WebSocketDisconnect:
        logger.info(f"[WS] User {user_id} disconnected from {client_host}")
    except Exception as e:
        if websocket.client_state.name != "DISCONNECTED":
            logger.error(
                f"[WS] Unexpected error for User {user_id}: {e}", exc_info=True
            )
            try:
                await websocket.send_json(
                    {"type": "error", "message": "An unexpected server error occurred."}
                )
            except RuntimeError:
                pass
    finally:
        await handler.cleanup()
