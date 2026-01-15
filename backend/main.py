"""
Main application entry point - refactored
Now uses new architecture with services, repositories, and clean separation.
"""
import os
import sys
import asyncio
import warnings
import logging

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
warnings.filterwarnings("ignore", category=UserWarning, module='sklearn')
warnings.filterwarnings("ignore", category=UserWarning, module='keras')
warnings.filterwarnings("ignore", category=FutureWarning, module='keras')
warnings.filterwarnings("ignore", module='tensorflow')
logging.getLogger('absl').setLevel(logging.ERROR)

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except ImportError:
    pass

from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.events import lifespan
from core.exceptions import (
    AppException,
    DeviceException,
    RecordingException,
    PatientException,
    AnalysisException
)
from api.v1.router import api_router
from api.v1.endpoints.websocket import router as ws_router
from utils.logger import logger


# ============================================================================
# APPLICATION SETUP
# ============================================================================

app = FastAPI(
    title="ECG Live Platform",
    description="Real-time ECG monitoring and analysis system with ML classification",
    version="2.0.0",
    lifespan=lifespan,  # Use new lifespan context manager
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================================
# MIDDLEWARE
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """
    Handle all custom application exceptions.
    Returns consistent error response format.
    """
    logger.error(
        f"[Exception] {exc.__class__.__name__}: {exc.message}",
        extra={"details": exc.details}
    )
    
    return {
        "error": {
            "type": exc.__class__.__name__,
            "message": exc.message,
            "status_code": exc.status_code,
            "details": exc.details
        }
    }


@app.exception_handler(DeviceException)
async def device_exception_handler(request: Request, exc: DeviceException):
    """Handle device-specific exceptions"""
    return await app_exception_handler(request, exc)


@app.exception_handler(RecordingException)
async def recording_exception_handler(request: Request, exc: RecordingException):
    """Handle recording-specific exceptions"""
    return await app_exception_handler(request, exc)


@app.exception_handler(PatientException)
async def patient_exception_handler(request: Request, exc: PatientException):
    """Handle patient-specific exceptions"""
    return await app_exception_handler(request, exc)


@app.exception_handler(AnalysisException)
async def analysis_exception_handler(request: Request, exc: AnalysisException):
    """Handle analysis-specific exceptions"""
    return await app_exception_handler(request, exc)


# ============================================================================
# ROUTES
# ============================================================================

app.include_router(api_router)
app.include_router(ws_router)

# Silence Chrome DevTools noise
@app.get("/.well-known/appspecific/com.chrome.devtools.json")
async def chrome_devtools_json():
    return {}

# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import asyncio
    import uvicorn
    
    logger.info("=" * 80)
    logger.info("Starting ECG Live Platform v2.0")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"API Port: {settings.FLASK_PORT}")
    logger.info(f"Database: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}")
    logger.info(f"MQTT Broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
    logger.info("=" * 80)

    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=settings.FLASK_PORT,
        log_level="info",
        loop="asyncio",
        reload=True
    )
    server = uvicorn.Server(config)
    
    try:
        server.run()
    except KeyboardInterrupt:
        pass