import time
import uuid
import asyncio
import numpy as np
from datetime import datetime, timezone
from typing import List

from services.mqtt.protocol.definitions import ECGSample5Leads, ECGSample12Leads
from services.device import device_state_manager, DeviceState
from services.analysis import (
    ml_engine_5leads,
    ml_engine_12leads,
    signal_processor_5leads,
    signal_processor_12leads,
)
from services.recording import recording_storage_service
from repositories.session import SessionRepository
from core.database import SessionLocal
from core.exceptions.definitions import AppException
from utils import logger
from utils import (
    WSMessageType,
    UI_BROADCAST_THROTTLE_5LEADS,
    UI_BROADCAST_THROTTLE_12LEADS,
)


class MQTTDataHandler:

    async def process_5leads_samples(
        self,
        device_id: str,
        samples: List[ECGSample5Leads],
        end_counter: int,
        fmt: str,
        sampling_rate: int,
    ):
        logger.debug(
            f"[MQTTDataHandler] Starting process_5leads_samples for {device_id}..."
        )
        try:
            state = device_state_manager.get_state(device_id)
            state.current_lead_mode = 5

            self._update_hardware_timing(state, samples, end_counter, sampling_rate)

            now = time.time()
            if state.last_seen > 0:
                interval_ms = (now - state.last_seen) * 1000
                state.latencies.append(interval_ms)

            state.is_connected = True
            state.last_seen = now

            for s in samples:
                state.live_raw_buffer_5leads["lead_i"].append(s.cal_lead_i)
                state.live_raw_buffer_5leads["lead_ii"].append(s.cal_lead_ii)
                state.live_raw_buffer_5leads["lead_iii"].append(s.cal_lead_iii)
                state.live_raw_buffer_5leads["avf"].append(s.cal_avf)
                state.live_raw_buffer_5leads["v1"].append(s.cal_v1)

            lead_names_5 = ["lead_i", "lead_ii", "lead_iii", "avf", "v1"]
            raw_signals_5 = {
                name: np.array(state.live_raw_buffer_5leads[name])
                for name in lead_names_5
            }
            samples_count_5 = len(samples)

            async def background_ui_processing_5leads(signals, count, task_counter):
                try:
                    if task_counter < getattr(state, "last_ui_sent_counter", 0):
                        return

                    loop = asyncio.get_running_loop()
                    filtered_results = await loop.run_in_executor(
                        None, self._execute_filters_5leads, signals, state.sampling_rate
                    )

                    filtered_leads = {
                        name: filtered_results[name][-count:] for name in lead_names_5
                    }

                    if task_counter >= getattr(state, "last_ui_sent_counter", 0):
                        state.last_ui_sent_counter = task_counter
                        await self._broadcast_ui_5leads_batch(
                            state, samples, filtered_leads, end_counter
                        )
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.error(
                        f"[MQTTDataHandler] Background UI processing error (5-leads): {e}"
                    )
                finally:
                    if hasattr(asyncio, "current_task"):
                        task = asyncio.current_task()
                        if task in state.ui_tasks:
                            state.ui_tasks.remove(task)

            async def _guarded_ui_task_5():
                async with state.ui_semaphore:
                    await background_ui_processing_5leads(
                        raw_signals_5, samples_count_5, end_counter
                    )

            ui_task = asyncio.create_task(_guarded_ui_task_5())
            state.ui_tasks.append(ui_task)

            if now - state.last_bpm_update >= 1.0:
                state.last_bpm_update = now
                asyncio.create_task(self._calculate_live_bpm(state))
                # asyncio.create_task(self._broadcast_performance(state))

            rec_data = []
            for i, sample in enumerate(samples):
                if state.is_recording and state.recording_id:
                    rec_data.append(
                        {
                            "recording_id": state.recording_id,
                            "created_dt": datetime.now(timezone.utc),
                            "created_by": f"{state.device_id} - 5LEADS",
                            "mv_lead_i": sample.cal_lead_i,
                            "mv_lead_ii": sample.cal_lead_ii,
                            "mv_lead_iii": sample.cal_lead_iii,
                            "mv_avf": sample.cal_avf,
                            "mv_v1": sample.cal_v1,
                            "raw_lead_i": sample.raw_lead_i,
                            "raw_lead_ii": sample.raw_lead_ii,
                            "raw_v1": sample.raw_v1,
                            "source": state.recording_source,
                        }
                    )

                state.last_raw_values = {
                    "lead_i": sample.raw_lead_i,
                    "lead_ii": sample.raw_lead_ii,
                    "v1": sample.raw_v1,
                }
                state.last_cal_values = {
                    "lead_i": sample.cal_lead_i,
                    "lead_ii": sample.cal_lead_ii,
                    "lead_iii": sample.cal_lead_iii,
                    "avf": sample.cal_avf,
                    "v1": sample.cal_v1,
                }

            if rec_data and state.is_recording and state.recording_id:
                try:
                    remaining = max(
                        0, state.target_buffer_size - state.samples_collected
                    )
                    first_chunk = rec_data[:remaining] if remaining > 0 else []
                    if first_chunk:
                        await device_state_manager.append_recording_5(
                            state.recording_id, first_chunk
                        )
                        state.samples_collected += len(first_chunk)

                    leftover = rec_data[remaining:]
                    if leftover:
                        await self._complete_segment(state)
                        if state.is_recording and state.recording_id:
                            for e in leftover:
                                e["recording_id"] = state.recording_id
                            await device_state_manager.append_recording_5(
                                state.recording_id, leftover
                            )
                            state.samples_collected = len(leftover)
                except Exception as e:
                    logger.error(
                        f"[MQTTDataHandler] 5-leads recording processing error: {e}"
                    )

                if state.samples_collected % 25 == 0:
                    asyncio.create_task(
                        device_state_manager.broadcast_to_device(
                            state.device_id,
                            WSMessageType.PROGRESS_UPDATE.value,
                            {
                                "device_id": state.device_id,
                                "current": state.samples_collected,
                                "total": state.target_buffer_size,
                            },
                        )
                    )

            logger.debug(
                f"[MQTTDataHandler] Successfully completed process_5leads_samples for {device_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in process_5leads_samples: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def process_12leads_samples(
        self,
        device_id: str,
        samples: List[ECGSample12Leads],
        end_counter: int,
        fmt: str,
        sampling_rate: int,
    ):
        logger.debug(
            f"[MQTTDataHandler] Starting process_12leads_samples for {device_id}..."
        )
        try:
            state = device_state_manager.get_state(device_id)
            state.current_lead_mode = 12

            self._update_hardware_timing(state, samples, end_counter, sampling_rate)

            now = time.time()
            if state.last_seen > 0:
                interval_ms = (now - state.last_seen) * 1000
                state.latencies.append(interval_ms)

            state.is_connected = True
            state.last_seen = now

            for s in samples:
                state.live_raw_buffer_12leads["lead_i"].append(s.cal_lead_i)
                state.live_raw_buffer_12leads["lead_ii"].append(s.cal_lead_ii)
                state.live_raw_buffer_12leads["lead_iii"].append(s.cal_lead_iii)
                state.live_raw_buffer_12leads["avr"].append(s.cal_avr)
                state.live_raw_buffer_12leads["avl"].append(s.cal_avl)
                state.live_raw_buffer_12leads["avf"].append(s.cal_avf)
                state.live_raw_buffer_12leads["v1"].append(s.cal_v1)
                state.live_raw_buffer_12leads["v2"].append(s.cal_v2)
                state.live_raw_buffer_12leads["v3"].append(s.cal_v3)
                state.live_raw_buffer_12leads["v4"].append(s.cal_v4)
                state.live_raw_buffer_12leads["v5"].append(s.cal_v5)
                state.live_raw_buffer_12leads["v6"].append(s.cal_v6)

            lead_names_12 = [
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
            ]
            raw_signals_12 = {
                name: np.array(state.live_raw_buffer_12leads[name])
                for name in lead_names_12
            }
            samples_count_12 = len(samples)

            async def background_ui_processing_12leads(signals, count, task_counter):
                try:
                    if task_counter < getattr(state, "last_ui_sent_counter", 0):
                        return

                    loop = asyncio.get_running_loop()
                    filtered_results = await loop.run_in_executor(
                        None,
                        self._execute_filters_12leads,
                        signals,
                        state.sampling_rate,
                        True,
                    )

                    filtered_leads = {
                        name: filtered_results[name][-count:] for name in lead_names_12
                    }

                    if task_counter >= getattr(state, "last_ui_sent_counter", 0):
                        state.last_ui_sent_counter = task_counter
                        await self._broadcast_ui_12leads_batch(
                            state, samples, filtered_leads, end_counter
                        )
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.error(
                        f"[MQTTDataHandler] Background UI processing error (12-leads): {e}"
                    )
                finally:
                    if hasattr(asyncio, "current_task"):
                        task = asyncio.current_task()
                        if task in state.ui_tasks:
                            state.ui_tasks.remove(task)

            async def _guarded_ui_task_12():
                async with state.ui_semaphore:
                    await background_ui_processing_12leads(
                        raw_signals_12, samples_count_12, end_counter
                    )

            ui_task = asyncio.create_task(_guarded_ui_task_12())
            state.ui_tasks.append(ui_task)

            if now - state.last_bpm_update >= 2.0:
                state.last_bpm_update = now
                asyncio.create_task(self._calculate_live_bpm(state))
                # asyncio.create_task(self._broadcast_performance(state))

            rec_data = []
            for i, sample in enumerate(samples):
                if state.is_recording and state.recording_id:
                    rec_data.append(
                        {
                            "recording_id": state.recording_id,
                            "created_dt": datetime.now(timezone.utc),
                            "created_by": f"{state.device_id} - 12LEADS",
                            "mv_lead_i": sample.cal_lead_i,
                            "mv_lead_ii": sample.cal_lead_ii,
                            "mv_lead_iii": sample.cal_lead_iii,
                            "mv_avr": sample.cal_avr,
                            "mv_avl": sample.cal_avl,
                            "mv_avf": sample.cal_avf,
                            "mv_v1": sample.cal_v1,
                            "mv_v2": sample.cal_v2,
                            "mv_v3": sample.cal_v3,
                            "mv_v4": sample.cal_v4,
                            "mv_v5": sample.cal_v5,
                            "mv_v6": sample.cal_v6,
                            "raw_lead_i": sample.raw_lead_i,
                            "raw_lead_ii": sample.raw_lead_ii,
                            "raw_lead_iii": sample.raw_lead_iii,
                            "raw_avr": sample.raw_avr,
                            "raw_avl": sample.raw_avl,
                            "raw_avf": sample.raw_avf,
                            "raw_v1": sample.raw_v1,
                            "raw_v2": sample.raw_v2,
                            "raw_v3": sample.raw_v3,
                            "raw_v4": sample.raw_v4,
                            "raw_v5": sample.raw_v5,
                            "raw_v6": sample.raw_v6,
                            "source": state.recording_source,
                        }
                    )

                state.last_raw_values = {
                    "lead_i": sample.raw_lead_i,
                    "lead_ii": sample.raw_lead_ii,
                    "lead_iii": sample.raw_lead_iii,
                    "avr": sample.raw_avr,
                    "avl": sample.raw_avl,
                    "avf": sample.raw_avf,
                    "v1": sample.raw_v1,
                    "v2": sample.raw_v2,
                    "v3": sample.raw_v3,
                    "v4": sample.raw_v4,
                    "v5": sample.raw_v5,
                    "v6": sample.raw_v6,
                }
                state.last_cal_values = {
                    "lead_i": sample.cal_lead_i,
                    "lead_ii": sample.cal_lead_ii,
                    "lead_iii": sample.cal_lead_iii,
                    "avr": sample.cal_avr,
                    "avl": sample.cal_avl,
                    "avf": sample.cal_avf,
                    "v1": sample.cal_v1,
                    "v2": sample.cal_v2,
                    "v3": sample.cal_v3,
                    "v4": sample.cal_v4,
                    "v5": sample.cal_v5,
                    "v6": sample.cal_v6,
                }

            if rec_data and state.is_recording and state.recording_id:
                try:
                    remaining = max(
                        0, state.target_buffer_size - state.samples_collected
                    )
                    first_chunk = rec_data[:remaining] if remaining > 0 else []
                    if first_chunk:
                        await device_state_manager.append_recording_12(
                            state.recording_id, first_chunk
                        )
                        state.samples_collected += len(first_chunk)

                    leftover = rec_data[remaining:]
                    if leftover:
                        await self._complete_segment(state)
                        if state.is_recording and state.recording_id:
                            for e in leftover:
                                e["recording_id"] = state.recording_id
                            await device_state_manager.append_recording_12(
                                state.recording_id, leftover
                            )
                            state.samples_collected = len(leftover)
                except Exception as e:
                    logger.error(
                        f"[MQTTDataHandler] Error recording append (12-leads): {e}"
                    )

                if state.samples_collected % 25 == 0:
                    asyncio.create_task(
                        device_state_manager.broadcast_to_device(
                            state.device_id,
                            WSMessageType.PROGRESS_UPDATE.value,
                            {
                                "device_id": state.device_id,
                                "current": state.samples_collected,
                                "total": state.target_buffer_size,
                            },
                        )
                    )

            logger.debug(
                f"[MQTTDataHandler] Successfully completed process_12leads_samples for {device_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in process_12leads_samples: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def _update_hardware_timing(
        self,
        state: DeviceState,
        samples: List,
        end_counter: int,
        sampling_rate: int,
    ):
        logger.debug(
            f"[MQTTDataHandler] Starting _update_hardware_timing for {state.device_id}..."
        )
        try:
            sample_interval_us = 1_000_000 / sampling_rate
            current_hw_ts = samples[-1].timestamp_us + sample_interval_us

            if state.last_hw_ts_us > 0 and end_counter > state.last_hw_counter:
                delta_ts_s = (current_hw_ts - state.last_hw_ts_us) / 1_000_000.0
                delta_cnt = end_counter - state.last_hw_counter

                if 0.01 < delta_ts_s < 5.0:
                    calculated_sps = delta_cnt / delta_ts_s
                    clamped_sps = max(
                        sampling_rate * 0.5, min(sampling_rate * 2.0, calculated_sps)
                    )

                    if state.observed_sps <= 100.0 or abs(
                        state.observed_sps - clamped_sps
                    ) > (clamped_sps * 0.5):
                        state.observed_sps = float(clamped_sps)
                    else:
                        state.observed_sps = (
                            state.observed_sps * 0.95 + clamped_sps * 0.05
                        )
            else:
                state.observed_sps = float(sampling_rate)

            state.last_hw_ts_us = current_hw_ts
            state.last_hw_counter = end_counter

            if abs(state.observed_sps - sampling_rate) < 30:
                state.sampling_rate = int(sampling_rate)
            else:
                state.sampling_rate = int(state.observed_sps)
            logger.debug(
                f"[MQTTDataHandler] Successfully completed _update_hardware_timing for {state.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _update_hardware_timing: {e}"
            )

    async def _apply_dsp_5leads_filters(
        self, state: DeviceState, samples: List[ECGSample5Leads]
    ) -> dict:
        logger.debug(
            f"[MQTTDataHandler] Starting _apply_dsp_5leads_filters for {state.device_id}..."
        )
        try:
            lead_names = ["lead_i", "lead_ii", "lead_iii", "avf", "v1"]
            raw_signals = {
                name: np.array(state.live_raw_buffer_5leads[name])
                for name in lead_names
            }

            loop = asyncio.get_running_loop()
            filtered_results = await loop.run_in_executor(
                None, self._execute_filters_5leads, raw_signals, state.sampling_rate
            )

            filtered_leads = {}
            for name in lead_names:
                filtered_leads[name] = filtered_results[name][-len(samples) :]

            logger.debug(
                f"[MQTTDataHandler] Successfully completed _apply_dsp_5leads_filters for {state.device_id}."
            )
            return filtered_leads
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _apply_dsp_5leads_filters: {e}"
            )
            return {
                name: np.array([getattr(s, f"cal_{name}") for s in samples])
                for name in ["lead_i", "lead_ii", "lead_iii", "avf", "v1"]
            }

    def _execute_filters_5leads(self, signals: dict, sampling_rate: int) -> dict:
        logger.debug("[MQTTDataHandler] Starting _execute_filters_5leads...")
        try:
            results = {}
            for name, data in signals.items():
                if len(data) > 20:
                    results[name] = signal_processor_5leads.apply_filters(
                        data, sampling_rate
                    )
                else:
                    results[name] = data
            logger.debug(
                "[MQTTDataHandler] Successfully completed _execute_filters_5leads."
            )
            return results
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _execute_filters_5leads: {e}"
            )
            return signals

    async def _apply_dsp_12leads_filters(
        self, state: DeviceState, samples: List[ECGSample12Leads], is_live: bool = False
    ) -> dict:
        logger.debug(
            f"[MQTTDataHandler] Starting _apply_dsp_12leads_filters for {state.device_id}..."
        )
        try:
            lead_names = [
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
            ]
            raw_signals = {
                name: np.array(state.live_raw_buffer_12leads[name])
                for name in lead_names
            }

            loop = asyncio.get_running_loop()
            filtered_results = await loop.run_in_executor(
                None,
                self._execute_filters_12leads,
                raw_signals,
                state.sampling_rate,
                is_live,
            )

            filtered_leads = {}
            for name in lead_names:
                filtered_leads[name] = filtered_results[name][-len(samples) :]

            logger.debug(
                f"[MQTTDataHandler] Successfully completed _apply_dsp_12leads_filters for {state.device_id}."
            )
            return filtered_leads
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _apply_dsp_12leads_filters: {e}"
            )
            return {
                name: np.array([getattr(s, f"cal_{name}") for s in samples])
                for name in [
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
                ]
            }

    def _execute_filters_12leads(
        self, signals: dict, sampling_rate: int, is_live: bool = False
    ) -> dict:
        logger.debug("[MQTTDataHandler] Starting _execute_filters_12leads...")
        try:
            results = {}
            for name, data in signals.items():
                if len(data) > 20:
                    results[name] = signal_processor_12leads.apply_filters(
                        data, sampling_rate, is_live=is_live
                    )
                else:
                    results[name] = data
            logger.debug(
                "[MQTTDataHandler] Successfully completed _execute_filters_12leads."
            )
            return results
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _execute_filters_12leads: {e}"
            )
            return signals

    async def _broadcast_ui_5leads_batch(
        self,
        state: DeviceState,
        samples: List[ECGSample5Leads],
        filtered_leads: dict,
        end_counter: int,
    ):
        logger.debug(
            f"[MQTTDataHandler] Starting _broadcast_ui_5leads_batch for {state.device_id}..."
        )
        try:
            ui_batch = []
            for i in range(len(samples)):
                ui_batch.append(
                    {
                        "i": round(float(filtered_leads["lead_i"][i]), 3),
                        "ii": round(float(filtered_leads["lead_ii"][i]), 3),
                        "iii": round(float(filtered_leads["lead_iii"][i]), 3),
                        "avf": round(float(filtered_leads["avf"][i]), 3),
                        "v1": round(float(filtered_leads["v1"][i]), 3),
                    }
                )

            state.broadcast_count += 1
            if ui_batch and state.broadcast_count % UI_BROADCAST_THROTTLE_5LEADS == 0:
                await device_state_manager.broadcast_to_device(
                    state.device_id,
                    WSMessageType.LIVE_5LEADS_BATCH.value,
                    {
                        "device_id": state.device_id,
                        "samples": ui_batch,
                        "counter": end_counter,
                        "sampling_rate": int(state.sampling_rate),
                    },
                )
            logger.debug(
                f"[MQTTDataHandler] Successfully completed _broadcast_ui_5leads_batch for {state.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _broadcast_ui_5leads_batch: {e}"
            )

    async def _broadcast_ui_12leads_batch(
        self,
        state: DeviceState,
        samples: List[ECGSample12Leads],
        filtered_leads: dict,
        end_counter: int,
    ):
        logger.debug(
            f"[MQTTDataHandler] Starting _broadcast_ui_12leads_batch for {state.device_id}..."
        )
        try:
            ui_batch = []
            for i in range(len(samples)):
                ui_batch.append(
                    {
                        "i": round(float(filtered_leads["lead_i"][i]), 3),
                        "ii": round(float(filtered_leads["lead_ii"][i]), 3),
                        "iii": round(float(filtered_leads["lead_iii"][i]), 3),
                        "avr": round(float(filtered_leads["avr"][i]), 3),
                        "avl": round(float(filtered_leads["avl"][i]), 3),
                        "avf": round(float(filtered_leads["avf"][i]), 3),
                        "v1": round(float(filtered_leads["v1"][i]), 3),
                        "v2": round(float(filtered_leads["v2"][i]), 3),
                        "v3": round(float(filtered_leads["v3"][i]), 3),
                        "v4": round(float(filtered_leads["v4"][i]), 3),
                        "v5": round(float(filtered_leads["v5"][i]), 3),
                        "v6": round(float(filtered_leads["v6"][i]), 3),
                    }
                )

            state.broadcast_count += 1
            if ui_batch and state.broadcast_count % UI_BROADCAST_THROTTLE_12LEADS == 0:
                await device_state_manager.broadcast_to_device(
                    state.device_id,
                    WSMessageType.LIVE_12LEADS_BATCH.value,
                    {
                        "device_id": state.device_id,
                        "samples": ui_batch,
                        "counter": end_counter,
                        "sampling_rate": int(state.sampling_rate),
                    },
                )
            logger.debug(
                f"[MQTTDataHandler] Successfully completed _broadcast_ui_12leads_batch for {state.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _broadcast_ui_12leads_batch: {e}"
            )

    async def _broadcast_performance(self, state: DeviceState):
        logger.debug(
            f"[MQTTDataHandler] Starting _broadcast_performance for {state.device_id}..."
        )
        try:
            if not state.latencies:
                return

            jitter = np.std(list(state.latencies)) if len(state.latencies) > 1 else 0.0

            total_expected_samples = state.total_packets + state.lost_packets
            loss_pct = (
                (state.lost_packets / total_expected_samples * 100)
                if total_expected_samples > 0
                else 0.0
            )

            latency = 40 + (jitter * 0.5)

            await device_state_manager.broadcast_to_device(
                state.device_id,
                WSMessageType.PERFORMANCE_UPDATE.value,
                {
                    "device_id": state.device_id,
                    "latency_ms": round(latency, 1),
                    "jitter_ms": round(jitter, 1),
                    "packet_loss_pct": round(loss_pct, 2),
                },
            )
            logger.debug(
                f"[MQTTDataHandler] Successfully completed _broadcast_performance for {state.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _broadcast_performance: {e}"
            )

    async def _calculate_live_bpm(self, state: DeviceState):
        logger.debug(
            f"[MQTTDataHandler] Starting _calculate_live_bpm for {state.device_id}..."
        )
        try:
            lead_ii_buffer = (
                state.live_raw_buffer_12leads["lead_ii"]
                if state.current_lead_mode == 12
                else state.live_raw_buffer_5leads["lead_ii"]
            )

            if len(lead_ii_buffer) >= (state.sampling_rate * 2):
                buffer = list(lead_ii_buffer)

                proc = (
                    signal_processor_12leads
                    if state.current_lead_mode == 12
                    else signal_processor_5leads
                )

                loop = asyncio.get_running_loop()
                bpm = await loop.run_in_executor(
                    None,
                    proc.calculate_bpm_fast,
                    np.array(buffer),
                    state.sampling_rate,
                )

                if bpm and bpm > 0:
                    state.bpm_history.append(bpm)
                    smoothed_bpm = int(
                        round(sum(state.bpm_history) / len(state.bpm_history))
                    )

                    await device_state_manager.broadcast_to_device(
                        state.device_id,
                        WSMessageType.CALCULATE_LIVE_BPM.value,
                        {"device_id": state.device_id, "data": {"bpm": smoothed_bpm}},
                    )
            logger.debug(
                f"[MQTTDataHandler] Successfully completed _calculate_live_bpm for {state.device_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _calculate_live_bpm: {e}"
            )

    async def _complete_segment(self, state: DeviceState):
        logger.debug(
            f"[MQTTDataHandler] Starting _complete_segment for {state.device_id}..."
        )
        try:
            old_id = state.recording_id
            subject_id = state.subject_id
            device_id = state.device_id
            device_type = "12LEADS" if state.current_lead_mode == 12 else "5LEADS"

            new_id = str(uuid.uuid4())
            state.recording_id = new_id
            state.samples_collected = 0
            state.segment_count += 1
            state.status_message = f"Recording (Seg {state.segment_count})..."

            async def background_segment_completion():
                try:
                    logger.info(
                        f"[MQTTDataHandler] Background flush and analysis for {old_id}"
                    )
                    await recording_storage_service.flush_all_buffers()
                    try:
                        device_state_manager.cleanup_recording_buffers(str(old_id))
                    except Exception:
                        pass

                    analysis_engine = (
                        ml_engine_12leads
                        if device_type == "12LEADS"
                        else ml_engine_5leads
                    )

                    asyncio.create_task(
                        analysis_engine.trigger_analysis(
                            str(old_id), str(subject_id), str(device_id)
                        )
                    )
                except Exception as e:
                    logger.error(
                        f"[MQTTDataHandler] Background segment cleanup failed: {e}"
                    )

            asyncio.create_task(background_segment_completion())

            self._create_session(
                new_id,
                str(state.device_id),
                str(state.subject_id),
                str(state.recording_source),
                device_type=device_type,
            )

            await device_state_manager.notify_state_update(state.device_id)

            logger.info(
                f"[MQTTDataHandler] Rollover complete. New segment {state.segment_count} for {state.device_id}: {new_id}"
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Unexpected error in _complete_segment rollover: {e}"
            )

    def _create_session(
        self, rec_id: str, dev_id: str, pat_id: str, source: str, device_type: str
    ):
        logger.debug(f"[MQTTDataHandler] Starting _create_session for {rec_id}...")

        if not pat_id or pat_id == "None":
            logger.warning(
                f"[MQTTDataHandler] Skipping session creation for {rec_id}: Invalid patient ID '{pat_id}'"
            )
            return

        db = SessionLocal()
        try:
            SessionRepository(db).create_session(
                rec_id, dev_id, pat_id, created_by=source, device_type=device_type
            )
            logger.debug(
                f"[MQTTDataHandler] Successfully completed _create_session for {rec_id}."
            )
        except Exception as e:
            logger.error(
                f"[MQTTDataHandler] Failed to create session segment in _create_session: {e}"
            )
        finally:
            db.close()


mqtt_data_handler = MQTTDataHandler()
