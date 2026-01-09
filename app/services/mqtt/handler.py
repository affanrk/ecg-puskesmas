"""
MQTT data handler - extracted from mqtt_service.py
Processes ECG samples and manages device state during data collection.
This is where the business logic happens.
"""
import time
import uuid
import asyncio
import numpy as np
from datetime import datetime, timezone
from typing import List

from app.services.mqtt.protocol import ECGSample, mqtt_protocol
from app.services.device.state import device_state_manager, DeviceState
from app.services.analysis.signal_processor import signal_processor
from app.services.analysis.ml_engine import ml_engine_service
from app.repositories.patient import PatientRepository
from app.repositories.session import SessionRepository
from app.core.database import SessionLocal
from app.utils.constants import (
    SAMPLING_RATE,
    BUFFER_SIZE,
    MAX_GAP_FILL_SAMPLES,
    UI_BROADCAST_THROTTLE,
    BPM_CALCULATION_INTERVAL,
    PERFORMANCE_LOG_INTERVAL,
    WSMessageType
)
from app.utils.logger import logger


class MQTTDataHandler:
    """
    Handles ECG data processing from MQTT messages.
    Manages live monitoring, recording, and performance metrics.
    """
    
    async def process_samples(
        self,
        device_id: str,
        samples: List[ECGSample],
        end_counter: int,
        packet_format: str
    ):
        """
        Process list of ECG samples from device.
        
        Args:
            device_id: Device identifier
            samples: List of ECG samples
            end_counter: Ending packet counter
            packet_format: Format string (for logging)
        """
        state = device_state_manager.get_state(device_id)
        state.last_seen = time.time()
        state.is_connected = True
        state.packet_format = packet_format
        
        # Handle jitter buffer
        await self._handle_jitter_buffer(state, samples, end_counter)
        
    # ========================================================================
    # JITTER BUFFER MANAGEMENT
    # ========================================================================
    
    async def _handle_jitter_buffer(
        self,
        state: DeviceState,
        samples: List[ECGSample],
        end_counter: int
    ):
        """
        Manage jitter buffer to handle out-of-order packets.
        """
        # Calculate start counter
        batch_size = len(samples)
        start_counter = end_counter - batch_size + 1
        
        # Check for buffer reset conditions
        if mqtt_protocol.should_reset_buffer(
            end_counter,
            state.last_packet_num,
            gap_threshold=5000
        ):
            logger.warning(
                f"[{state.device_id}] Resetting jitter buffer "
                f"(counter: {end_counter}, last: {state.last_packet_num})"
            )
            state.last_packet_num = 0
            state.packet_buffer.clear()
            
        # Add to buffer
        mqtt_protocol.add_to_jitter_buffer(
            state.packet_buffer,
            start_counter,
            end_counter,
            {"samples": samples, "end_counter": end_counter}
        )
        
        # Process buffer
        await self._process_jitter_buffer(state)
        
    async def _process_jitter_buffer(self, state: DeviceState):
        """
        Process all ready packets from jitter buffer.
        """
        while state.packet_buffer:
            # Peek at head
            head_start, head_end, pkt_data = state.packet_buffer[0]
            
            # Check if this packet is next in sequence
            is_next = (
                state.last_packet_num == 0 or 
                head_start == state.last_packet_num + 1
            )
            
            # Force process if buffer too full
            buffer_full = len(state.packet_buffer) > 5
            
            should_process = is_next or buffer_full
            
            if not should_process:
                break
                
            # Remove from buffer
            mqtt_protocol.get_next_from_buffer(
                state.packet_buffer,
                state.last_packet_num
            )
            
            # Skip duplicates
            if mqtt_protocol.is_duplicate_packet(head_end, state.last_packet_num):
                continue
                
            # Process samples
            samples = pkt_data["samples"]
            await self._process_sample_batch(state, samples, head_end)
            
    # ========================================================================
    # SAMPLE PROCESSING
    # ========================================================================
    
    async def _process_sample_batch(
        self,
        state: DeviceState,
        samples: List[ECGSample],
        end_counter: int
    ):
        """Process a batch of samples"""
        for i, sample in enumerate(samples):
            sample_counter = end_counter - (len(samples) - 1 - i)
            await self._process_single_sample(state, sample, sample_counter)
            
    async def _process_single_sample(
        self,
        state: DeviceState,
        sample: ECGSample,
        packet_counter: int
    ):
        """
        Process a single ECG sample.
        Updates buffers, calculates metrics, and stores data.
        """
        # 1. Update live DSP buffer
        state.live_raw_buffer['lead_I'].append(sample.cal_lead_i)
        state.live_raw_buffer['lead_II'].append(sample.cal_lead_ii)
        state.live_raw_buffer['v1'].append(sample.cal_v1)
        
        # 2. UI Broadcast (throttled)
        await self._broadcast_live_data(state, sample)
        
        # 3. Live BPM calculation
        await self._calculate_live_bpm(state)
        
        # 4. Performance metrics
        await self._update_performance_metrics(state, sample, packet_counter)
        
        # 5. Gap filling (if needed)
        await self._handle_packet_loss(state, packet_counter, sample)
        
        # 6. Recording data storage
        await self._store_recording_data(state, sample, packet_counter)
        
        # Update state
        state.last_packet_num = packet_counter
        state.total_packets += 1
        state.last_raw_values = {
            'lead_I': sample.raw_lead_i,
            'lead_II': sample.raw_lead_ii,
            'v1': sample.raw_v1
        }
        state.last_cal_values = {
            'lead_I': sample.cal_lead_i,
            'lead_II': sample.cal_lead_ii,
            'v1': sample.cal_v1
        }
        
    # ========================================================================
    # LIVE MONITORING
    # ========================================================================
    
    async def _broadcast_live_data(
        self,
        state: DeviceState,
        sample: ECGSample
    ):
        """Broadcast live data to UI (throttled)"""
        ui_buf = device_state_manager.ui_data_buffer[state.device_id]
        ui_buf["count"] += 1
        
        if ui_buf["count"] >= UI_BROADCAST_THROTTLE:
            # Prepare data for filtering (copy buffers)
            # We only filter if we have enough data, otherwise return raw/cal values
            if len(state.live_raw_buffer['lead_I']) > 50:
                raw_i = list(state.live_raw_buffer['lead_I'])
                raw_ii = list(state.live_raw_buffer['lead_II'])
                raw_v1 = list(state.live_raw_buffer['v1'])
                
                # Run filtering in thread pool
                loop = asyncio.get_running_loop()
                live_i, live_ii, live_v1 = await loop.run_in_executor(
                    None,
                    self._filter_worker,
                    raw_i,
                    raw_ii,
                    raw_v1,
                    sample.cal_lead_i,
                    sample.cal_lead_ii,
                    sample.cal_v1
                )
            else:
                live_i, live_ii, live_v1 = sample.cal_lead_i, sample.cal_lead_ii, sample.cal_v1
            
            await device_state_manager.broadcast_to_device(
                state.device_id,
                WSMessageType.LIVE_DATA.value,
                {
                    "device_id": state.device_id,
                    "raw_lead_I": sample.raw_lead_i,
                    "raw_lead_II": sample.raw_lead_ii,
                    "raw_v1": sample.raw_v1,
                    "cal_lead_I": live_i,
                    "cal_lead_II": live_ii,
                    "cal_v1": live_v1
                }
            )
            ui_buf["count"] = 0
            
    @staticmethod
    def _filter_worker(
        buf_i: list, 
        buf_ii: list, 
        buf_v1: list,
        def_i: float,
        def_ii: float,
        def_v1: float
    ) -> tuple:
        """Worker function for signal filtering"""
        try:
            filt_i = signal_processor.apply_filters(np.array(buf_i))
            filt_ii = signal_processor.apply_filters(np.array(buf_ii))
            filt_v1 = signal_processor.apply_filters(np.array(buf_v1))
            return filt_i[-1], filt_ii[-1], filt_v1[-1]
        except Exception:
            return def_i, def_ii, def_v1
        
    async def _calculate_live_bpm(self, state: DeviceState):
        """Calculate and broadcast BPM (periodic)"""
        if state.total_packets % BPM_CALCULATION_INTERVAL == 0:
            buffer = list(state.live_raw_buffer['lead_II'])
            
            # Run BPM calculation in thread pool
            loop = asyncio.get_running_loop()
            bpm = await loop.run_in_executor(
                None,
                self._bpm_worker,
                buffer,
                SAMPLING_RATE
            )
            
            if bpm:
                await device_state_manager.broadcast_to_device(
                    state.device_id,
                    WSMessageType.LIVE_METRICS.value,
                    {
                        "device_id": state.device_id,
                        "data": {"bpm": bpm}
                    }
                )

    @staticmethod
    def _bpm_worker(buffer: list, rate: int) -> float:
        """Worker function for BPM calculation"""
        return signal_processor.calculate_bpm_fast(
            np.array(buffer),
            rate
        )
                
    # ========================================================================
    # PERFORMANCE MONITORING
    # ========================================================================
    
    async def _update_performance_metrics(
        self,
        state: DeviceState,
        sample: ECGSample,
        packet_counter: int
    ):
        """Calculate and log performance metrics"""
        # Calculate latency
        server_time_us = int(time.time() * 1_000_000)
        raw_diff = (server_time_us - sample.timestamp_us) / 1000.0
        
        if raw_diff < state.min_latency_offset:
            state.min_latency_offset = raw_diff
            
        latency_ms = max(0, (raw_diff - state.min_latency_offset) + 20)
        state.latencies.append(latency_ms)
        
        # Log to DB periodically (only during recording)
        if state.total_packets % PERFORMANCE_LOG_INTERVAL == 0:
            await self._log_performance(state, packet_counter, latency_ms)
            
    async def _log_performance(
        self,
        state: DeviceState,
        packet_counter: int,
        latency_ms: float
    ):
        """Log performance metrics and broadcast to UI"""
        # Calculate stats
        avg_lat = float(np.mean(state.latencies)) if state.latencies else 0.0
        jitter = float(np.std(state.latencies)) if len(state.latencies) > 1 else 0.0
        loss_pct = (
            (state.lost_packets / state.total_packets * 100) 
            if state.total_packets > 0 else 0.0
        )
        
        # Broadcast to UI
        await device_state_manager.broadcast_to_device(
            state.device_id,
            WSMessageType.PERFORMANCE_UPDATE.value,
            {
                "device_id": state.device_id,
                "packet_format": state.packet_format,
                "latency_ms": int(avg_lat),
                "jitter_ms": round(jitter, 2),
                "packet_loss_pct": round(loss_pct, 2)
            }
        )
        
        # Save to DB only during recording
        if state.is_recording and state.recording_id:
            async with device_state_manager.batch_lock:
                device_state_manager.perf_batch.append({
                    "device_id": state.device_id,
                    "recording_id": state.recording_id,
                    "packet_counter": packet_counter,
                    "latency_ms": avg_lat,
                    "jitter_ms": jitter,
                    "packet_loss_pct": loss_pct,
                    "created_by": state.device_id,
                    "created_dt": datetime.now(timezone.utc)
                })
                
    # ========================================================================
    # GAP FILLING
    # ========================================================================
    
    async def _handle_packet_loss(
        self,
        state: DeviceState,
        packet_counter: int,
        sample: ECGSample
    ):
        """Fill gaps from packet loss"""
        if state.last_packet_num > 0 and \
           packet_counter > state.last_packet_num + 1:
            gap = packet_counter - (state.last_packet_num + 1)
            state.lost_packets += gap
            
            # Fill gaps only during recording
            if state.is_recording and gap > 0:
                fill_amount = min(gap, MAX_GAP_FILL_SAMPLES)
                await self._fill_gap(state, fill_amount)
                
    async def _fill_gap(self, state: DeviceState, count: int):
        """Fill missing samples with last known values"""
        async with device_state_manager.batch_lock:
            ts_now = datetime.now(timezone.utc)
            for _ in range(count):
                state.samples_collected += 1
                device_state_manager.buffer_recording_batch.append({
                    "recording_id": state.recording_id,
                    "created_dt": ts_now,
                    "created_by": state.device_id,
                    "mv_lead_I": state.last_cal_values['lead_I'],
                    "mv_lead_II": state.last_cal_values['lead_II'],
                    "mv_v1": state.last_cal_values['v1'],
                    "raw_lead_I": state.last_raw_values['lead_I'],
                    "raw_lead_II": state.last_raw_values['lead_II'],
                    "raw_v1": state.last_raw_values['v1']
                })
                
    # ========================================================================
    # RECORDING STORAGE
    # ========================================================================
    
    async def _store_recording_data(
        self,
        state: DeviceState,
        sample: ECGSample,
        packet_counter: int
    ):
        """Store sample data if recording active"""
        if not state.is_recording or not state.recording_id:
            return
            
        state.samples_collected += 1
        
        # Add to batch buffer
        async with device_state_manager.batch_lock:
            device_state_manager.buffer_recording_batch.append({
                "recording_id": state.recording_id,
                "created_dt": datetime.now(timezone.utc),
                "created_by": state.device_id,
                "mv_lead_I": sample.cal_lead_i,
                "mv_lead_II": sample.cal_lead_ii,
                "mv_v1": sample.cal_v1,
                "raw_lead_I": sample.raw_lead_i,
                "raw_lead_II": sample.raw_lead_ii,
                "raw_v1": sample.raw_v1
            })
            
        # Progress update
        if state.samples_collected % 25 == 0:
            await device_state_manager.broadcast_to_device(
                state.device_id,
                WSMessageType.PROGRESS_UPDATE.value,
                {
                    "device_id": state.device_id,
                    "current": state.samples_collected,
                    "total": BUFFER_SIZE
                }
            )
            
        # Segment completion
        if state.samples_collected >= BUFFER_SIZE:
            await self._complete_segment(state)
            
    async def _complete_segment(self, state: DeviceState):
        """Handle completion of recording segment"""
        old_id = state.recording_id
        subj_id = state.subject_id
        
        # Trigger analysis
        asyncio.create_task(
            ml_engine_service.trigger_analysis(
                old_id,
                subj_id,
                state.device_id
            )
        )
        
        # Create new segment
        new_id = str(uuid.uuid4())
        await self._create_session(new_id, state.device_id, subj_id)
        
        # Update state
        state.recording_id = new_id
        state.samples_collected = 0
        state.segment_count += 1
        state.status_message = f"Recording (Seg {state.segment_count})..."
        
        await device_state_manager.notify_state_update(state.device_id)
        
    async def _create_session(
        self,
        recording_id: str,
        device_id: str,
        patient_id: str
    ):
        """Create new recording session in database"""
        db = SessionLocal()
        try:
            # Ensure patient exists
            patient_repo = PatientRepository(db)
            patient_repo.get_or_create(patient_id, name="Auto Patient")
            
            # Create session
            session_repo = SessionRepository(db)
            session_repo.create_session(
                recording_id=recording_id,
                device_id=device_id,
                patient_id=patient_id,
                created_by="AUTO_SEGMENT"
            )
        except Exception as e:
            logger.error(f"[MQTT Handler] Failed to create session: {e}")
        finally:
            db.close()


# Global singleton instance
mqtt_data_handler = MQTTDataHandler()