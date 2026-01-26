"""
MQTT protocol handler - extracted from mqtt_service.py
Handles message parsing and packet unpacking.
Separates protocol logic from business logic.
"""
import heapq
import time
from typing import List, Tuple
from dataclasses import dataclass

from utils.constants import SAMPLING_RATE # Import SAMPLING_RATE

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


class MQTTProtocolHandler:
    """
    Handles MQTT message protocol parsing and jitter buffering.
    Supports both single-sample and batch packet formats.
    """
    
    # ========================================================================
    # PACKET PARSING
    # ========================================================================
    
    def parse_packet(self, payload: dict) -> Tuple[str, List[ECGSample], int]:
        """
        Parse MQTT packet payload into ECG samples.
        
        Args:
            payload: JSON payload from MQTT message
            
        Returns:
            Tuple of (device_id, samples_list, end_counter)
        """
        device_id = payload.get('id')
        
        if not device_id:
            raise ValueError("Missing device ID in packet")
            
        # Detect packet format
        is_batch = 'r1' in payload and isinstance(payload['r1'], list)
        
        if is_batch:
            samples, end_counter, packet_format = self._parse_batch_packet(payload)
        else:
            samples, end_counter, packet_format = self._parse_single_packet(payload)
            
        return device_id, samples, end_counter, packet_format
        
    def _parse_batch_packet(
        self,
        payload: dict
    ) -> Tuple[List[ECGSample], int, str]:
        """
        Parse batch format packet.
        """
        list_r1 = payload['r1']
        list_r2 = payload['r2']
        list_r3 = payload['r3']
        list_c1 = payload['c1']
        list_c2 = payload['c2']
        list_c3 = payload['c3']
        
        # Fallback to server time if device time is missing
        end_ts_us = payload.get('ts_us') or int(time.time() * 1_000_000)
        end_counter = payload.get('cnt', 0)
        
        batch_size = len(list_r1)
        
        # Sampling interval: in microseconds, derived from SAMPLING_RATE
        interval_us = int((1 / SAMPLING_RATE) * 1_000_000)
        
        # Reconstruct samples with interpolated timestamps
        samples = []
        for i in range(batch_size):
            # Calculate timestamp for this sample
            # Work backwards from end timestamp
            idx_reverse = batch_size - 1 - i
            sample_ts_us = end_ts_us - (idx_reverse * interval_us)
            
            sample = ECGSample(
                timestamp_us=sample_ts_us,
                raw_lead_i=list_r1[i],
                raw_lead_ii=list_r2[i],
                raw_v1=list_r3[i],
                cal_lead_i=list_c1[i],
                cal_lead_ii=list_c2[i],
                cal_v1=list_c3[i]
            )
            samples.append(sample)
            
        return samples, end_counter, "JSON Batch"
        
    def _parse_single_packet(
        self,
        payload: dict
    ) -> Tuple[List[ECGSample], int, str]:
        """
        Parse single sample format packet.
        Supports multiple naming conventions for maximum compatibility.
        """
        # Fallback to server time if device time is missing
        ts_us = payload.get('ts_us') or payload.get('timestamp') or int(time.time() * 1_000_000)
        
        sample = ECGSample(
            timestamp_us=ts_us,
            # Support raw_c1 or r1
            raw_lead_i=payload.get('raw_c1', payload.get('r1', 0)),
            raw_lead_ii=payload.get('raw_c2', payload.get('r2', 0)),
            raw_v1=payload.get('raw_c3', payload.get('r3', 0)),
            # Support cal_mv_c1 or c1
            cal_lead_i=payload.get('cal_mv_c1', payload.get('c1', 0.0)),
            cal_lead_ii=payload.get('cal_mv_c2', payload.get('c2', 0.0)),
            cal_v1=payload.get('cal_mv_c3', payload.get('c3', 0.0))
        )
        
        counter = payload.get('counter', payload.get('cnt', 0))
        
        return [sample], counter, "JSON Single"
        
        
    # ========================================================================
    # JITTER BUFFER MANAGEMENT
    # ========================================================================
    
    def should_buffer_packet(
        self,
        packet_counter: int,
        last_processed: int,
        buffer_size: int,
        buffer_limit: int = 5
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
        # First packet
        if last_processed == 0:
            return False
            
        # Packet is in sequence
        is_next_in_sequence = (packet_counter == last_processed + 1)
        if is_next_in_sequence:
            return False
            
        # Buffer is full, must process
        if buffer_size >= buffer_limit:
            return False
            
        # Packet is out of order and buffer not full
        return True
        
    def add_to_jitter_buffer(
        self,
        buffer: List[Tuple],
        start_counter: int,
        end_counter: int,
        payload: dict
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
        self,
        buffer: List[Tuple],
        last_processed: int
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
            
        # Peek at head
        start_counter, end_counter, payload = buffer[0]
        
        # Check if this is the next expected packet
        if last_processed == 0 or start_counter == last_processed + 1:
            # Remove and return
            return heapq.heappop(buffer)
            
        return None
        
    def is_duplicate_packet(
        self,
        packet_counter: int,
        last_processed: int
    ) -> bool:
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
        self,
        packet_counter: int,
        last_processed: int,
        gap_threshold: int = 5000
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
        # Counter went backwards (device restart)
        if packet_counter < last_processed:
            return True
            
        # Gap too large
        gap = packet_counter - last_processed
        if gap > gap_threshold:
            return True
            
        return False


# Global singleton instance
mqtt_protocol = MQTTProtocolHandler()