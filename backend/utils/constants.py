# app/utils/constants.py
"""
Application-wide constants.
Centralizes magic numbers and configuration values for maintainability.
"""
from enum import Enum


# ============================================================================
# SIGNAL PROCESSING CONSTANTS
# ============================================================================

SAMPLING_RATE = 100  # Hz - ECG sampling rate
BUFFER_SIZE = 1000  # Number of samples per recording segment
LIVE_BUFFER_SIZE = 400  # Number of samples for live DSP visualization

# Minimum samples required for analysis
MIN_SAMPLES_FOR_ANALYSIS = 500

# DSP Filter Parameters
BUTTER_ORDER = 4
BUTTER_CUTOFF = 0.6  # Baseline wander removal
FIR_FILTER_CUTOFF = 4.0  # Hz
FIR_RIPPLE_DB = 60.0


# ============================================================================
# MQTT CONSTANTS
# ============================================================================

MQTT_TOPIC_PATTERN = "raw/ecg/+"
MQTT_QOS = 0


# ============================================================================
# DEVICE MANAGEMENT
# ============================================================================

DEVICE_TIMEOUT_SECONDS = 2.0  # Time before device considered disconnected (Aggressive)
DEVICE_OFFLINE_THRESHOLD = 1.0  # Time before marking device offline
WATCHDOG_CHECK_INTERVAL = 0.5  # Check twice per second


# ============================================================================
# PERFORMANCE MONITORING
# ============================================================================

LATENCY_BUFFER_SIZE = 100  # Number of latency measurements to keep
PERFORMANCE_LOG_INTERVAL = 10  # Log performance every N packets
UI_BROADCAST_THROTTLE = 5  # Broadcast to UI every N samples
BPM_CALCULATION_INTERVAL = 100  # Calculate BPM every N packets


# ============================================================================
# RECORDING SETTINGS
# ============================================================================

MAX_GAP_FILL_SAMPLES = 50  # Maximum samples to interpolate for packet loss
DB_BATCH_INTERVAL = 1.0  # Seconds between database batch inserts
DB_BATCH_CHUNK_SIZE = 2000  # Max records per insert batch


# ============================================================================
# API SETTINGS
# ============================================================================

MAX_HISTORY_RESULTS = 200  # Maximum history records to return
MAX_EXPORT_RECORDS = 10000  # Maximum records for CSV export
PLOT_DPI = 150  # DPI for generated ECG plots
PLOT_FIGURE_SIZE = (24, 12)  # Inches


# ============================================================================
# ML/ANALYSIS CONSTANTS
# ============================================================================

class ECGClassification(str, Enum):
    """ECG classification categories"""
    NORMAL = "Normal"
    ABNORMAL = "Abnormal"
    POTENTIAL_ARRHYTHMIA = "Berpotensi Aritmia"
    HIGH_RISK_ARRHYTHMIA = "Sangat Berpotensi Aritmia"
    UNKNOWN = "Unknown"
    PENDING = "Pending"
    RECORDING = "Recording..."
    INSUFFICIENT_DATA = "Insufficient Data"


# Map model output indices to classifications
CLASS_INDEX_MAP = {
    1: ECGClassification.ABNORMAL,
    2: ECGClassification.NORMAL,
    3: ECGClassification.POTENTIAL_ARRHYTHMIA,
    4: ECGClassification.HIGH_RISK_ARRHYTHMIA,
}


# ============================================================================
# WEBSOCKET MESSAGE TYPES
# ============================================================================

class WSMessageType(str, Enum):
    """WebSocket message types for type-safe messaging"""
    
    # Client -> Server
    PING = "ping"
    PONG = "pong"
    SUBSCRIBE = "subscribe_to_device"
    UNSUBSCRIBE = "unsubscribe"
    START_RECORDING = "start_recording"
    STOP_RECORDING = "stop_recording"
    CANCEL_RECORDING = "cancel_recording"
    
    # Server -> Client
    ERROR = "error"
    STATE_UPDATE = "state_update"
    LIVE_DATA = "live_data"
    LIVE_METRICS = "live_metrics_update"
    PERFORMANCE_UPDATE = "performance_update"
    PROGRESS_UPDATE = "progress_update"
    DEVICE_LIST_UPDATE = "device_list_update"
    DEVICE_STATUS_UPDATE = "device_status_update"
    DEVICE_DISCONNECTED = "device_disconnected"
    RECORDING_CANCELLED = "recording_cancelled"
    HISTORY_UPDATED = "history_updated"
    LIVE_RESULT = "live_result"  # New classification available


# ============================================================================
# DATABASE SETTINGS
# ============================================================================

# Soft delete settings
SOFT_DELETE_ENABLED = False

# Connection pool settings (these override config.py if needed)
DB_POOL_SIZE = 20
DB_MAX_OVERFLOW = 40
DB_POOL_PRE_PING = True


# ============================================================================
# FILE PATHS
# ============================================================================

DEFAULT_MODEL_DIR = "models"
DEFAULT_SCALER_FILE = "scaler2.pkl"
DEFAULT_MODEL_FILE = "modelann_nonorm2.h5"


# ============================================================================
# GENDER CODES
# ============================================================================

class Gender(str, Enum):
    """Gender codes used in patient records"""
    MALE = "L"  # Laki-laki
    FEMALE = "P"  # Perempuan
    UNKNOWN = "U"  # Unknown


# ============================================================================
# VALIDATION RULES
# ============================================================================

# Patient ID (NIK) validation
MIN_PATIENT_ID_LENGTH = 1
MAX_PATIENT_ID_LENGTH = 50

# Name validation
MIN_NAME_LENGTH = 1
MAX_NAME_LENGTH = 100

# Age validation
MIN_AGE = 0
MAX_AGE = 150

# Recording ID format
RECORDING_ID_FORMAT = "uuid4"  # Use UUID4 for recording IDs


# ============================================================================
# ERROR CODES
# ============================================================================

class ErrorCode(str, Enum):
    """Standard error codes for API responses"""
    DEVICE_NOT_FOUND = "DEVICE_NOT_FOUND"
    DEVICE_BUSY = "DEVICE_BUSY"
    DEVICE_DISCONNECTED = "DEVICE_DISCONNECTED"
    RECORDING_NOT_FOUND = "RECORDING_NOT_FOUND"
    RECORDING_IN_PROGRESS = "RECORDING_IN_PROGRESS"
    PATIENT_NOT_FOUND = "PATIENT_NOT_FOUND"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    ANALYSIS_FAILED = "ANALYSIS_FAILED"
    DATABASE_ERROR = "DATABASE_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    MQTT_ERROR = "MQTT_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# ============================================================================
# FEATURE NAMES (for ML model)
# ============================================================================

FEATURE_NAMES = [
    "RR_avg",
    "PR_avg", 
    "QS_avg",
    "QTc_avg",
    "ST_avg",
    "RS_ratio_V1",
    "BPM"
]

NUM_FEATURES = len(FEATURE_NAMES)


# ============================================================================
# LOGGING SETTINGS
# ============================================================================

LOG_FORMAT = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_LEVEL = "INFO"  # Can be overridden by environment variable
