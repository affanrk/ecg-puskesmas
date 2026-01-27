"""
MQTT data handler service.
Processes incoming MQTT samples, manages device state, and orchestrates data storage and ML analysis.
"""
import time
import uuid
import asyncio
import numpy as np
from datetime import datetime, timezone
from typing import List

from services.mqtt import ECGSample
from services.device import device_state_manager, DeviceState
from services.analysis import ml_engine_service, signal_processor
from services.recording import recording_storage_service
from repositories.session import SessionRepository
from core.database import SessionLocal
from utils import logger
from utils import BUFFER_SIZE, WSMessageType

class MQTTDataHandler:
    """
    Handles the processing of incoming ECG samples from MQTT.
    Coordinates device state updates, data storage, and triggers ML analysis.
    """
    async def process_samples(self, device_id: str, samples: List[ECGSample], end_counter: int, fmt: str, sampling_rate: int):
        state = device_state_manager.get_state(device_id)
        state.sampling_rate = sampling_rate
        
        # Performance Tracking: Jitter (Inter-arrival time variance)
        now = time.time()
        if state.last_seen:
            interval_ms = (now - state.last_seen) * 1000
            state.latencies.append(interval_ms)
            
        # Performance Tracking: Packet Loss
        # Assuming end_counter is the sample sequence number
        if state.last_packet_num > 0:
            expected_start = state.last_packet_num + 1
            actual_start = end_counter - len(samples) + 1
            gap = actual_start - expected_start
            if gap > 0:
                state.lost_packets += gap
                
        state.is_connected = True
        state.last_seen = now
        
        # Broadcast Performance Stats every 10 packets (~1s if 100Hz/10batch)
        if state.total_packets % 10 == 0:
            await self._broadcast_performance(state)
        
        # Update live buffers with new CALIBRATED samples
        for s in samples:
            state.live_raw_buffer['lead_I'].append(s.cal_lead_i)
            state.live_raw_buffer['lead_II'].append(s.cal_lead_ii)
            state.live_raw_buffer['v1'].append(s.cal_v1)

        # Apply Live Filters to buffers
        # We process the whole buffer (context) but only send the new tail
        filtered_leads = {}
        for lead_name in ['lead_I', 'lead_II', 'v1']:
            raw_data = np.array(state.live_raw_buffer[lead_name])
            if len(raw_data) > 20: # Minimum size for filter stability
                filtered_full = signal_processor.apply_filters(raw_data)
                # Take only the new samples (tail)
                filtered_leads[lead_name] = filtered_full[-len(samples):]
            else:
                # Not enough data yet, pass raw
                filtered_leads[lead_name] = raw_data[-len(samples):]

        # Calculate BPM if needed (Lead II)
        await self._calculate_live_bpm(state)

        # Collect samples for UI broadcast
        ui_batch = []
        
        for i, sample in enumerate(samples):
            await self._process_single_sample(state, sample, end_counter - (len(samples) - 1 - i))
            
            # Use FILTERED values for UI
            ui_batch.append({
                "i": round(filtered_leads['lead_I'][i], 3),
                "ii": round(filtered_leads['lead_II'][i], 3),
                "v1": round(filtered_leads['v1'][i], 3)
            })
            
        # Broadcast batch to WebSocket subscribers
        if ui_batch:
            await device_state_manager.broadcast_to_device(
                device_id, 
                "live_batch", 
                {
                    "device_id": device_id,
                    "samples": ui_batch
                }
            )

    async def _broadcast_performance(self, state: DeviceState):
        """Calculate and broadcast network performance metrics"""
        if not state.latencies:
            return

        # Jitter = Standard Deviation of inter-arrival times
        jitter = np.std(list(state.latencies)) if len(state.latencies) > 1 else 0.0
        
        # Packet Loss %
        # Estimate total expected samples based on packets + loss gaps
        # Assuming avg 10 samples/packet for estimation
        total_expected_samples = (state.total_packets) + state.lost_packets 
        loss_pct = (state.lost_packets / total_expected_samples * 100) if total_expected_samples > 0 else 0.0
        
        # Latency: Simulated "Server Processing Time" + Network buffer estimate
        # Since we don't have synchronized clocks, we estimate typical latency based on jitter
        latency = 40 + (jitter * 0.5) 

        await device_state_manager.broadcast_to_device(
            state.device_id,
            WSMessageType.PERFORMANCE_UPDATE.value,
            {
                "device_id": state.device_id,
                "latency_ms": round(latency, 1),
                "jitter_ms": round(jitter, 1),
                "packet_loss_pct": round(loss_pct, 2)
            }
        )

    async def _calculate_live_bpm(self, state: DeviceState):
        """Calculate and broadcast BPM more frequently"""
        # Calculate every 100 samples (~1s @ 100Hz) for stable reading
        # Check buffer size to ensure enough data for valid calculation (e.g. > 2 seconds)
        if state.total_packets % 100 == 0 and len(state.live_raw_buffer['lead_II']) >= (state.sampling_rate * 2):
            buffer = list(state.live_raw_buffer['lead_II'])

            loop = asyncio.get_running_loop()
            bpm = await loop.run_in_executor(
                None,
                signal_processor.calculate_bpm_fast,
                np.array(buffer),
                state.sampling_rate
            )
            
            if bpm and bpm > 0:
                await device_state_manager.broadcast_to_device(
                    state.device_id,
                    WSMessageType.LIVE_METRICS.value,
                    {
                        "device_id": state.device_id,
                        "data": {"bpm": bpm}
                    }
                )

    async def _process_single_sample(self, state: DeviceState, sample: ECGSample, counter: int):
        await self._store_recording_data(state, sample)
        state.last_packet_num = counter
        state.total_packets += 1

    async def _store_recording_data(self, state: DeviceState, sample: ECGSample):
        if not state.is_recording or not state.recording_id:
            return
        state.samples_collected += 1
        async with device_state_manager.batch_lock:
            device_state_manager.buffer_recording_batch.append({
                "recording_id": state.recording_id,
                "created_dt": datetime.now(timezone.utc),
                "created_by": state.device_id,
                "mv_lead_I": sample.cal_lead_i, "mv_lead_II": sample.cal_lead_ii, "mv_v1": sample.cal_v1,
                "raw_lead_I": sample.raw_lead_i, "raw_lead_II": sample.raw_lead_ii, "raw_v1": sample.raw_v1
            })
        
        # Broadcast progress
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

        if state.samples_collected >= BUFFER_SIZE:
            await self._complete_segment(state)

    async def _complete_segment(self, state: DeviceState):
        # Flush pending data to DB so analysis engine can read it
        await recording_storage_service.flush_all_buffers()
        
        old_id = state.recording_id
        asyncio.create_task(ml_engine_service.trigger_analysis(old_id, state.subject_id, state.device_id))
        new_id = str(uuid.uuid4())
        self._create_session(new_id, state.device_id, state.subject_id)
        state.recording_id = new_id
        state.samples_collected = 0
        state.segment_count += 1
        state.status_message = f"Recording (Seg {state.segment_count})..."
        await device_state_manager.notify_state_update(state.device_id)

    def _create_session(self, rec_id: str, dev_id: str, pat_id: str):
        db = SessionLocal()
        try:
            try:
                user_id = int(pat_id)
                SessionRepository(db).create_session(rec_id, dev_id, user_id)
            except ValueError:
                logger.error(f"[MQTT] Invalid user_id format in state: {pat_id}")
        except Exception as e:
            logger.error(f"[MQTT] Failed to create session segment: {e}")
        finally:
            db.close()

mqtt_data_handler = MQTTDataHandler()
