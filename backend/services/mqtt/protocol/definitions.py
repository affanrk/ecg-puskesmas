import heapq
import time
from typing import List, Tuple, Union
from dataclasses import dataclass
from utils import logger, SAMPLING_RATE, SAMPLING_RATE_12LEADS, MAX_PACKET_SAMPLES
from core.exceptions.definitions import AppException


@dataclass
class ECGSample5Leads:
    timestamp_us: int
    raw_lead_i: int
    raw_lead_ii: int
    raw_v1: int
    cal_lead_i: float
    cal_lead_ii: float
    cal_v1: float
    cal_lead_iii: float
    cal_avf: float


@dataclass
class ECGSample12Leads:
    timestamp_us: int
    raw_lead_i: int
    raw_lead_ii: int
    raw_lead_iii: int
    raw_avr: int
    raw_avl: int
    raw_avf: int
    raw_v1: int
    raw_v2: int
    raw_v3: int
    raw_v4: int
    raw_v5: int
    raw_v6: int

    cal_lead_i: float
    cal_lead_ii: float
    cal_lead_iii: float
    cal_avr: float
    cal_avl: float
    cal_avf: float
    cal_v1: float
    cal_v2: float
    cal_v3: float
    cal_v4: float
    cal_v5: float
    cal_v6: float


