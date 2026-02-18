import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from core import Base, engine
from utils import logger
from services import (
    recording_storage_service,
    ml_engine_service,
    mqtt_service,
    device_watchdog_service,
    device_state_manager,
)


class ApplicationState:

    def __init__(self):
        self.background_tasks: list[asyncio.Task] = []
        self.mqtt_connected: bool = False
        self.is_running: bool = False

    async def start(self):

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

        await self._start_background_tasks()

        try:
            await self._connect_mqtt()
        except Exception as e:
            logger.error(f"[Lifecycle] Failed to connect to MQTT: {e}")

        self.is_running = True

    async def stop(self):

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

        logger.info("[Lifecycle] Shutting down ML service...")
        ml_engine_service.shutdown()
        logger.info("[Lifecycle] ML service stopped")

        logger.info("[Lifecycle] Closing WebSocket connections...")
        await self._close_websockets()
        logger.info("[Lifecycle] WebSocket connections closed")

        logger.info("[Lifecycle] Shutdown complete")

    async def _init_database(self):

        logger.info("[Lifecycle] Initializing database...")

        Base.metadata.create_all(bind=engine)

        await recording_storage_service.cleanup_zombie_sessions()

        logger.info("[Lifecycle] Database initialized")

    async def _init_ml_service(self):

        logger.info("[Lifecycle] Loading ML models...")
        ml_engine_service.load_model()
        logger.info("[Lifecycle] ML models loaded")

    async def _start_background_tasks(self):

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

    async def _connect_mqtt(self):

        logger.info("[Lifecycle] Connecting to MQTT broker...")

        mqtt_task = asyncio.create_task(mqtt_service.listen(), name="MQTT Listener")
        self.background_tasks.append(mqtt_task)

        await asyncio.sleep(1)

        logger.info("[Lifecycle] MQTT listener started")

    async def _heartbeat_worker(self):

        import time

        while True:
            await asyncio.sleep(30)
            if self.is_running:
                await device_state_manager.broadcast_to_all(
                    {"type": "ping", "timestamp": time.time()}
                )

    async def _close_websockets(self):

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


app_state = ApplicationState()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:

    await app_state.start()

    yield

    await app_state.stop()


async def startup_for_testing():

    logger.info("[Lifecycle] Starting in TEST mode...")

    Base.metadata.create_all(bind=engine)
    ml_engine_service.load_model()

    logger.info("[Lifecycle] Test environment ready")


async def shutdown_for_testing():

    ml_engine_service.shutdown()
    logger.info("[Lifecycle] Test environment cleaned up")
