import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from core import Base, engine
from utils import logger
from core.exceptions.definitions import AppException
from services import (
    recording_storage_service,
    ml_engine_5leads,
    ml_engine_12leads,
    mqtt_service,
    device_watchdog_service,
    device_state_manager,
)


class ApplicationState:

    def __init__(self) -> None:
        self.background_tasks: list[asyncio.Task] = []
        self.mqtt_connected: bool = False
        self.is_running: bool = False

    async def start(self) -> None:
        logger.debug("[events.lifespan] Starting start...")
        try:
            logger.info("[Lifecycle] Starting ECG Live Platform")

            loop = asyncio.get_running_loop()
            logger.info(f"[Lifecycle] Event Loop: {type(loop).__name__}")
            if "Proactor" in type(loop).__name__:
                logger.warning(
                    "[Lifecycle] Running on ProactorEventLoop. MQTT may fail on Windows."
                )
                logger.warning(
                    "[Lifecycle] Please run with 'python app/main.py' to ensure SelectorEventLoop is used."
                )

            try:
                await self._init_database()
            except Exception as e:
                logger.error(f"[Lifecycle] Failed to initialize database: {e}")
                logger.warning(
                    "[Lifecycle] Application will start without database connection. Some features may fail."
                )

            try:
                await self._init_ml_service()
            except Exception as e:
                logger.error(f"[Lifecycle] Failed to load ML models: {e}")

            device_state_manager.on_lock_lost_callback = (
                device_watchdog_service.force_cancel_recording
            )

            await self._start_background_tasks()

            try:
                await self._connect_mqtt()
            except Exception as e:
                logger.error(f"[Lifecycle] Failed to connect to MQTT: {e}")

            self.is_running = True
            logger.debug("[events.lifespan] Successfully completed start.")
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[events.lifespan] Error in start: {e}")
            raise AppException(message=str(e))

    async def stop(self) -> None:
        logger.debug("[events.lifespan] Starting stop...")
        try:
            logger.info("[Lifecycle] Shutting down ECG Live Platform")

            self.is_running = False

            logger.info("[Lifecycle] Cancelling background tasks...")
            for task in self.background_tasks:
                task.cancel()

            await asyncio.gather(*self.background_tasks, return_exceptions=True)
            self.background_tasks.clear()
            logger.info("[Lifecycle] Background tasks stopped")

            logger.info("[Lifecycle] Disconnecting MQTT...")
            await mqtt_service.disconnect()
            logger.info("[Lifecycle] MQTT disconnected")

            logger.info("[Lifecycle] Shutting down ML services...")
            ml_engine_5leads.shutdown()
            ml_engine_12leads.shutdown()
            logger.info("[Lifecycle] ML services stopped")

            logger.info("[Lifecycle] Closing WebSocket connections...")
            await self._close_websockets()
            logger.info("[Lifecycle] WebSocket connections closed")

            logger.info("[Lifecycle] Shutdown complete")
            logger.debug("[events.lifespan] Successfully completed stop.")
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[events.lifespan] Error in stop: {e}")
            raise AppException(message=str(e))

    async def _init_database(self) -> None:
        logger.debug("[events.lifespan] Starting _init_database...")
        try:
            logger.info("[Lifecycle] Initializing database...")

            Base.metadata.create_all(bind=engine)

            await recording_storage_service.cleanup_zombie_sessions()

            logger.info("[Lifecycle] Database initialized")
            logger.debug("[events.lifespan] Successfully completed _init_database.")
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[events.lifespan] Error in _init_database: {e}")
            raise AppException(message=str(e))

    async def _init_ml_service(self) -> None:
        logger.debug("[events.lifespan] Starting _init_ml_service...")
        try:
            logger.info("[Lifecycle] Loading ML models...")
            ml_engine_5leads.load_model()
            ml_engine_12leads.load_model()
            logger.info("[Lifecycle] ML models loaded")
            logger.debug("[events.lifespan] Successfully completed _init_ml_service.")
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[events.lifespan] Error in _init_ml_service: {e}")
            raise AppException(message=str(e))

    async def _start_background_tasks(self) -> None:
        logger.debug("[events.lifespan] Starting _start_background_tasks...")
        try:
            logger.info("[Lifecycle] Starting background workers...")

            tasks = [
                ("DB Batch Inserter", recording_storage_service.run_batch_inserter()),
                ("Device Watchdog", device_watchdog_service.run()),
                ("Heartbeat Worker", self._heartbeat_worker()),
            ]

            for name, coro in tasks:
                task = asyncio.create_task(coro, name=name)
                self.background_tasks.append(task)
                logger.info(f"[Lifecycle] Background task started: {name}")
            logger.debug(
                "[events.lifespan] Successfully completed _start_background_tasks."
            )
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[events.lifespan] Error in _start_background_tasks: {e}")
            raise AppException(message=str(e))

    async def _connect_mqtt(self) -> None:
        logger.debug("[events.lifespan] Starting _connect_mqtt...")
        try:
            logger.info("[Lifecycle] Connecting to MQTT broker...")

            mqtt_task = asyncio.create_task(mqtt_service.listen(), name="MQTT Listener")
            self.background_tasks.append(mqtt_task)

            await asyncio.sleep(1)

            logger.info("[Lifecycle] MQTT listener started")
            logger.debug("[events.lifespan] Successfully completed _connect_mqtt.")
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[events.lifespan] Error in _connect_mqtt: {e}")
            raise AppException(message=str(e))

    async def _heartbeat_worker(self) -> None:
        logger.debug("[events.lifespan] Starting _heartbeat_worker...")
        try:
            import time

            while True:
                await asyncio.sleep(30)
                if self.is_running:
                    await device_state_manager.broadcast_to_all(
                        {"type": "ping", "timestamp": time.time()}
                    )
        except Exception as e:
            logger.error(f"[events.lifespan] Error in _heartbeat_worker: {e}")
            raise AppException(message=str(e))

    async def _close_websockets(self) -> None:
        logger.debug("[events.lifespan] Starting _close_websockets...")
        try:
            for ws in list(device_state_manager.broadcast_connections):
                try:
                    await ws.close(code=1001, reason="Server shutdown")
                except Exception:
                    pass

            device_state_manager.broadcast_connections.clear()

            for connections in device_state_manager.websocket_connections.values():
                for ws in list(connections):
                    try:
                        await ws.close(code=1001, reason="Server shutdown")
                    except Exception:
                        pass
                connections.clear()

            device_state_manager.websocket_connections.clear()
            device_state_manager.ws_device_map.clear()
            logger.debug("[events.lifespan] Successfully completed _close_websockets.")
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[events.lifespan] Error in _close_websockets: {e}")
            raise AppException(message=str(e))


