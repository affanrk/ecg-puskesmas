"""
MQTT protocol handler - extracted from mqtt_service.py
Handles message parsing and packet unpacking.
Separates protocol logic from business logic.
"""

import heapq
import time
from typing import List, Tuple
from dataclasses import dataclass

from utils import SAMPLING_RATE


@dataclass
class ECGSample:
    """Represents a single ECG sample from device"""

    timestamp_us: int
    raw_lead_i: int
    raw_lead_ii: int
    raw_v1: int
    cal_lead_i: float
    cal_lead_ii: float
    cal_v1: float
    cal_lead_iii: float
    cal_avf: float


class MQTTProtocolHandler:
    """
    Handles MQTT message protocol parsing and jitter buffering.
    Supports both single-sample and batch packet formats.
    """

    def parse_packet(self, payload: dict) -> Tuple[str, List[ECGSample], int, str, int]:
        """
        Parse MQTT packet payload into ECG samples.

        Args:
            payload: JSON payload from MQTT message

        Returns:
            Tuple of (device_id, samples_list, end_counter, packet_format, sampling_rate)
        """
        device_id = payload.get("id")

        if not device_id:
            raise ValueError("Missing device ID in packet")

        is_batch = "c1" in payload and isinstance(payload["c1"], list)

        if is_batch:
            samples, end_counter, packet_format, sampling_rate = (
                self._parse_batch_packet(payload)
            )
        else:
            samples, end_counter, packet_format, sampling_rate = (
                self._parse_single_packet(payload)
            )

        return device_id, samples, end_counter, packet_format, sampling_rate

    def _parse_batch_packet(
        self, payload: dict
    ) -> Tuple[List[ECGSample], int, str, int]:
        """
        Parse batch format packet.
        """

        list_c1 = payload["c1"]
        list_c2 = payload["c2"]
        list_c3 = payload["c3"]
        list_c4 = payload.get("c4", [0.0] * len(list_c1))
        list_c5 = payload.get("c5", [0.0] * len(list_c1))

        # Raw data lists might not be present in all batch formats
        list_r1 = payload.get("r1", [0] * len(list_c1))
        list_r2 = payload.get("r2", [0] * len(list_c1))
        list_r3 = payload.get("r3", [0] * len(list_c1))

        end_ts_us = payload.get("ts_us") or int(time.time() * 1_000_000)
        end_counter = payload.get("cnt") or payload.get("counter", 0)

        batch_size = len(list_c1)

        current_sps = payload.get("sps") or payload.get("rate") or SAMPLING_RATE
        interval_us = int((1 / current_sps) * 1_000_000)

        samples = []
        for i in range(batch_size):

            idx_reverse = batch_size - 1 - i
            sample_ts_us = end_ts_us - (idx_reverse * interval_us)

            sample = ECGSample(
                timestamp_us=sample_ts_us,
                raw_lead_i=list_r1[i],
                raw_lead_ii=list_r2[i],
                raw_v1=list_r3[i],
                cal_lead_i=list_c1[i],
                cal_lead_ii=list_c2[i],
                cal_v1=list_c3[i],
                cal_lead_iii=list_c4[i],
                cal_avf=list_c5[i],
            )
            samples.append(sample)

        return samples, end_counter, "JSON Batch", current_sps

    def _parse_single_packet(
        self, payload: dict
    ) -> Tuple[List[ECGSample], int, str, int]:
        """
        Parse single sample format packet.
        Supports multiple naming conventions for maximum compatibility.
        """

        ts_us = (
            payload.get("ts_us")
            or payload.get("timestamp")
            or int(time.time() * 1_000_000)
        )

        sample = ECGSample(
            timestamp_us=ts_us,
            raw_lead_i=payload.get("raw_c1", payload.get("r1", 0)),
            raw_lead_ii=payload.get("raw_c2", payload.get("r2", 0)),
            raw_v1=payload.get("raw_c3", payload.get("r3", 0)),
            cal_lead_i=payload.get("cal_mv_c1", payload.get("c1", 0.0)),
            cal_lead_ii=payload.get("cal_mv_c2", payload.get("c2", 0.0)),
            cal_v1=payload.get("cal_mv_c3", payload.get("c3", 0.0)),
            cal_lead_iii=payload.get("cal_mv_c4", payload.get("c4", 0.0)),
            cal_avf=payload.get("cal_mv_c5", payload.get("c5", 0.0)),
        )

        counter = payload.get("counter", payload.get("cnt", 0))
        current_sps = payload.get("sps") or payload.get("rate") or SAMPLING_RATE

        return [sample], counter, "JSON Single", current_sps

    def should_buffer_packet(
        self,
        packet_counter: int,
        last_processed: int,
        buffer_size: int,
        buffer_limit: int = 5,
    ) -> bool:
        """
        Determine if packet should be buffered or processed immediately.

        Args:
            packet_counter: Counter of incoming packet
            last_processed: Last processed packet counter
            buffer_size: Current buffer size
            buffer_limit: Maximum buffer size before forcing process

        Returns:
            True if should buffer, False if should process immediately
        """

        if last_processed == 0:
            return False

        is_next_in_sequence = packet_counter == last_processed + 1
        if is_next_in_sequence:
            return False

        if buffer_size >= buffer_limit:
            return False

        return True

    def add_to_jitter_buffer(
        self, buffer: List[Tuple], start_counter: int, end_counter: int, payload: dict
    ):
        """
        Add packet to jitter buffer (heap).
        Maintains sorted order by start counter.

        Args:
            buffer: Heap list (will be modified)
            start_counter: Starting packet counter
            end_counter: Ending packet counter
            payload: Packet payload
        """
        heapq.heappush(buffer, (start_counter, end_counter, payload))

    def get_next_from_buffer(
        self, buffer: List[Tuple], last_processed: int
    ) -> Tuple[int, int, dict] | None:
        """
        Get next processable packet from buffer.
        Only returns packet if it's the expected next one.

        Args:
            buffer: Heap list
            last_processed: Last processed packet counter

        Returns:
            Tuple of (start, end, payload) or None if not ready
        """
        if not buffer:
            return None

        start_counter, end_counter, payload = buffer[0]

        if last_processed == 0 or start_counter == last_processed + 1:

            return heapq.heappop(buffer)

        return None

    def is_duplicate_packet(self, packet_counter: int, last_processed: int) -> bool:
        """
        Check if packet is a duplicate.

        Args:
            packet_counter: Incoming packet counter
            last_processed: Last processed counter

        Returns:
            True if duplicate
        """
        return packet_counter <= last_processed and last_processed != 0

    def should_reset_buffer(
        self, packet_counter: int, last_processed: int, gap_threshold: int = 5000
    ) -> bool:
        """
        Determine if buffer should be reset due to large gap.
        Indicates device restart or major network issue.

        Args:
            packet_counter: Incoming packet counter
            last_processed: Last processed counter
            gap_threshold: Maximum acceptable gap

        Returns:
            True if should reset
        """

        if packet_counter < last_processed:
            return True

        gap = packet_counter - last_processed
        if gap > gap_threshold:
            return True

        return False


mqtt_protocol = MQTTProtocolHandler()
