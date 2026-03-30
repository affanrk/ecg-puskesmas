from enum import Enum

SAMPLING_RATE = 100
SAMPLING_RATE_12LEADS = 853
BUFFER_SIZE = 1000
BUFFER_SIZE_12LEADS = 8530
LIVE_BUFFER_SIZE = 1000
LIVE_BUFFER_SIZE_12LEADS = 8530

MIN_SAMPLES_FOR_ANALYSIS = 500

BUTTER_ORDER = 4
BUTTER_CUTOFF = 0.6

MQTT_TOPIC_PATTERN_5LEADS = "raw/ecg/+"
MQTT_TOPIC_PATTERN_12LEADS = "raw/ecg/12leads/+"
MQTT_QOS = 0

DEVICE_TIMEOUT_SECONDS = 2.0
DEVICE_OFFLINE_THRESHOLD = 1.0
WATCHDOG_CHECK_INTERVAL = 0.5

LATENCY_BUFFER_SIZE = 100
PERFORMANCE_LOG_INTERVAL = 10
UI_BROADCAST_THROTTLE_5LEADS = 1
UI_BROADCAST_THROTTLE_12LEADS = 1
BPM_CALCULATION_INTERVAL = 100

DB_BATCH_INTERVAL = 1.0
DB_BATCH_CHUNK_SIZE = 2000
MAX_GAP_FILL_SAMPLES = 500

MAX_HISTORY_RESULTS = 200
MAX_EXPORT_RECORDS = 10000
PLOT_DPI = 150
PLOT_FIGURE_SIZE = (24, 12)


class ECGClassification(str, Enum):
    NORMAL = "Normal"
    ABNORMAL = "Abnormal"
    POTENTIAL_ARRHYTHMIA = "Berpotensi Aritmia"
    HIGH_RISK_ARRHYTHMIA = "Sangat Berpotensi Aritmia"
    UNKNOWN = "Unknown"
    PENDING = "Pending"
    RECORDING = "Recording..."
    INSUFFICIENT_DATA = "Insufficient Data"


CLASS_INDEX_MAP = {
    1: ECGClassification.ABNORMAL,
    2: ECGClassification.NORMAL,
    3: ECGClassification.POTENTIAL_ARRHYTHMIA,
    4: ECGClassification.HIGH_RISK_ARRHYTHMIA,
}


class WSMessageType(str, Enum):
    PING = "ping"
    PONG = "pong"
    SUBSCRIBE = "subscribe_to_device"
    UNSUBSCRIBE = "unsubscribe"
    START_RECORDING = "start_recording"
    STOP_RECORDING = "stop_recording"
    CALCULATE_LIVE_BPM = "calculate_live_bpm"

    ERROR = "error"
    STATE_UPDATE = "state_update"
    PERFORMANCE_UPDATE = "performance_update"
    PROGRESS_UPDATE = "progress_update"
    DEVICE_LIST_UPDATE = "device_list_update"
    DEVICE_STATUS_UPDATE = "device_status_update"
    DEVICE_DISCONNECTED = "device_disconnected"
    RECORDING_CANCELLED = "recording_cancelled"
    HISTORY_UPDATED = "history_updated"
    LIVE_RESULT = "live_result"
    LIVE_5LEADS_BATCH = "live_5leads_batch"
    LIVE_12LEADS_BATCH = "live_12leads_batch"


SOFT_DELETE_ENABLED = False

DB_POOL_SIZE = 20
DB_MAX_OVERFLOW = 40
DB_POOL_PRE_PING = True

DEFAULT_MODEL_DIR = "ml_models"
DEFAULT_SCALER_FILE = "scaler2.pkl"
DEFAULT_MODEL_FILE = "modelann_nonorm2.h5"


MIN_PATIENT_ID_LENGTH = 1
MAX_PATIENT_ID_LENGTH = 50

MIN_NAME_LENGTH = 1
MAX_NAME_LENGTH = 100

MIN_AGE = 0
MAX_AGE = 150

RECORDING_ID_FORMAT = "uuid4"


FEATURE_NAMES = [
    "RR_avg",
    "PR_avg",
    "QS_avg",
    "QTc_avg",
    "ST_avg",
    "RS_ratio_V1",
    "BPM",
]

NUM_FEATURES = len(FEATURE_NAMES)

LOG_FORMAT = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_LEVEL = "INFO"