app_state = ApplicationState()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.debug("[events.lifespan] Starting lifespan...")
    try:
        await app_state.start()

        yield

        await app_state.stop()
        logger.debug("[events.lifespan] Successfully completed lifespan.")
    except AppException:
        raise
    except Exception as e:
        logger.error(f"[events.lifespan] Error in lifespan: {e}")
        raise AppException(message=str(e))


async def startup_for_testing() -> None:
    logger.debug("[events.lifespan] Starting startup_for_testing...")
    try:
        logger.info("[Lifecycle] Starting in TEST mode...")

        Base.metadata.create_all(bind=engine)
        ml_engine_5leads.load_model()
        ml_engine_12leads.load_model()

        logger.info("[Lifecycle] Test environment ready")
        logger.debug("[events.lifespan] Successfully completed startup_for_testing.")
    except AppException:
        raise
    except Exception as e:
        logger.error(f"[events.lifespan] Error in startup_for_testing: {e}")
        raise AppException(message=str(e))


async def shutdown_for_testing() -> None:
    logger.debug("[events.lifespan] Starting shutdown_for_testing...")
    try:
        ml_engine_5leads.shutdown()
        ml_engine_12leads.shutdown()
        logger.info("[Lifecycle] Test environment cleaned up")
        logger.debug("[events.lifespan] Successfully completed shutdown_for_testing.")
    except AppException:
        raise
    except Exception as e:
        logger.error(f"[events.lifespan] Error in shutdown_for_testing: {e}")
        raise AppException(message=str(e))
