import os
import sys
import asyncio
import warnings
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from core import settings
from core.events import lifespan
from core import (
    AppException,
    DeviceException,
    RecordingException,
    PatientException,
    AnalysisException,
)
from api.v1.router import api_router
from api.v1.endpoints import websocket_router as ws_router
from utils import logger

if sys.platform == "win32":
    policy = asyncio.WindowsSelectorEventLoopPolicy()
    asyncio.set_event_loop_policy(policy)

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
warnings.filterwarnings("ignore", category=UserWarning, module="keras")
warnings.filterwarnings("ignore", category=FutureWarning, module="keras")
warnings.filterwarnings("ignore", module="tensorflow")
logging.getLogger("absl").setLevel(logging.ERROR)

try:
    from sklearn.exceptions import InconsistentVersionWarning

    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except ImportError:
    pass

app = FastAPI(
    title="ECG Live Platform",
    description="Real-time ECG monitoring and analysis system with ML classification",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    error_details = f" | Details: {exc.details}" if exc.details else ""
    logger.error(f"[Exception] {exc.__class__.__name__}: {exc.message}{error_details}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": exc.__class__.__name__,
                "message": exc.message,
                "status_code": exc.status_code,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    tb = traceback.format_exc()
    logger.error(f"[Unhandled Exception] {error_msg}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "type": "InternalServerError",
                "message": "An unexpected error occurred",
                "debug_message": error_msg,
                "traceback": tb.split("\n"),
            }
        },
    )


@app.exception_handler(DeviceException)
async def device_exception_handler(request: Request, exc: DeviceException):
    return await app_exception_handler(request, exc)


@app.exception_handler(RecordingException)
async def recording_exception_handler(request: Request, exc: RecordingException):
    return await app_exception_handler(request, exc)


@app.exception_handler(PatientException)
async def patient_exception_handler(request: Request, exc: PatientException):
    return await app_exception_handler(request, exc)


@app.exception_handler(AnalysisException)
async def analysis_exception_handler(request: Request, exc: AnalysisException):
    return await app_exception_handler(request, exc)


app.include_router(api_router)
app.include_router(ws_router)


@app.get("/.well-known/appspecific/com.chrome.devtools.json")
async def chrome_devtools_json():
    return {}


if __name__ == "__main__":
    logger.info(f"[Config] Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"[Config] API Port: {settings.FLASK_PORT}")
    logger.info(f"[Config] Database: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}")
    logger.info(f"[Config] MQTT Broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")

    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=settings.FLASK_PORT,
        log_level="debug",
        loop="asyncio",
        reload=True,
    )
    server = uvicorn.Server(config)
    try:
        server.run()
    except KeyboardInterrupt:
        pass
