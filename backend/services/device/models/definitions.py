import time
import asyncio
from collections import deque
from typing import List, Optional, Deque, Dict
from fastapi import WebSocket
from utils import (
    logger,
    SAMPLING_RATE,
    BUFFER_SIZE,
    LIVE_BUFFER_SIZE,
    LIVE_BUFFER_SIZE_12LEADS,
    BUFFER_SIZE_12LEADS,
)
from core.exceptions.definitions import AppException


class DeviceState:

    def __init__(self, device_id: str):
        logger.debug(f"[DeviceState] Starting __init__ for {device_id}...")
        try:
            self.device_id = device_id

            self.is_recording = False
            self.subject_id: Optional[str] = None
            self.recording_id: Optional[str] = None
            self.recording_source: str = "WEB"
            self.samples_collected = 0
            self.segment_count = 0
            self.status_message = "Idle"
            self.current_lead_mode: Optional[int] = None

            self.last_raw_values = {"lead_i": 0, "lead_ii": 0, "v1": 0}
            self.last_cal_values = {
                "lead_i": 0.0,
                "lead_ii": 0.0,
                "lead_iii": 0.0,
                "avf": 0.0,
                "v1": 0.0,
            }

            self.last_packet_num = 0
            self.packet_buffer: List[tuple] = []
            self.lost_packets = 0
            self.total_packets = 0
            self.sampling_rate = SAMPLING_RATE
            self.observed_sps = float(SAMPLING_RATE)
            self.last_hw_ts_us: float = 0.0
            self.last_hw_counter = 0
            self.latencies: Deque[float] = deque(maxlen=100)
            self.bpm_history: Deque[float] = deque(maxlen=5)
            self.min_latency_offset = float("inf")
            self.packet_format = "Unknown"

            self.last_seen = time.time()
            self.is_connected = False
            self.locked_by: Optional[WebSocket] = None
            self.broadcast_count_5leads: int = 0
            self.broadcast_count_12leads: int = 0

            self.last_performance_update = 0.0
            self.last_bpm_update = 0.0
            self.last_ui_update = 0.0
            self.last_state_update = 0.0

            self.ui_tasks: List[asyncio.Task] = []
            self.ui_semaphore = asyncio.Semaphore(1)
            self.last_ui_sent_counter: int = 0

            self.live_raw_buffer_5leads: Dict[str, Deque[float]] = {
                "lead_i": deque(maxlen=LIVE_BUFFER_SIZE),
                "lead_ii": deque(maxlen=LIVE_BUFFER_SIZE),
                "lead_iii": deque(maxlen=LIVE_BUFFER_SIZE),
                "avf": deque(maxlen=LIVE_BUFFER_SIZE),
                "v1": deque(maxlen=LIVE_BUFFER_SIZE),
            }

            self.live_raw_buffer_12leads: Dict[str, Deque[float]] = {
                "lead_i": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "lead_ii": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "lead_iii": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "avr": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "avl": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "avf": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "v1": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "v2": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "v3": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "v4": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "v5": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
                "v6": deque(maxlen=LIVE_BUFFER_SIZE_12LEADS),
            }
            logger.debug(
                f"[DeviceState] Successfully completed __init__ for {device_id}."
            )
        except Exception as e:
            logger.error(f"[DeviceState] Unexpected error in __init__: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    @property
    def jitter_buffer_limit(self) -> int:
        if self.current_lead_mode == 12:
            return 40
        return 40

    @property
    def target_buffer_size(self) -> int:
        logger.debug(
            f"[DeviceState] Starting target_buffer_size for {self.device_id}..."
        )
        try:
            if self.current_lead_mode == 12:
                return BUFFER_SIZE_12LEADS

            return BUFFER_SIZE
        except Exception as e:
            logger.error(f"[DeviceState] Unexpected error in target_buffer_size: {e}")
            return 1000

    def reset_recording_state(self):
        logger.debug(
            f"[DeviceState] Starting reset_recording_state for {self.device_id}..."
        )
        try:
            self.is_recording = False
            self.recording_id = None
            self.subject_id = None
            self.recording_source = "WEB"
            self.samples_collected = 0
            self.segment_count = 0
            self.status_message = "Idle"
            logger.debug(
                f"[DeviceState] Successfully completed reset_recording_state for {self.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[DeviceState] Unexpected error in reset_recording_state: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def reset_network_metrics(self):
        logger.debug(
            f"[DeviceState] Starting reset_network_metrics for {self.device_id}..."
        )
        try:
            self.lost_packets = 0
            self.total_packets = 0
            self.last_packet_num = 0
            self.latencies.clear()
            self.packet_buffer.clear()
            self.min_latency_offset = float("inf")
            logger.debug(
                f"[DeviceState] Successfully completed reset_network_metrics for {self.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[DeviceState] Unexpected error in reset_network_metrics: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def clear_buffers(self):
        logger.debug(f"[DeviceState] Starting clear_buffers for {self.device_id}...")
        try:
            for lead in ["lead_i", "lead_ii", "lead_iii", "avf", "v1"]:
                self.live_raw_buffer_5leads[lead].clear()

            for lead in [
                "lead_i",
                "lead_ii",
                "lead_iii",
                "avr",
                "avl",
                "avf",
                "v1",
                "v2",
                "v3",
                "v4",
                "v5",
                "v6",
            ]:
                self.live_raw_buffer_12leads[lead].clear()

            self.packet_buffer.clear()
            logger.debug(
                f"[DeviceState] Successfully completed clear_buffers for {self.device_id}."
            )
        except Exception as e:
            logger.error(f"[DeviceState] Unexpected error in clear_buffers: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def update_connection_status(self, is_connected: bool):
        logger.debug(
            f"[DeviceState] Starting update_connection_status for {self.device_id} to {is_connected}..."
        )
        try:
            self.is_connected = is_connected
            if is_connected:
                self.last_seen = time.time()
            logger.debug(
                f"[DeviceState] Successfully completed update_connection_status for {self.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[DeviceState] Unexpected error in update_connection_status: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def get_time_since_last_seen(self) -> float:
        logger.debug(
            f"[DeviceState] Starting get_time_since_last_seen for {self.device_id}..."
        )
        try:
            result = time.time() - self.last_seen
            logger.debug(
                f"[DeviceState] Successfully completed get_time_since_last_seen for {self.device_id}."
            )
            return result
        except Exception as e:
            logger.error(
                f"[DeviceState] Unexpected error in get_time_since_last_seen: {e}"
            )
            return 999.9

    def cancel_ui_tasks(self):
        logger.debug(f"[DeviceState] Starting cancel_ui_tasks for {self.device_id}...")
        try:
            for task in self.ui_tasks:
                if not task.done():
                    task.cancel()
            self.ui_tasks.clear()
            logger.debug(
                f"[DeviceState] Successfully completed cancel_ui_tasks for {self.device_id}."
            )
        except Exception as e:
            logger.error(f"[DeviceState] Unexpected error in cancel_ui_tasks: {e}")