class MQTTProtocolHandler:
    def __init__(self):
        pass

    def parse_packet(
        self, payload: dict, is_12_leads: bool
    ) -> Tuple[
        str, Union[List[ECGSample5Leads], List[ECGSample12Leads]], int, str, int
    ]:
        logger.debug("[MQTTProtocolHandler] Starting parse_packet...")
        try:
            device_id = payload.get("id")

            if not device_id:
                raise ValueError("Missing device ID in packet")

            is_batch = "c1" in payload and isinstance(payload["c1"], list)

            samples: Union[List[ECGSample5Leads], List[ECGSample12Leads]]

            if is_batch:
                if is_12_leads:
                    samples, end_counter, packet_format, sampling_rate = (
                        self._parse_batch_packet_12leads(payload)
                    )
                else:
                    samples, end_counter, packet_format, sampling_rate = (
                        self._parse_batch_packet(payload)
                    )
            else:
                if is_12_leads:
                    samples, end_counter, packet_format, sampling_rate = (
                        self._parse_single_packet_12leads(payload)
                    )
                else:
                    samples, end_counter, packet_format, sampling_rate = (
                        self._parse_single_packet(payload)
                    )

            logger.debug("[MQTTProtocolHandler] Successfully completed parse_packet.")
            return device_id, samples, end_counter, packet_format, sampling_rate
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MQTTProtocolHandler] Unexpected error in parse_packet: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def _parse_batch_packet_12leads(
        self, payload: dict
    ) -> Tuple[List[ECGSample12Leads], int, str, int]:
        logger.debug("[MQTTProtocolHandler] Starting _parse_batch_packet_12leads...")
        try:
            list_c1 = payload.get("c1", [])
            batch_size = len(list_c1)

            if batch_size > MAX_PACKET_SAMPLES:
                start_idx = batch_size - MAX_PACKET_SAMPLES
                list_c1 = list_c1[start_idx:]
                batch_size = len(list_c1)

            list_c2 = payload.get("c2", [0.0] * batch_size)
            list_c3 = payload.get("c3", [0.0] * batch_size)
            list_c4 = payload.get("c4", [0.0] * batch_size)
            list_c5 = payload.get("c5", [0.0] * batch_size)
            list_c6 = payload.get("c6", [0.0] * batch_size)
            list_c7 = payload.get("c7", [0.0] * batch_size)
            list_c8 = payload.get("c8", [0.0] * batch_size)
            list_c9 = payload.get("c9", [0.0] * batch_size)
            list_c10 = payload.get("c10", [0.0] * batch_size)
            list_c11 = payload.get("c11", [0.0] * batch_size)
            list_c12 = payload.get("c12", [0.0] * batch_size)

            list_r1 = payload.get("r1", [0] * batch_size)
            list_r2 = payload.get("r2", [0] * batch_size)
            list_r3 = payload.get("r3", [0] * batch_size)
            list_r4 = payload.get("r4", [0] * batch_size)
            list_r5 = payload.get("r5", [0] * batch_size)
            list_r6 = payload.get("r6", [0] * batch_size)
            list_r7 = payload.get("r7", [0] * batch_size)
            list_r8 = payload.get("r8", [0] * batch_size)
            list_r9 = payload.get("r9", [0] * batch_size)
            list_r10 = payload.get("r10", [0] * batch_size)
            list_r11 = payload.get("r11", [0] * batch_size)
            list_r12 = payload.get("r12", [0] * batch_size)

            if len(list_c2) > batch_size:
                list_c2 = list_c2[-batch_size:]
            if len(list_c3) > batch_size:
                list_c3 = list_c3[-batch_size:]
            if len(list_c4) > batch_size:
                list_c4 = list_c4[-batch_size:]
            if len(list_c5) > batch_size:
                list_c5 = list_c5[-batch_size:]
            if len(list_c6) > batch_size:
                list_c6 = list_c6[-batch_size:]
            if len(list_c7) > batch_size:
                list_c7 = list_c7[-batch_size:]
            if len(list_c8) > batch_size:
                list_c8 = list_c8[-batch_size:]
            if len(list_c9) > batch_size:
                list_c9 = list_c9[-batch_size:]
            if len(list_c10) > batch_size:
                list_c10 = list_c10[-batch_size:]
            if len(list_c11) > batch_size:
                list_c11 = list_c11[-batch_size:]
            if len(list_c12) > batch_size:
                list_c12 = list_c12[-batch_size:]
            if len(list_r1) > batch_size:
                list_r1 = list_r1[-batch_size:]
            if len(list_r2) > batch_size:
                list_r2 = list_r2[-batch_size:]
            if len(list_r3) > batch_size:
                list_r3 = list_r3[-batch_size:]
            if len(list_r4) > batch_size:
                list_r4 = list_r4[-batch_size:]
            if len(list_r5) > batch_size:
                list_r5 = list_r5[-batch_size:]
            if len(list_r6) > batch_size:
                list_r6 = list_r6[-batch_size:]
            if len(list_r7) > batch_size:
                list_r7 = list_r7[-batch_size:]
            if len(list_r8) > batch_size:
                list_r8 = list_r8[-batch_size:]
            if len(list_r9) > batch_size:
                list_r9 = list_r9[-batch_size:]
            if len(list_r10) > batch_size:
                list_r10 = list_r10[-batch_size:]
            if len(list_r11) > batch_size:
                list_r11 = list_r11[-batch_size:]
            if len(list_r12) > batch_size:
                list_r12 = list_r12[-batch_size:]
            end_ts_us = payload.get("ts_us") or int(time.time() * 1_000_000)
            end_counter = payload.get("cnt") or payload.get("counter", 0)

            current_sps = (
                payload.get("sps") or payload.get("rate") or SAMPLING_RATE_12LEADS
            )
            interval_us = int((1 / current_sps) * 1_000_000)

            samples = []
            for i in range(batch_size):
                idx_reverse = batch_size - 1 - i
                sample_ts_us = end_ts_us - (idx_reverse * interval_us)

                sample = ECGSample12Leads(
                    timestamp_us=sample_ts_us,
                    raw_lead_i=list_r1[i],
                    raw_lead_ii=list_r2[i],
                    raw_lead_iii=list_r3[i],
                    raw_avr=list_r4[i],
                    raw_avl=list_r5[i],
                    raw_avf=list_r6[i],
                    raw_v1=list_r7[i],
                    raw_v2=list_r8[i],
                    raw_v3=list_r9[i],
                    raw_v4=list_r10[i],
                    raw_v5=list_r11[i],
                    raw_v6=list_r12[i],
                    cal_lead_i=list_c1[i],
                    cal_lead_ii=list_c2[i],
                    cal_lead_iii=list_c3[i],
                    cal_avr=list_c4[i],
                    cal_avl=list_c5[i],
                    cal_avf=list_c6[i],
                    cal_v1=list_c7[i],
                    cal_v2=list_c8[i],
                    cal_v3=list_c9[i],
                    cal_v4=list_c10[i],
                    cal_v5=list_c11[i],
                    cal_v6=list_c12[i],
                )
                samples.append(sample)

            logger.debug(
                "[MQTTProtocolHandler] Successfully completed _parse_batch_packet_12leads."
            )
            return samples, end_counter, "JSON Batch 12 Leads", current_sps
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in _parse_batch_packet_12leads: {e}"
            )
            return [], 0, "Error", SAMPLING_RATE_12LEADS

    def _parse_single_packet_12leads(
        self, payload: dict
    ) -> Tuple[List[ECGSample12Leads], int, str, int]:
        logger.debug("[MQTTProtocolHandler] Starting _parse_single_packet_12leads...")
        try:
            ts_us = (
                payload.get("ts_us")
                or payload.get("timestamp")
                or int(time.time() * 1_000_000)
            )

            sample = ECGSample12Leads(
                timestamp_us=ts_us,
                raw_lead_i=payload.get("raw_c1", payload.get("r1", 0)),
                raw_lead_ii=payload.get("raw_c2", payload.get("r2", 0)),
                raw_lead_iii=payload.get("raw_c3", payload.get("r3", 0)),
                raw_avr=payload.get("raw_c4", payload.get("r4", 0)),
                raw_avl=payload.get("raw_c5", payload.get("r5", 0)),
                raw_avf=payload.get("raw_c6", payload.get("r6", 0)),
                raw_v1=payload.get("raw_c7", payload.get("r7", 0)),
                raw_v2=payload.get("raw_c8", payload.get("r8", 0)),
                raw_v3=payload.get("raw_c9", payload.get("r9", 0)),
                raw_v4=payload.get("raw_c10", payload.get("r10", 0)),
                raw_v5=payload.get("raw_c11", payload.get("r11", 0)),
                raw_v6=payload.get("raw_c12", payload.get("r12", 0)),
                cal_lead_i=payload.get("cal_mv_c1", payload.get("c1", 0.0)),
                cal_lead_ii=payload.get("cal_mv_c2", payload.get("c2", 0.0)),
                cal_lead_iii=payload.get("cal_mv_c3", payload.get("c3", 0.0)),
                cal_avr=payload.get("cal_mv_c4", payload.get("c4", 0.0)),
                cal_avl=payload.get("cal_mv_c5", payload.get("c5", 0.0)),
                cal_avf=payload.get("cal_mv_c6", payload.get("c6", 0.0)),
                cal_v1=payload.get("cal_mv_c7", payload.get("c7", 0.0)),
                cal_v2=payload.get("cal_mv_c8", payload.get("c8", 0.0)),
                cal_v3=payload.get("cal_mv_c9", payload.get("c9", 0.0)),
                cal_v4=payload.get("cal_mv_c10", payload.get("c10", 0.0)),
                cal_v5=payload.get("cal_mv_c11", payload.get("c11", 0.0)),
                cal_v6=payload.get("cal_mv_c12", payload.get("c12", 0.0)),
            )

            counter = payload.get("cnt", payload.get("counter", 0))
            current_sps = (
                payload.get("sps") or payload.get("rate") or SAMPLING_RATE_12LEADS
            )

            logger.debug(
                "[MQTTProtocolHandler] Successfully completed _parse_single_packet_12leads."
            )
            return [sample], counter, "JSON Single 12 Leads", current_sps
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in _parse_single_packet_12leads: {e}"
            )
            return [], 0, "Error", SAMPLING_RATE_12LEADS

    def _parse_batch_packet(
        self, payload: dict
    ) -> Tuple[List[ECGSample5Leads], int, str, int]:
        logger.debug("[MQTTProtocolHandler] Starting _parse_batch_packet...")
        try:
            list_c1 = payload["c1"]
            list_c2 = payload["c2"]
            list_c3 = payload["c3"]
            list_c4 = payload.get("c4", [0.0] * len(list_c1))
            list_c5 = payload.get("c5", [0.0] * len(list_c1))

            list_r1 = payload.get("r1", [0] * len(list_c1))
            list_r2 = payload.get("r2", [0] * len(list_c1))
            list_r3 = payload.get("r3", [0] * len(list_c1))

            end_ts_us = payload.get("ts_us") or int(time.time() * 1_000_000)
            end_counter = payload.get("cnt") or payload.get("counter", 0)

            batch_size = len(list_c1)
            if batch_size > MAX_PACKET_SAMPLES:
                start_idx = batch_size - MAX_PACKET_SAMPLES
                list_c1 = list_c1[start_idx:]
                list_c2 = list_c2[start_idx:]
                list_c3 = list_c3[start_idx:]
                list_c4 = list_c4[start_idx:]
                list_c5 = list_c5[start_idx:]
                list_r1 = list_r1[start_idx:]
                list_r2 = list_r2[start_idx:]
                list_r3 = list_r3[start_idx:]
                batch_size = len(list_c1)
            current_sps = payload.get("sps") or payload.get("rate") or SAMPLING_RATE
            interval_us = int((1 / current_sps) * 1_000_000)

            samples = self._build_samples_array(
                batch_size,
                end_ts_us,
                interval_us,
                list_r1,
                list_r2,
                list_r3,
                list_c1,
                list_c2,
                list_c3,
                list_c4,
                list_c5,
            )

            logger.debug(
                "[MQTTProtocolHandler] Successfully completed _parse_batch_packet."
            )
            return samples, end_counter, "JSON Batch", current_sps
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in _parse_batch_packet: {e}"
            )
            return [], 0, "Error", SAMPLING_RATE

    def _build_samples_array(
        self, batch_size, end_ts_us, interval_us, r1, r2, r3, c1, c2, c3, c4, c5
    ) -> List[ECGSample5Leads]:
        logger.debug("[MQTTProtocolHandler] Starting _build_samples_array...")
        try:
            samples = []
            for i in range(batch_size):
                idx_reverse = batch_size - 1 - i
                sample_ts_us = end_ts_us - (idx_reverse * interval_us)

                sample = ECGSample5Leads(
                    timestamp_us=sample_ts_us,
                    raw_lead_i=r1[i],
                    raw_lead_ii=r2[i],
                    raw_v1=r3[i],
                    cal_lead_i=c1[i],
                    cal_lead_ii=c2[i],
                    cal_v1=c3[i],
                    cal_lead_iii=c4[i],
                    cal_avf=c5[i],
                )
                samples.append(sample)
            logger.debug(
                "[MQTTProtocolHandler] Successfully completed _build_samples_array."
            )
            return samples
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in _build_samples_array: {e}"
            )
            return []

    def _parse_single_packet(
        self, payload: dict
    ) -> Tuple[List[ECGSample5Leads], int, str, int]:
        logger.debug("[MQTTProtocolHandler] Starting _parse_single_packet...")
        try:
            ts_us = (
                payload.get("ts_us")
                or payload.get("timestamp")
                or int(time.time() * 1_000_000)
            )

            sample = ECGSample5Leads(
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

            counter = payload.get("cnt", payload.get("counter", 0))
            current_sps = payload.get("sps") or payload.get("rate") or SAMPLING_RATE

            logger.debug(
                "[MQTTProtocolHandler] Successfully completed _parse_single_packet."
            )
            return [sample], counter, "JSON Single", current_sps
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in _parse_single_packet: {e}"
            )
            return [], 0, "Error", SAMPLING_RATE

    def should_buffer_packet(
        self,
        packet_counter: int,
        last_processed: int,
        buffer_size: int,
        buffer_limit: int = 5,
    ) -> bool:
        logger.debug("[MQTTProtocolHandler] Starting should_buffer_packet...")
        try:
            if last_processed == 0:
                logger.debug(
                    "[MQTTProtocolHandler] Successfully completed should_buffer_packet (False)."
                )
                return False

            is_next_in_sequence = packet_counter == last_processed + 1
            if is_next_in_sequence:
                logger.debug(
                    "[MQTTProtocolHandler] Successfully completed should_buffer_packet (False)."
                )
                return False

            if buffer_size >= buffer_limit:
                logger.debug(
                    "[MQTTProtocolHandler] Successfully completed should_buffer_packet (False)."
                )
                return False

            logger.debug(
                "[MQTTProtocolHandler] Successfully completed should_buffer_packet (True)."
            )
            return True
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in should_buffer_packet: {e}"
            )
            return False

    def add_to_jitter_buffer(
        self, buffer: List[Tuple], start_counter: int, end_counter: int, payload: dict
    ):
        logger.debug("[MQTTProtocolHandler] Starting add_to_jitter_buffer...")
        try:
            heapq.heappush(buffer, (start_counter, end_counter, id(payload), payload))
            logger.debug(
                "[MQTTProtocolHandler] Successfully completed add_to_jitter_buffer."
            )
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in add_to_jitter_buffer: {e}"
            )

    def get_next_from_buffer(
        self, buffer: List[Tuple], last_processed: int
    ) -> Tuple[int, int, dict] | None:
        logger.debug("[MQTTProtocolHandler] Starting get_next_from_buffer...")
        try:
            if not buffer:
                logger.debug(
                    "[MQTTProtocolHandler] Successfully completed get_next_from_buffer (None)."
                )
                return None

            start_counter, end_counter, _, payload = buffer[0]

            if last_processed == 0 or start_counter == last_processed + 1:
                start_c, end_c, _, payload_data = heapq.heappop(buffer)
                logger.debug(
                    "[MQTTProtocolHandler] Successfully completed get_next_from_buffer."
                )
                return start_c, end_c, payload_data

            logger.debug(
                "[MQTTProtocolHandler] Successfully completed get_next_from_buffer (None)."
            )
            return None
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in get_next_from_buffer: {e}"
            )
            return None

    def is_duplicate_packet(self, packet_counter: int, last_processed: int) -> bool:
        logger.debug("[MQTTProtocolHandler] Starting is_duplicate_packet...")
        try:
            result = packet_counter <= last_processed and last_processed != 0
            logger.debug(
                f"[MQTTProtocolHandler] Successfully completed is_duplicate_packet ({result})."
            )
            return result
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in is_duplicate_packet: {e}"
            )
            return False

    def should_reset_buffer(
        self, packet_counter: int, last_processed: int, gap_threshold: int = 5000
    ) -> bool:
        logger.debug("[MQTTProtocolHandler] Starting should_reset_buffer...")
        try:
            if packet_counter < last_processed:
                logger.debug(
                    "[MQTTProtocolHandler] Successfully completed should_reset_buffer (True)."
                )
                return True

            gap = packet_counter - last_processed
            if gap > gap_threshold:
                logger.debug(
                    "[MQTTProtocolHandler] Successfully completed should_reset_buffer (True)."
                )
                return True

            logger.debug(
                "[MQTTProtocolHandler] Successfully completed should_reset_buffer (False)."
            )
            return False
        except Exception as e:
            logger.error(
                f"[MQTTProtocolHandler] Unexpected error in should_reset_buffer: {e}"
            )
            return False


mqtt_protocol = MQTTProtocolHandler()
