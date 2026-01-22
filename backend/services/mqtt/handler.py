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

from services.mqtt.protocol import ECGSample
from services.device.state import device_state_manager, DeviceState
from services.analysis.ml_engine import ml_engine_service
from services.analysis.signal_processor import signal_processor
from services.recording.storage import recording_storage_service
from repositories.session import SessionRepository
from core.database import SessionLocal
from utils.constants import BUFFER_SIZE, MAX_GAP_FILL_SAMPLES, WSMessageType, SAMPLING_RATE
from utils.logger import logger

class MQTTDataHandler:
    """
    Handles the processing of incoming ECG samples from MQTT.
    Coordinates device state updates, data storage, and triggers ML analysis.
    """
    async def process_samples(self, device_id: str, samples: List[ECGSample], end_counter: int, fmt: str):
        state = device_state_manager.get_state(device_id)
        state.is_connected = True
        state.last_seen = time.time()
        
        # Update live buffer for BPM calculation
        for s in samples:
            state.live_raw_buffer['lead_II'].append(s.cal_lead_ii)

        # Calculate BPM if needed
        await self._calculate_live_bpm(state)

        # Collect samples for UI broadcast
        ui_batch = []
        
        for i, sample in enumerate(samples):
            await self._process_single_sample(state, sample, end_counter - (len(samples) - 1 - i))
            
            # Minimize payload for high-frequency broadcast
            ui_batch.append({
                "i": round(sample.cal_lead_i, 3),
                "ii": round(sample.cal_lead_ii, 3),
                "v1": round(sample.cal_v1, 3)
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

    async def _calculate_live_bpm(self, state: DeviceState):
        """Calculate and broadcast BPM more frequently"""
        # Calculate every 100 packets (~1s) for stable reading (Medical Standard UI update rate)
        # Check buffer size to ensure enough data for valid calculation (e.g. > 2-3 seconds)
        if state.total_packets % 100 == 0 and len(state.live_raw_buffer['lead_II']) > 200:
            buffer = list(state.live_raw_buffer['lead_II'])

            loop = asyncio.get_running_loop()
            bpm = await loop.run_in_executor(
                None,
                signal_processor.calculate_bpm_fast,
                np.array(buffer)
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
        if not state.is_recording or not state.recording_id: return
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

        if state.samples_collected >= BUFFER_SIZE: await self._complete_segment(state)

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
        finally: db.close()

mqtt_data_handler = MQTTDataHandler()
