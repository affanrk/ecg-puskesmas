import os
import sys
import asyncio
import warnings
import logging
import traceback
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import uvicorn
import uuid

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

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time

    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}".format(process_time)
    logger.info(
        f"RID: {request.state.request_id if hasattr(request.state, 'request_id') else 'N/A'} | "
        f"{request.method} {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Time: {formatted_process_time}ms"
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    formatted_errors = []
    for error in errors:
        msg = error.get("msg")
        if msg.startswith("Value error, "):
            msg = msg.replace("Value error, ", "")

        formatted_errors.append(
            {
                "loc": error.get("loc"),
                "msg": msg,
                "type": error.get("type"),
            }
        )

    logger.warning(
        f"[Validation Error] {request.method} {request.url.path} -> {formatted_errors}"
    )

    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "type": "ValidationError",
                "message": "Validation failed",
                "status_code": 422,
                "details": formatted_errors,
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        f"[HTTP Exception] {request.method} {request.url.path} -> Status {exc.status_code}: {exc.detail}"
    )

    message = "An error occurred"
    details = None

    if isinstance(exc.detail, str):
        message = exc.detail
    elif isinstance(exc.detail, list):
        message = "Validation failed"
        details = exc.detail
    elif isinstance(exc.detail, dict):
        message = exc.detail.get("message", "An error occurred")
        details = exc.detail.get("details", exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": "HttpException",
                "message": message,
                "status_code": exc.status_code,
                "details": details,
            }
        },
    )


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    error_details = f" | Details: {exc.details}" if exc.details else ""
    log_msg = f"[Exception] {request.method} {request.url.path} -> {exc.__class__.__name__}: {exc.message}{error_details}"

    if 400 <= exc.status_code < 500:
        logger.warning(log_msg)
    else:
        logger.error(log_msg)

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
    logger.error(
        f"[Unhandled Exception] {request.method} {request.url.path} -> {error_msg}\n{tb}"
    )
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
    logger.info(f"[Config] Environment: {settings.ENVIRONMENT}")
    logger.info(f"[Config] API Port: {settings.FLASK_PORT}")
    logger.info(f"[Config] Database: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}")
    logger.info(f"[Config] MQTT Broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")

    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=settings.FLASK_PORT,
        log_level=settings.LOG_LEVEL.lower(),
        loop="asyncio",
        reload=True,
    )
    server = uvicorn.Server(config)
    try:
        server.run()
    except KeyboardInterrupt:
        pass
