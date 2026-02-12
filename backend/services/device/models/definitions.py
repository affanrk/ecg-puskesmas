import time
from collections import deque
from typing import List, Optional
from fastapi import WebSocket
from utils import SAMPLING_RATE
from utils import LIVE_BUFFER_SIZE


class DeviceState:

    def __init__(self, device_id: str):
        self.device_id = device_id

        self.is_recording = False
        self.subject_id: Optional[str] = None
        self.recording_id: Optional[str] = None
        self.recording_source: str = "WEB"
        self.samples_collected = 0
        self.segment_count = 0
        self.status_message = "Idle"

        self.last_raw_values = {"lead_I": 0, "lead_II": 0, "v1": 0}
        self.last_cal_values = {
            "lead_I": 0.0,
            "lead_II": 0.0,
            "lead_III": 0.0,
            "avF": 0.0,
            "v1": 0.0,
        }

        self.last_packet_num = 0
        self.packet_buffer: List[tuple] = []
        self.lost_packets = 0
        self.total_packets = 0
        self.sampling_rate = SAMPLING_RATE
        self.observed_sps = SAMPLING_RATE
        self.last_hw_ts_us = 0
        self.last_hw_counter = 0
        self.latencies = deque(maxlen=100)
        self.bpm_history = deque(maxlen=5)
        self.min_latency_offset = float("inf")
        self.packet_format = "Unknown"

        self.last_seen = time.time()
        self.is_connected = True
        self.locked_by: Optional[WebSocket] = None

        self.live_raw_buffer = {
            "lead_I": deque(maxlen=LIVE_BUFFER_SIZE),
            "lead_II": deque(maxlen=LIVE_BUFFER_SIZE),
            "lead_III": deque(maxlen=LIVE_BUFFER_SIZE),
            "avF": deque(maxlen=LIVE_BUFFER_SIZE),
            "v1": deque(maxlen=LIVE_BUFFER_SIZE),
        }

    @property
    def target_buffer_size(self) -> int:

        from utils import BUFFER_SIZE

        return BUFFER_SIZE

    def reset_recording_state(self):

        self.is_recording = False
        self.subject_id = None
        self.recording_id = None
        self.recording_source = "WEB"
        self.samples_collected = 0
        self.segment_count = 0
        self.status_message = "Idle"

    def reset_network_metrics(self):

        self.lost_packets = 0
        self.total_packets = 0
        self.last_packet_num = 0
        self.latencies.clear()
        self.packet_buffer.clear()
        self.min_latency_offset = float("inf")

    def clear_buffers(self):

        for lead in ["lead_I", "lead_II", "v1"]:
            self.live_raw_buffer[lead].clear()
        self.packet_buffer.clear()

    def update_connection_status(self, is_connected: bool):

        self.is_connected = is_connected
        if is_connected:
            self.last_seen = time.time()

    def get_time_since_last_seen(self) -> float:

        return time.time() - self.last_seen
