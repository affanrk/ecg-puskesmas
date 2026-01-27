"""
Application lifecycle event handlers.
Manages startup and shutdown tasks in a clean, organized way.
"""
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
    device_state_manager
)


class ApplicationState:
    """
    Holds application-wide state and background tasks.
    Provides clean startup/shutdown management.
    """
    
    def __init__(self):
        self.background_tasks: list[asyncio.Task] = []
        self.mqtt_connected: bool = False
        self.is_running: bool = False
        
    async def start(self):
        """Initialize all application components"""
        
        logger.info("[Lifecycle] Starting ECG Live Platform")
        
        # Check Event Loop Type
        loop = asyncio.get_running_loop()
        logger.info(f"Event Loop: {type(loop).__name__}")
        if "Proactor" in type(loop).__name__:
            logger.warning("[Lifecycle] Running on ProactorEventLoop. MQTT may fail on Windows.")
            logger.warning("[Lifecycle] Please run with 'python app/main.py' to ensure SelectorEventLoop is used.")
        
        # 1. Initialize Database
        try:
            await self._init_database()
        except Exception as e:
            logger.error(f"[Lifecycle] Failed to initialize database: {e}")
            logger.warning("[Lifecycle] Application will start without database connection. Some features may fail.")

        # 2. Initialize ML Models
        try:
            await self._init_ml_service()
        except Exception as e:
            logger.error(f"[Lifecycle] Failed to load ML models: {e}")
        
        # 3. Start Background Workers
        await self._start_background_tasks()
        
        # 4. Connect to MQTT
        try:
            await self._connect_mqtt()
        except Exception as e:
            logger.error(f"[Lifecycle] Failed to connect to MQTT: {e}")
        
        self.is_running = True
        
    async def stop(self):
        """Cleanup all application components"""
        logger.info("[Lifecycle] Shutting down ECG Live Platform")
        
        self.is_running = False
        
        # 1. Cancel background tasks
        logger.info("[Lifecycle] Cancelling background tasks...")
        for task in self.background_tasks:
            task.cancel()
        
        # Wait for cancellation
        await asyncio.gather(*self.background_tasks, return_exceptions=True)
        self.background_tasks.clear()
        logger.info("[Lifecycle] Background tasks stopped")
        
        # 2. Disconnect MQTT
        logger.info("[Lifecycle] Disconnecting MQTT...")
        await mqtt_service.disconnect()
        logger.info("[Lifecycle] MQTT disconnected")
        
        # 3. Shutdown ML service thread pool
        logger.info("[Lifecycle] Shutting down ML service...")
        ml_engine_service.shutdown()
        logger.info("[Lifecycle] ML service stopped")
        
        # 4. Close all WebSocket connections
        logger.info("[Lifecycle] Closing WebSocket connections...")
        await self._close_websockets()
        logger.info("[Lifecycle] WebSocket connections closed")
        
        logger.info("[Lifecycle] Shutdown complete")
        
    async def _init_database(self):
        """Initialize database tables"""
        logger.info("[Lifecycle] Initializing database...")
        
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # Run cleanup for zombie sessions
        await recording_storage_service.cleanup_zombie_sessions()
        
        logger.info("[Lifecycle] Database initialized")
        
    async def _init_ml_service(self):
        """Load ML models into memory"""
        logger.info("[Lifecycle] Loading ML models...")
        ml_engine_service.load_model()
        logger.info("[Lifecycle] ML models loaded")
        
    async def _start_background_tasks(self):
        """Start all background worker tasks"""
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
        """Connect to MQTT broker"""
        logger.info("[Lifecycle] Connecting to MQTT broker...")
        
        # Start MQTT listener task
        mqtt_task = asyncio.create_task(
            mqtt_service.listen(), 
            name="MQTT Listener"
        )
        self.background_tasks.append(mqtt_task)
        
        # Wait a bit for connection
        await asyncio.sleep(1)
        
        logger.info("[Lifecycle] MQTT listener started")
        
    async def _heartbeat_worker(self):
        """Periodic heartbeat to keep connections alive"""
        import time
        while True:
            await asyncio.sleep(30)
            if self.is_running:
                await device_state_manager.broadcast_to_all({
                    "type": "ping",
                    "timestamp": time.time()
                })
                
    async def _close_websockets(self):
        """Close all active WebSocket connections"""
        # Close broadcast connections
        for ws in list(device_state_manager.broadcast_connections):
            try:
                await ws.close(code=1001, reason="Server shutdown")
            except Exception:
                pass
        
        device_state_manager.broadcast_connections.clear()
        
        # Close device-specific connections
        for connections in device_state_manager.websocket_connections.values():
            for ws in list(connections):
                try:
                    await ws.close(code=1001, reason="Server shutdown")
                except Exception:
                    pass
            connections.clear()
        
        device_state_manager.websocket_connections.clear()
        device_state_manager.ws_device_map.clear()


# Global application state instance
app_state = ApplicationState()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI lifespan context manager.
    Replaces the old @app.on_event("startup") and @app.on_event("shutdown").
    
    This is the modern way to handle startup/shutdown in FastAPI 0.109+
    
    Usage in main.py:
        app = FastAPI(lifespan=lifespan)
    """
    # STARTUP
    await app_state.start()
    
    # Application is running
    yield
    
    # SHUTDOWN
    await app_state.stop()


# ============================================================================
# HELPER FUNCTIONS FOR TESTING
# ============================================================================

async def startup_for_testing():
    """
    Simplified startup for testing environments.
    Skips MQTT and some background tasks.
    """
    logger.info("Starting in TEST mode...")
    
    # Only init database and ML
    Base.metadata.create_all(bind=engine)
    ml_engine_service.load_model()
    
    logger.info("Test environment ready")


async def shutdown_for_testing():
    """Simplified shutdown for testing"""
    ml_engine_service.shutdown()
    logger.info("Test environment cleaned up")
