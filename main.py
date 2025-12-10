"""
ECG Live Platform - FastAPI + Async Architecture
Optimized for high-frequency data streaming
"""
import os
import asyncio
import struct
import time
import uuid
import traceback
import math
import sys
import uvicorn
from datetime import datetime, timezone
from collections import deque, defaultdict
from typing import Dict, Set
from dotenv import load_dotenv

# ==================================================================
# Windows Asyncio Fix - MUST BE AT THE TOP
# ==================================================================
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import aiomqtt
import numpy as np
import pandas as pd
import scipy.signal
import joblib
import neurokit2 as nk
import tensorflow as tf

from database import SessionLocal, init_db
from models import ECGRaw3Lead, ECGClassification3Lead, ECGPerformanceMetrics3Lead
from sqlalchemy import desc, text

# ==================================================================
# Configuration
# ==================================================================
load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "test.mosquitto.org")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")
MQTT_USE_TLS = os.getenv("MQTT_USE_TLS", "False").lower() == "true"

MODEL_PATH = os.getenv("MODEL_PATH")
FLASK_PORT = int(os.getenv("FLASK_PORT"))

SPS = 100
BUFFER_SIZE = 1000
DEVICE_TIMEOUT_S = 15

LEAD_KEYS_COLUMN = ["lead_I", "lead_II", "v1"]

# ==================================================================
# Application State
# ==================================================================
app = FastAPI(title="ECG Live Platform")

class DeviceState:
    def __init__(self):
        self.is_recording = False
        self.subject_id = None
        self.recording_id = None
        self.samples_collected = 0
        self.status_message = "Idle"
        self.last_packet_num = 0
        self.lost_packets = 0
        self.total_packets = 0
        self.latencies = deque(maxlen=100)
        self.packet_format = "Unknown"
        self.last_seen = time.time()
        self.is_connected = True

device_states: Dict[str, DeviceState] = {}
websocket_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
broadcast_connections: Set[WebSocket] = set()
ws_device_map: Dict[WebSocket, str] = {}

# Batch buffers
raw_data_batch = []
perf_data_batch = []
batch_lock = asyncio.Lock()

# UI update batching
ui_data_buffer = defaultdict(lambda: {"count": 0, "last_packet": None, "last_emit": 0})

# ==================================================================
# Load ML Model
# ==================================================================
scaler = None
loaded_model = None
try:
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    if not MODEL_PATH or not os.path.exists(MODEL_PATH):
        MODEL_PATH = os.path.join(SCRIPT_DIR, 'models')
    
    MODEL_FILE = os.path.join(MODEL_PATH, 'modelann_nonorm2.h5')
    SCALER_FILE = os.path.join(MODEL_PATH, 'scaler2.pkl')
    
    scaler = joblib.load(SCALER_FILE)
    loaded_model = tf.keras.models.load_model(MODEL_FILE)
    print("[SUCCESS] Model and scaler loaded")
except Exception as e:
    print(f"[ERROR] Failed to load model: {e}")

# ==================================================================
# DSP Functions (same as before)
# ==================================================================
VREF, GAIN, RESOLUTION = 2.42, 200, 24
LSB_SIZE = VREF / (2**RESOLUTION - 1)

def apply_dsp_filters(ecgmv, Fs):
    detr_ecg = scipy.signal.detrend(ecgmv, axis=-1, type='linear', bp=0, overwrite_data=False)
    y = [e for e in detr_ecg]
    
    b, a = scipy.signal.butter(4, 0.6, 'low')
    tempf_butter = scipy.signal.filtfilt(b, a, y)
    
    Fsf = max(Fs, 2 * 4.0)
    nyq_rate = Fsf / 2
    width = 5.0 / nyq_rate
    ripple_db = 60.0
    O, beta = scipy.signal.kaiserord(ripple_db, width)
    if O % 2 == 0: O += 1
    
    taps = scipy.signal.firwin(O, 4.0/nyq_rate, window=('kaiser', beta), pass_zero=False)
    y_filt = scipy.signal.lfilter(taps, 1.0, tempf_butter)
    
    return y_filt

# ==================================================================
# MQTT Handler (Async)
# ==================================================================
async def mqtt_listener():
    """Async MQTT listener - much more efficient than paho with threading"""
    print(f"[MQTT] Connecting to {MQTT_BROKER}:{MQTT_PORT}")
    
    while True:
        try:
            client_config = {
                "hostname": MQTT_BROKER,
                "port": MQTT_PORT,
                "username": MQTT_USERNAME,
                "password": MQTT_PASSWORD,
            }
            
            if MQTT_USE_TLS:
                import ssl
                client_config["tls_context"] = ssl.create_default_context()
                client_config["tls_context"].check_hostname = False
                client_config["tls_context"].verify_mode = ssl.CERT_NONE
            
            async with aiomqtt.Client(**client_config) as client:
                await client.subscribe("raw/ecg/+", qos=0)
                print("[MQTT] Connected and subscribed")
                
                async for message in client.messages:
                    await process_mqtt_message(message)
                    
        except aiomqtt.MqttError as e:
            print(f"[MQTT] Connection error: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"[MQTT] Unexpected error: {e}")
            await asyncio.sleep(5)

async def process_mqtt_message(message):
    """Process incoming MQTT message - MODIFIED FOR JSON FORMAT"""
    try:
        # Ignore retained messages
        if hasattr(message, 'retain') and message.retain:
            return
        
        topic_parts = message.topic.value.split('/')
        if len(topic_parts) != 3 or topic_parts[0] != 'raw' or topic_parts[1] != 'ecg':
            return
        
        # Parse JSON payload
        try:
            import json
            payload_str = message.payload.decode('utf-8')
            payload_json = json.loads(payload_str)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            print(f"[MQTT] Failed to parse JSON payload: {e}")
            return
        
        # Validate required fields
        required_fields = ['id', 'ts_us', 'counter', 'raw_c1', 'raw_c2', 'raw_c3', 
                          'cal_mv_c1', 'cal_mv_c2', 'cal_mv_c3']
        if not all(field in payload_json for field in required_fields):
            print(f"[MQTT] Missing required fields in JSON payload")
            return
        
        device_id = payload_json['id']
        timestamp_us = payload_json['ts_us']
        packet_counter = payload_json['counter']
        
        # Raw ADC values (for display and database)
        raw_adc_values = {
            'lead_I': payload_json['raw_c1'],
            'lead_II': payload_json['raw_c2'],
            'v1': payload_json['raw_c3']
        }
        
        # Calibrated millivolt values (for live waveform display)
        cal_mv_values = {
            'lead_I': payload_json['cal_mv_c1'],
            'lead_II': payload_json['cal_mv_c2'],
            'v1': payload_json['cal_mv_c3']
        }
        
        # Initialize device if new
        if device_id not in device_states:
            device_states[device_id] = DeviceState()
            print(f"[MQTT] New device: {device_id}")
            await broadcast_device_list()
        
        state = device_states[device_id]
        state.last_seen = time.time()
        state.is_connected = True
        state.packet_format = 'JSON (calibrated)'
        
        # Prepare packet for UI with both raw and calibrated values
        normalized_pkt = {
            'device_id': device_id,
            # Raw ADC for display in "Live Values (ADC)" section
            'raw_lead_I': raw_adc_values['lead_I'],
            'raw_lead_II': raw_adc_values['lead_II'],
            'raw_v1': raw_adc_values['v1'],
            # Calibrated mV for live waveform
            'cal_lead_I': cal_mv_values['lead_I'],
            'cal_lead_II': cal_mv_values['lead_II'],
            'cal_v1': cal_mv_values['v1']
        }
        
        # Batched UI updates (every 5 packets or 50ms)
        ui_buffer = ui_data_buffer[device_id]
        ui_buffer["count"] += 1
        ui_buffer["last_packet"] = normalized_pkt
        current_time = time.time()
        
        if ui_buffer["count"] >= 5 or (current_time - ui_buffer["last_emit"]) >= 0.05:
            await broadcast_to_device(device_id, "live_data", normalized_pkt)
            ui_buffer["count"] = 0
            ui_buffer["last_emit"] = current_time
        
        # Performance metrics (every 10 packets)
        # Get current time in microseconds
        server_time_us = int(time.time() * 1_000_000)
        
        # Calculate latency
        latency_ms = (server_time_us - timestamp_us) / 1000.0
        
        # Handle clock skew - if device clock is ahead of server
        if latency_ms < 0:
            latency_ms = abs(latency_ms)
        
        state.latencies.append(latency_ms)
        
        state.total_packets += 1
        if state.last_packet_num > 0 and packet_counter > state.last_packet_num + 1:
            state.lost_packets += packet_counter - (state.last_packet_num + 1)
        state.last_packet_num = packet_counter

        has_viewers = len(websocket_connections[device_id]) > 0
        should_store = state.is_recording or has_viewers
        
        if state.total_packets % 10 == 0:
            total_received = state.total_packets - state.lost_packets
            packet_loss_pct = (state.lost_packets / state.total_packets * 100) if state.total_packets > 0 else 0
            avg_latency = float(np.mean(state.latencies)) if state.latencies else 0
            jitter = float(np.std(state.latencies)) if len(state.latencies) > 1 else 0
            
            perf_data = {
                'device_id': device_id,
                'packet_format': state.packet_format,
                'latency_ms': round(float(latency_ms), 2),
                'avg_latency_ms': round(avg_latency, 2),
                'jitter_ms': round(jitter, 2),
                'lost_packets': int(state.lost_packets),
                'total_received': int(total_received),
                'packet_loss_pct': round(float(packet_loss_pct), 2),
            }
            await broadcast_to_device(device_id, "performance_update", perf_data)
            
            # Batch for database
            if should_store:
                async with batch_lock:
                    perf_data_batch.append({
                        "timestamp": datetime.now(timezone.utc),
                        "device_id": device_id,
                        # Use None if just viewing (Temporary), UUID if recording (Permanent)
                        "recording_id": state.recording_id if state.is_recording else None,
                        "packet_counter": int(packet_counter),
                        "latency_ms": float(latency_ms),
                        "jitter_ms": jitter,
                        "lost_packets_cumulative": int(state.lost_packets),
                        "packet_loss_pct_cumulative": float(packet_loss_pct),
                    })
        
        # Recording - store RAW ADC values in database
        if should_store:
            # If recording, count samples for the progress bar
            if state.is_recording:
                state.samples_collected += 1
            
            async with batch_lock:
                raw_data_batch.append({
                    "timestamp": datetime.now(timezone.utc),
                    "device_id": device_id,
                    # Use None if just viewing (Temporary)
                    "recording_id": state.recording_id if state.is_recording else None,
                    "subject_id": state.subject_id if state.is_recording else None,
                    "lead_I": raw_adc_values['lead_I'],
                    "lead_II": raw_adc_values['lead_II'],
                    "v1": raw_adc_values['v1'],
                    "cal_mv_lead_I": cal_mv_values['lead_I'],
                    "cal_mv_lead_II": cal_mv_values['lead_II'],
                    "cal_mv_v1": cal_mv_values['v1']
                })
            
            if state.is_recording:
                if state.samples_collected % 25 == 0:
                    await broadcast_to_device(device_id, "progress_update", {
                        "device_id": device_id,
                        "current": state.samples_collected,
                        "total": BUFFER_SIZE
                    })
                
                if state.samples_collected >= BUFFER_SIZE:
                    await stop_recording(device_id)
                
    except Exception as e:
        print(f"[MQTT] Error processing message: {e}")
        import traceback
        traceback.print_exc()

# ==================================================================
# Database Tasks (Batched)
# ==================================================================
async def db_batch_inserter():
    """Batch insert to database with improved session handling"""
    while True:
        await asyncio.sleep(1)
        
        # --- 1. Process Raw Data ---
        async with batch_lock:
            items = raw_data_batch.copy()
            raw_data_batch.clear()
        
        if items:
            # Create a NEW session for this batch only
            db = SessionLocal()
            try:
                # Insert in chunks of 1000 to prevent packet size errors
                chunk_size = 1000
                for i in range(0, len(items), chunk_size):
                    chunk = items[i:i + chunk_size]
                    records = [ECGRaw3Lead(**item) for item in chunk]
                    db.bulk_save_objects(records)
                    db.commit() # Commit small chunks
            except Exception as e:
                db.rollback()
                print(f"[DB] Error inserting raw data: {e}")
            finally:
                db.close() # Close immediately
        
        # --- 2. Process Performance Data ---
        async with batch_lock:
            perf_items = perf_data_batch.copy()
            perf_data_batch.clear()
        
        if perf_items:
            db = SessionLocal()
            try:
                records = [ECGPerformanceMetrics3Lead(**item) for item in perf_items]
                db.bulk_save_objects(records)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"[DB] Error inserting perf data: {e}")
            finally:
                db.close()

def _execute_db_purge(device_id: str):
    """Blocking DB operation to be run in a separate thread"""
    db = SessionLocal()
    try:
        # Delete Raw Data where recording_id is NULL
        db.query(ECGRaw3Lead).filter(
            ECGRaw3Lead.device_id == device_id,
            ECGRaw3Lead.recording_id.is_(None)
        ).delete(synchronize_session=False)

        # Delete Performance Metrics where recording_id is NULL
        db.query(ECGPerformanceMetrics3Lead).filter(
            ECGPerformanceMetrics3Lead.device_id == device_id
        ).delete(synchronize_session=False)

        db.commit()
        print(f"[PURGE] DB data cleared for {device_id}")
    except Exception as e:
        db.rollback()
        print(f"[PURGE] Error clearing DB for {device_id}: {e}")
    finally:
        db.close()

async def purge_temporary_data(device_id: str):
    """
    1. Clears IN-MEMORY buffers (fixes the 1s ghost data).
    2. Clears DATABASE tables.
    """
    print(f"[PURGE] Starting cleanup for {device_id}...")

    # --- STEP 1: Wipe the RAM Buffer (The Fix) ---
    # We remove any data for this device that doesn't have a recording ID
    async with batch_lock:
        global raw_data_batch, perf_data_batch
        
        # Filter raw_data_batch: Keep item ONLY if it's (Other Device) OR (Has Recording ID)
        original_count = len(raw_data_batch)
        raw_data_batch[:] = [
            item for item in raw_data_batch 
            if item['device_id'] != device_id or item['recording_id'] is not None
        ]
        removed_count = original_count - len(raw_data_batch)

        # Filter perf_data_batch
        perf_data_batch[:] = [
            item for item in perf_data_batch 
            if item['device_id'] != device_id
        ]

        global ui_data_buffer
        if device_id in ui_data_buffer:
            del ui_data_buffer[device_id]
    
    if removed_count > 0:
        print(f"[PURGE] Wiped {removed_count} buffered items from RAM to prevent leak.")

    # --- STEP 2: Wipe the Database ---
    await asyncio.to_thread(_execute_db_purge, device_id)

# ==================================================================
# Device Monitoring
# ==================================================================
async def device_monitor():
    """Monitor device connections and purge data if device dies"""
    while True:
        await asyncio.sleep(2)
        
        now = time.time()
        timed_out = []
        
        # Check every active device
        for device_id, state in list(device_states.items()):
            time_since_seen = now - state.last_seen
            
            # Allow longer timeout if currently recording
            timeout = DEVICE_TIMEOUT_S * 5 if state.is_recording else DEVICE_TIMEOUT_S
            
            # 1. Update Connection Status (Visual only)
            if time_since_seen > 5.0:
                if state.is_connected:
                    state.is_connected = False
                    await broadcast_to_device(device_id, "device_status_update", {
                        "device_id": device_id,
                        "is_connected": False,
                        "time_since_last_seen": time_since_seen
                    })
            
            # 2. Handle Actual Timeout (Device Disconnected)
            if time_since_seen > timeout:
                if state.total_packets > 5 or state.is_recording:
                    print(f"[TIMEOUT] Device {device_id} timed out after {time_since_seen:.1f}s")
                
                # Handle active recordings gracefully
                if state.is_recording:
                    print(f"[CRITICAL] Device {device_id} lost during recording. Saving what we have...")
                    if state.samples_collected > 100:
                        asyncio.create_task(run_analysis_pipeline(
                            state.recording_id, state.subject_id, device_id
                        ))
                
                # [NEW] PURGE Logic for Device Timeout
                # If the device dies, we wipe any temporary (non-recorded) data immediately.
                print(f"[AUTO] Purging temporary data for disconnected device: {device_id}")
                await purge_temporary_data(device_id)
                
                timed_out.append(device_id)
        
        # 3. Cleanup Internal Lists
        if timed_out:
            for device_id in timed_out:
                # Remove from state tracker
                if device_id in device_states:
                    del device_states[device_id]
                
                # Remove from websocket listeners (disconnect viewers)
                if device_id in websocket_connections:
                    # Notify viewers that device is gone
                    await broadcast_to_device(device_id, "device_status_update", {
                        "device_id": device_id, 
                        "is_connected": False,
                        "status": "Offline" 
                    })
                    del websocket_connections[device_id]
                
                if device_id in ui_data_buffer:
                    del ui_data_buffer[device_id]

            # Update the dropdown list for all users
            await broadcast_device_list()

        await broadcast_global_performance()

async def broadcast_global_performance():
    """Broadcast performance summary for all devices"""
    global broadcast_connections
    
    summary = []
    for device_id, state in list(device_states.items()):
        packet_loss_pct = (state.lost_packets / state.total_packets * 100) if state.total_packets > 0 else 0
        avg_latency = float(np.mean(state.latencies)) if state.latencies else 0
        jitter = float(np.std(state.latencies)) if len(state.latencies) > 1 else 0

        summary.append({
            'device_id': device_id,
            'status_message': state.status_message,
            'packet_format': state.packet_format,
            'avg_latency_ms': avg_latency,
            'jitter_ms': jitter,
            'packet_loss_pct': packet_loss_pct,
        })
    
    message = {'type': 'global_performance_update', 'data': summary}
    disconnected = set()
    
    for ws in broadcast_connections:
        try:
            await ws.send_json(message)
        except:
            disconnected.add(ws)
    
    broadcast_connections -= disconnected
        
# ==================================================================
# WebSocket Handlers
# ==================================================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    broadcast_connections.add(websocket)
    
    try:
        # Send initial device list
        await websocket.send_json({
            "type": "device_list_update",
            "devices": list(device_states.keys())
        })
        
        while True:
            data = await websocket.receive_json()
            await handle_websocket_message(websocket, data)
            
    except WebSocketDisconnect:
        # Handle Disconnect with Purge Logic
        broadcast_connections.discard(websocket)
        
        # Check which device they were watching
        if websocket in ws_device_map:
            old_device = ws_device_map[websocket]
            
            # Remove from device listeners
            if websocket in websocket_connections[old_device]:
                websocket_connections[old_device].remove(websocket)
            
            # If no one is left watching that device, PURGE temporary data
            if not websocket_connections[old_device]:
                # Run purge in a separate thread to avoid blocking the async loop
                await purge_temporary_data(old_device)
            
            # Cleanup map
            del ws_device_map[websocket]
            
    except Exception as e:
        print(f"[WS] Error: {e}")
        broadcast_connections.discard(websocket)

async def handle_websocket_message(websocket: WebSocket, data: dict):
    """Handle incoming WebSocket messages"""
    msg_type = data.get("type")
    
    if msg_type == "subscribe_to_device":
        new_device_id = data.get("device_id")
        
        # 1. ALWAYS Unsubscribe from the old device first
        if websocket in ws_device_map:
            old_device = ws_device_map[websocket]
            
            # Remove from the listener list
            if websocket in websocket_connections[old_device]:
                websocket_connections[old_device].remove(websocket)
            
            # CHECK: If no one is listening anymore, PURGE the temporary data
            if not websocket_connections[old_device]:
                print(f"[AUTO] No viewers left for {old_device}. Purging temporary data.")
                await purge_temporary_data(old_device)
            
            # Clear the map entry
            del ws_device_map[websocket]
        
        # 2. Subscribe to New Device (only if not empty)
        if new_device_id:
            # Update global map
            ws_device_map[websocket] = new_device_id
            websocket_connections[new_device_id].add(websocket)
            
            if new_device_id in device_states:
                state = device_states[new_device_id]
                # Send current state
                await websocket.send_json({
                    "type": "state_update",
                    "device_id": new_device_id,
                    "is_recording": state.is_recording,
                    "status_message": state.status_message,
                    "recording_id": state.recording_id,
                    "subject_id": state.subject_id
                })
                # Send connection status
                await websocket.send_json({
                    "type": "device_status_update",
                    "device_id": new_device_id,
                    "is_connected": state.is_connected,
                    "time_since_last_seen": time.time() - state.last_seen if not state.is_connected else 0
                })
    
    elif msg_type == "start_recording":
        device_id = data.get("device_id")
        subject_id = data.get("subject_id")
        if device_id and subject_id and device_id in device_states:
            await start_recording(device_id, subject_id)
    
    elif msg_type == "stop_recording":
        device_id = data.get("device_id")
        if device_id and device_id in device_states:
            await stop_recording(device_id)

async def broadcast_to_device(device_id: str, event_type: str, data: dict):
    """Broadcast message to all clients subscribed to a device"""
    global websocket_connections
    
    message = {"type": event_type, **data}
    disconnected = set()
    
    for ws in websocket_connections[device_id]:
        try:
            await ws.send_json(message)
        except:
            disconnected.add(ws)
    
    websocket_connections[device_id] -= disconnected

async def broadcast_device_list():
    """Broadcast updated device list to all clients"""
    global broadcast_connections
    
    message = {"type": "device_list_update", "devices": list(device_states.keys())}
    disconnected = set()
    
    for ws in broadcast_connections:
        try:
            await ws.send_json(message)
        except:
            disconnected.add(ws)
    
    broadcast_connections -= disconnected

# ==================================================================
# Recording Control
# ==================================================================
async def start_recording(device_id: str, subject_id: str):
    state = device_states[device_id]
    if state.is_recording:
        return
    
    state.is_recording = True
    state.subject_id = subject_id
    state.recording_id = str(uuid.uuid4())
    state.samples_collected = 0
    state.status_message = "Recording..."
    
    print(f"[{device_id}] Started recording: {state.recording_id}")
    
    await broadcast_to_device(device_id, "state_update", {
        "device_id": device_id,
        "is_recording": True,
        "status_message": state.status_message,
        "recording_id": state.recording_id,
        "subject_id": state.subject_id
    })

async def stop_recording(device_id: str):
    state = device_states[device_id]
    if not state.is_recording:
        return
    
    rec_id = state.recording_id
    sub_id = state.subject_id
    
    state.is_recording = False
    state.status_message = "Analyzing..."
    
    await broadcast_to_device(device_id, "state_update", {
        "device_id": device_id,
        "is_recording": False,
        "status_message": state.status_message,
        "recording_id": rec_id,
        "subject_id": sub_id
    })
    
    # Run analysis in background
    asyncio.create_task(run_analysis_pipeline(rec_id, sub_id, device_id))


# ==================================================================
# Analysis Pipeline Helper Functions
# ==================================================================

def correct_peaks(rpeaks, waves_dwt, y_filt):
    """
    Fungsi helper untuk porting logika koreksi peak manual
    dari LiveANN3Channel_V3.py (baris 160-239).
    """
    
    # Salin data agar tidak mengubah data asli (penting untuk server)
    rpeaks_corrected = rpeaks.copy()
    waves_dwt_corrected = waves_dwt.copy()
    
    try:
        # --- Porting baris 160-171: Remove Nan and change to ndarray int ---
        rpeaks_corrected['ECG_R_Peaks'] = np.array([x for x in rpeaks_corrected['ECG_R_Peaks'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_P_Peaks'] = np.array([x for x in waves_dwt_corrected['ECG_P_Peaks'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_Q_Peaks'] = np.array([x for x in waves_dwt_corrected['ECG_Q_Peaks'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_S_Peaks'] = np.array([x for x in waves_dwt_corrected['ECG_S_Peaks'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_T_Peaks'] = np.array([x for x in waves_dwt_corrected['ECG_T_Peaks'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_P_Onsets'] = np.array([x for x in waves_dwt_corrected['ECG_P_Onsets'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_P_Offsets'] = np.array([x for x in waves_dwt_corrected['ECG_P_Offsets'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_R_Onsets'] = np.array([x for x in waves_dwt_corrected['ECG_R_Onsets'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_R_Offsets'] = np.array([x for x in waves_dwt_corrected['ECG_R_Offsets'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_T_Onsets'] = np.array([x for x in waves_dwt_corrected['ECG_T_Onsets'] if not pd.isna(x)]).astype(int)
        waves_dwt_corrected['ECG_T_Offsets'] = np.array([x for x in waves_dwt_corrected['ECG_T_Offsets'] if not pd.isna(x)]).astype(int)

        # Cek jika ada list yang kosong setelah filtering NaN, jika ya, hentikan koreksi
        all_keys_to_check = ['ECG_R_Peaks', 'ECG_P_Peaks', 'ECG_Q_Peaks', 'ECG_S_Peaks', 'ECG_T_Peaks',
                             'ECG_P_Onsets', 'ECG_P_Offsets', 'ECG_R_Onsets', 'ECG_R_Offsets', 'ECG_T_Onsets', 'ECG_T_Offsets']
        
        # Periksa rpeaks
        if len(rpeaks_corrected['ECG_R_Peaks']) == 0:
            print("[Koreksi Peak] R peaks kosong, koreksi dibatalkan.")
            return rpeaks_corrected, waves_dwt_corrected
        
        # Periksa waves_dwt
        for key in all_keys_to_check:
            if key == 'ECG_R_Peaks': continue
            if len(waves_dwt_corrected[key]) == 0:
                print(f"[Koreksi Peak] {key} kosong, koreksi dibatalkan.")
                return rpeaks_corrected, waves_dwt_corrected # Kembalikan apa adanya

        # --- Porting baris 173-209: Correcting first cycle ---
        if rpeaks_corrected['ECG_R_Peaks'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            rpeaks_corrected['ECG_R_Peaks'] = np.delete(rpeaks_corrected['ECG_R_Peaks'], 0)
        if len(rpeaks_corrected['ECG_R_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected # Cek ulang

        if waves_dwt_corrected['ECG_P_Peaks'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_P_Peaks'] = np.delete(waves_dwt_corrected['ECG_P_Peaks'], 0)
        if len(waves_dwt_corrected['ECG_P_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_Q_Peaks'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_Q_Peaks'] = np.delete(waves_dwt_corrected['ECG_Q_Peaks'], 0)
        if len(waves_dwt_corrected['ECG_Q_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_S_Peaks'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_S_Peaks'] = np.delete(waves_dwt_corrected['ECG_S_Peaks'], 0)
        if len(waves_dwt_corrected['ECG_S_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_T_Peaks'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_T_Peaks'] = np.delete(waves_dwt_corrected['ECG_T_Peaks'], 0)
        if len(waves_dwt_corrected['ECG_T_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_P_Offsets'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_P_Offsets'] = np.delete(waves_dwt_corrected['ECG_P_Offsets'], 0)
        if len(waves_dwt_corrected['ECG_P_Offsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_R_Offsets'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_R_Offsets'] = np.delete(waves_dwt_corrected['ECG_R_Offsets'], 0)
        if len(waves_dwt_corrected['ECG_R_Offsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_T_Offsets'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_T_Offsets'] = np.delete(waves_dwt_corrected['ECG_T_Offsets'], 0)
        if len(waves_dwt_corrected['ECG_T_Offsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_R_Onsets'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_R_Onsets'] = np.delete(waves_dwt_corrected['ECG_R_Onsets'], 0)
        if len(waves_dwt_corrected['ECG_R_Onsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_T_Onsets'][0] < waves_dwt_corrected['ECG_P_Onsets'][0]:
            waves_dwt_corrected['ECG_T_Onsets'] = np.delete(waves_dwt_corrected['ECG_T_Onsets'], 0)
        if len(waves_dwt_corrected['ECG_T_Onsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_R_Offsets'][0] < rpeaks_corrected['ECG_R_Peaks'][0]:
            waves_dwt_corrected['ECG_R_Offsets'] = np.delete(waves_dwt_corrected['ECG_R_Offsets'], 0)
        if len(waves_dwt_corrected['ECG_R_Offsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_T_Offsets'][0] < rpeaks_corrected['ECG_R_Peaks'][0]:
            waves_dwt_corrected['ECG_T_Offsets'] = np.delete(waves_dwt_corrected['ECG_T_Offsets'], 0)
        if len(waves_dwt_corrected['ECG_T_Offsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_T_Onsets'][0] < rpeaks_corrected['ECG_R_Peaks'][0]:
            waves_dwt_corrected['ECG_T_Onsets'] = np.delete(waves_dwt_corrected['ECG_T_Onsets'], 0)
        if len(waves_dwt_corrected['ECG_T_Onsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_S_Peaks'][0] < rpeaks_corrected['ECG_R_Peaks'][0]:
            waves_dwt_corrected['ECG_S_Peaks'] = np.delete(waves_dwt_corrected['ECG_S_Peaks'], 0)
        if len(waves_dwt_corrected['ECG_S_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_T_Peaks'][0] < rpeaks_corrected['ECG_R_Peaks'][0]:
            waves_dwt_corrected['ECG_T_Peaks'] = np.delete(waves_dwt_corrected['ECG_T_Peaks'], 0)
        if len(waves_dwt_corrected['ECG_T_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if len(rpeaks_corrected['ECG_R_Peaks']) > 1 and y_filt[rpeaks_corrected['ECG_R_Peaks'][0]] < y_filt[rpeaks_corrected['ECG_R_Peaks'][1]] / 2:
            rpeaks_corrected['ECG_R_Peaks'] = np.delete(rpeaks_corrected['ECG_R_Peaks'], 0)
            waves_dwt_corrected['ECG_P_Peaks'] = np.delete(waves_dwt_corrected['ECG_P_Peaks'], 0)
            waves_dwt_corrected['ECG_Q_Peaks'] = np.delete(waves_dwt_corrected['ECG_Q_Peaks'], 0)
            waves_dwt_corrected['ECG_S_Peaks'] = np.delete(waves_dwt_corrected['ECG_S_Peaks'], 0)
            waves_dwt_corrected['ECG_T_Peaks'] = np.delete(waves_dwt_corrected['ECG_T_Peaks'], 0)
            waves_dwt_corrected['ECG_R_Onsets'] = np.delete(waves_dwt_corrected['ECG_R_Onsets'], 0)
            waves_dwt_corrected['ECG_R_Offsets'] = np.delete(waves_dwt_corrected['ECG_R_Offsets'], 0)
            waves_dwt_corrected['ECG_P_Onsets'] = np.delete(waves_dwt_corrected['ECG_P_Onsets'], 0)
            waves_dwt_corrected['ECG_P_Offsets'] = np.delete(waves_dwt_corrected['ECG_P_Offsets'], 0)
            waves_dwt_corrected['ECG_T_Onsets'] = np.delete(waves_dwt_corrected['ECG_T_Onsets'], 0)
            waves_dwt_corrected['ECG_T_Offsets'] = np.delete(waves_dwt_corrected['ECG_T_Offsets'], 0)
            
        # Cek lagi jika ada list yang kosong setelah koreksi pertama
        if len(rpeaks_corrected['ECG_R_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected
        for key in all_keys_to_check:
             if key == 'ECG_R_Peaks': continue
             if len(waves_dwt_corrected[key]) == 0: return rpeaks_corrected, waves_dwt_corrected

        # --- Porting baris 211-239: Correcting last cycle ---
        if rpeaks_corrected['ECG_R_Peaks'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            rpeaks_corrected['ECG_R_Peaks'] = np.delete(rpeaks_corrected['ECG_R_Peaks'], -1)
        if len(rpeaks_corrected['ECG_R_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_P_Peaks'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_P_Peaks'] = np.delete(waves_dwt_corrected['ECG_P_Peaks'], -1)
        if len(waves_dwt_corrected['ECG_P_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_Q_Peaks'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_Q_Peaks'] = np.delete(waves_dwt_corrected['ECG_Q_Peaks'], -1)
        if len(waves_dwt_corrected['ECG_Q_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_S_Peaks'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_S_Peaks'] = np.delete(waves_dwt_corrected['ECG_S_Peaks'], -1)
        if len(waves_dwt_corrected['ECG_S_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_T_Peaks'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_T_Peaks'] = np.delete(waves_dwt_corrected['ECG_T_Peaks'], -1)
        if len(waves_dwt_corrected['ECG_T_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_P_Onsets'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_P_Onsets'] = np.delete(waves_dwt_corrected['ECG_P_Onsets'], -1)
        if len(waves_dwt_corrected['ECG_P_Onsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_T_Onsets'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_T_Onsets'] = np.delete(waves_dwt_corrected['ECG_T_Onsets'], -1)
        if len(waves_dwt_corrected['ECG_T_Onsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_R_Onsets'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_R_Onsets'] = np.delete(waves_dwt_corrected['ECG_R_Onsets'], -1)
        if len(waves_dwt_corrected['ECG_R_Onsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_R_Offsets'][-1] > waves_dwt_corrected['ECG_T_Offsets'][-1]:
            waves_dwt_corrected['ECG_R_Offsets'] = np.delete(waves_dwt_corrected['ECG_R_Offsets'], -1)
        if len(waves_dwt_corrected['ECG_R_Offsets']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_P_Peaks'][-1] > rpeaks_corrected['ECG_R_Peaks'][-1]:
            waves_dwt_corrected['ECG_P_Peaks'] = np.delete(waves_dwt_corrected['ECG_P_Peaks'], -1)
        if len(waves_dwt_corrected['ECG_P_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_Q_Peaks'][-1] > rpeaks_corrected['ECG_R_Peaks'][-1]:
            waves_dwt_corrected['ECG_Q_Peaks'] = np.delete(waves_dwt_corrected['ECG_Q_Peaks'], -1)
        if len(waves_dwt_corrected['ECG_Q_Peaks']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_P_Onsets'][-1] > rpeaks_corrected['ECG_R_Peaks'][-1]:
            waves_dwt_corrected['ECG_P_Onsets'] = np.delete(waves_dwt_corrected['ECG_P_Onsets'], -1)
        if len(waves_dwt_corrected['ECG_P_Onsets']) == 0: return rpeaks_corrected, waves_dwt_corrected
            
        if waves_dwt_corrected['ECG_P_Offsets'][-1] > rpeaks_corrected['ECG_R_Peaks'][-1]:
            waves_dwt_corrected['ECG_P_Offsets'] = np.delete(waves_dwt_corrected['ECG_P_Offsets'], -1)
        if len(waves_dwt_corrected['ECG_P_Offsets']) == 0: return rpeaks_corrected, waves_dwt_corrected

        if waves_dwt_corrected['ECG_R_Onsets'][-1] > rpeaks_corrected['ECG_R_Peaks'][-1]:
            waves_dwt_corrected['ECG_R_Onsets'] = np.delete(waves_dwt_corrected['ECG_R_Onsets'], -1)
            
    except IndexError:
        print(f"[Koreksi Peak] IndexError terjadi selama koreksi manual. Mengembalikan data yang belum dikoreksi.")
        # Kembalikan data asli jika terjadi error
        return rpeaks, waves_dwt
    except Exception as e:
        print(f"[Koreksi Peak] Error tidak terduga: {e}. Mengembalikan data yang belum dikoreksi.")
        return rpeaks, waves_dwt
        
    return rpeaks_corrected, waves_dwt_corrected


# ==================================================================
# Analysis Pipeline (Async with Complete Logic)
# ==================================================================

async def run_analysis_pipeline(recording_id: str, subject_id: str, device_id: str):
    """
    Run analysis in background - complete pipeline with identical logic
    """
    print(f"[{device_id}] Starting analysis for {recording_id}")
    
    try:
        result = await asyncio.to_thread(
            analyze_recording_complete, recording_id, subject_id, device_id
        )
        
        if device_id in device_states:
            device_states[device_id].status_message = "Idle"
            device_states[device_id].samples_collected = 0
            device_states[device_id].recording_id = None
            device_states[device_id].subject_id = None
            
            await broadcast_to_device(device_id, "state_update", {
                "device_id": device_id,
                "status_message": "Idle",
                "recording_id": None,
                "subject_id": None,
                "samples_collected": 0
            })
        
        # Notify clients about history update
        await broadcast_to_all({"type": "history_updated"})
        
    except Exception as e:
        print(f"[{device_id}] Analysis failed: {e}")
        traceback.print_exc()


def analyze_recording_complete(recording_id, subject_id, device_id):
    """
    Complete analysis function with IDENTICAL logic from LiveANN3Channel_V3.py
    """
    db = SessionLocal()
    try:
        print(f"[{recording_id}][{device_id}] Memulai pipeline analisis 3-Lead (IDENTICAL)...")
        
        # 1. Ambil data mentah 3-lead dari PostgreSQL
        rows = db.query(ECGRaw3Lead).filter(
            ECGRaw3Lead.recording_id == recording_id
        ).order_by(ECGRaw3Lead.timestamp).all()
        
        # Convert to DataFrame
        df = pd.DataFrame([{
            'timestamp': row.timestamp,
            'device_id': row.device_id,
            'recording_id': row.recording_id,
            'subject_id': row.subject_id,
            'lead_I': row.cal_mv_lead_I,
            'lead_II': row.cal_mv_lead_II,
            'v1': row.cal_mv_v1
        } for row in rows])

        if len(df) < 500:
            raise ValueError(f"Data tidak cukup untuk analisis (hanya {len(df)} baris)")
        
        Fs = SPS
        
        # Inisialisasi fitur
        RR_avg, RR_stdev = 0.0, 0.0
        PR_avg, PR_stdev = 0.0, 0.0
        QS_avg, QS_stdev = 0.0, 0.0
        QT_avg, QT_stdev = 0.0, 0.0
        QTc_avg = 0.0
        bpm = 0.0
        ST_avg, ST_stdev = 0.0, 0.0
        RS_ratio_V1 = 0.0
        
        RR_list_for_qtc = []

        # 2. Proses Channel II (Lead II) untuk RR, PR, QS, QT, BPM
        try:
            print(f"[{device_id}] Memproses Lead II...")
            ecg_mv_ii = df['lead_II'].fillna(0).values
            y_filt_ii = apply_dsp_filters(ecg_mv_ii, Fs)
            
            _, rpeaks_ii_raw = nk.ecg_peaks(y_filt_ii, sampling_rate=Fs)
            _, waves_dwt_ii_raw = nk.ecg_delineate(y_filt_ii, rpeaks_ii_raw, sampling_rate=Fs, method="dwt")
            
            rpeaks_ii, waves_dwt_ii = correct_peaks(rpeaks_ii_raw, waves_dwt_ii_raw, y_filt_ii)
            
            # RR Interval & BPM
            RR_list = []
            cnt = 0
            while (cnt < (len(rpeaks_ii['ECG_R_Peaks']) - 1)):
                RR_interval = (rpeaks_ii['ECG_R_Peaks'][cnt + 1] - rpeaks_ii['ECG_R_Peaks'][cnt])
                RRms_dist = ((RR_interval / Fs) * 1000.0)
                RR_list.append(RRms_dist)
                cnt += 1
            
            RR_list_for_qtc = RR_list
            if RR_list:
                RR_stdev = np.std(RR_list, axis=None)
                sum_val, count_val = 0.0, 0.0
                for index in range(len(RR_list)):
                    if not pd.isna(RR_list[index]):
                        sum_val += RR_list[index]
                        count_val += 1
                if count_val > 0:
                    RR_avg = (sum_val / count_val)
                    bpm = 60000 / RR_avg
            
            # PR Interval
            PR_peak_list = []
            idex = ([x for x in range(0, min(len(waves_dwt_ii['ECG_R_Onsets']), len(waves_dwt_ii['ECG_P_Onsets']), len(waves_dwt_ii['ECG_Q_Peaks'])) - 1)])
            for i in idex:
                if waves_dwt_ii['ECG_R_Onsets'][i] < waves_dwt_ii['ECG_P_Onsets'][i]:
                    PR_peak_interval = (waves_dwt_ii['ECG_Q_Peaks'][i] - waves_dwt_ii['ECG_P_Onsets'][i])
                else:
                    PR_peak_interval = (waves_dwt_ii['ECG_R_Onsets'][i] - waves_dwt_ii['ECG_P_Onsets'][i])
                ms_dist = ((PR_peak_interval / Fs) * 1000.0)
                PR_peak_list.append(ms_dist)
            
            if PR_peak_list:
                PR_stdev = np.std(PR_peak_list, axis=None)
                sum_val, count_val = 0.0, 0.0
                for index in range(len(PR_peak_list)):
                    if not pd.isna(PR_peak_list[index]):
                        sum_val += PR_peak_list[index]
                        count_val += 1
                if count_val > 0:
                    PR_avg = (sum_val / count_val)

            # QS Interval (QRS Duration)
            QS_peak_list = []
            try:
                idex = ([x for x in range(0, min(len(waves_dwt_ii['ECG_S_Peaks']), len(waves_dwt_ii['ECG_Q_Peaks'])) -1)])
                for i in idex:
                    if waves_dwt_ii['ECG_S_Peaks'][i] < waves_dwt_ii['ECG_Q_Peaks'][i] and (i+1) < len(waves_dwt_ii['ECG_S_Peaks']):
                        QRS_complex = (waves_dwt_ii['ECG_S_Peaks'][i + 1] - waves_dwt_ii['ECG_Q_Peaks'][i])
                    else:
                        QRS_complex = (waves_dwt_ii['ECG_S_Peaks'][i] - waves_dwt_ii['ECG_Q_Peaks'][i])
                    ms_dist = ((QRS_complex / Fs) * 1000.0)
                    QS_peak_list.append(ms_dist)
            except Exception as e_qs:
                print(f"[{device_id}] Error kalkulasi QS: {e_qs}")
            
            if QS_peak_list:
                QS_stdev = np.std(QS_peak_list, axis=None)
                sum_val, count_val = 0.0, 0.0
                for index in range(len(QS_peak_list)):
                    if not pd.isna(QS_peak_list[index]):
                        sum_val += QS_peak_list[index]
                        count_val += 1
                if count_val > 0:
                    QS_avg = (sum_val / count_val)

            # QT Interval
            QT_peak_list = []
            try:
                idex = ([x for x in range(0, min(len(waves_dwt_ii['ECG_T_Offsets']), len(waves_dwt_ii['ECG_R_Onsets'])) -1)])
                for i in idex:
                    if waves_dwt_ii['ECG_T_Offsets'][i] < waves_dwt_ii['ECG_R_Onsets'][i] and (i+1) < len(waves_dwt_ii['ECG_T_Offsets']):
                        QTdeff = (waves_dwt_ii['ECG_T_Offsets'][i + 1] - waves_dwt_ii['ECG_R_Onsets'][i])
                    else:
                        QTdeff = (waves_dwt_ii['ECG_T_Offsets'][i] - waves_dwt_ii['ECG_R_Onsets'][i])
                    ms_dist = ((QTdeff / Fs) * 1000.0)
                    QT_peak_list.append(ms_dist)
            except Exception as e_qt:
                print(f"[{device_id}] Error kalkulasi QT: {e_qt}")

            if QT_peak_list:
                QT_stdev = np.std(QT_peak_list, axis=None)
                sum_val, count_val = 0.0, 0.0
                for index in range(len(QT_peak_list)):
                    if not pd.isna(QT_peak_list[index]):
                        sum_val += QT_peak_list[index]
                        count_val += 1
                if count_val > 0:
                    QT_avg = (sum_val / count_val)
            
            # QTc (Bazett's formula)
            if QT_avg > 0 and RR_list_for_qtc and np.mean(RR_list_for_qtc) > 0:
                QTc_avg = QT_avg / (math.sqrt(np.mean(RR_list_for_qtc) / 1000.0))
            
            print(f"[{device_id}] Lead II Features: RR={RR_avg:.2f}, PR={PR_avg:.2f}, QS={QS_avg:.2f}, QTc={QTc_avg:.2f}, BPM={bpm:.2f}")

        except Exception as e_ii:
            print(f"[{recording_id}][{device_id}] Gagal memproses Lead II: {e_ii}\n{traceback.format_exc()}")

        # 3. Proses Channel I (Lead I) untuk ST Interval
        try:
            print(f"[{device_id}] Memproses Lead I...")
            ecg_mv_i = df['lead_I'].fillna(0).values
            y_filt_i = apply_dsp_filters(ecg_mv_i, Fs)
            
            _, rpeaks_i_raw = nk.ecg_peaks(y_filt_i, sampling_rate=Fs)
            _, waves_dwt_i_raw = nk.ecg_delineate(y_filt_i, rpeaks_i_raw, sampling_rate=Fs, method="dwt")

            rpeaks_i, waves_dwt_i = correct_peaks(rpeaks_i_raw, waves_dwt_i_raw, y_filt_i)
            
            ST_peak_list = []
            try:
                idex = ([x for x in range(0, min(len(waves_dwt_i['ECG_T_Offsets']), len(waves_dwt_i['ECG_R_Offsets'])) -1)])
                for i in idex:
                    if waves_dwt_i['ECG_T_Offsets'][i] < waves_dwt_i['ECG_R_Offsets'][i] and (i+1) < len(waves_dwt_i['ECG_T_Offsets']):
                        ST_peak_interval = (waves_dwt_i['ECG_T_Offsets'][i+1] - waves_dwt_i['ECG_R_Offsets'][i])
                    else:
                        ST_peak_interval = (waves_dwt_i['ECG_T_Offsets'][i] - waves_dwt_i['ECG_R_Offsets'][i])
                    ms_dist = ((ST_peak_interval / Fs) * 1000.0)
                    ST_peak_list.append(ms_dist)
            except Exception as e_st:
                print(f"[{device_id}] Error kalkulasi ST: {e_st}")
            
            if ST_peak_list:
                ST_stdev = np.std(ST_peak_list, axis=None)
                sum_val, count_val = 0.0, 0.0
                for index in range(len(ST_peak_list)):
                    if not pd.isna(ST_peak_list[index]):
                        sum_val += ST_peak_list[index]
                        count_val += 1
                if count_val > 0:
                    ST_avg = (sum_val / count_val)
            
            print(f"[{device_id}] Lead I Features: ST={ST_avg:.2f}")

        except Exception as e_i:
            print(f"[{recording_id}][{device_id}] Gagal memproses Lead I: {e_i}\n{traceback.format_exc()}")

        # 4. Proses Channel V1 (Lead V1) untuk R/S Ratio
        try:
            print(f"[{device_id}] Memproses Lead V1...")
            ecg_mv_v1 = df['v1'].fillna(0).values
            y_filt_v1 = apply_dsp_filters(ecg_mv_v1, Fs)
            
            _, rpeaks_v1_raw = nk.ecg_peaks(y_filt_v1, sampling_rate=Fs)
            _, waves_dwt_v1_raw = nk.ecg_delineate(y_filt_v1, rpeaks_v1_raw, sampling_rate=Fs, method="dwt")

            rpeaks_v1, waves_dwt_v1 = correct_peaks(rpeaks_v1_raw, waves_dwt_v1_raw, y_filt_v1)

            if ('ECG_S_Peaks' in waves_dwt_v1.keys() and 
                len(rpeaks_v1['ECG_R_Peaks']) > 0 and 
                len(waves_dwt_v1['ECG_S_Peaks']) > 0):
                
                R_mean_amp_V1 = np.mean([y_filt_v1[int(i)] for i in rpeaks_v1['ECG_R_Peaks']])
                S_mean_amp_V1 = np.mean([y_filt_v1[int(i)] for i in waves_dwt_v1['ECG_S_Peaks']])
                
                if abs(S_mean_amp_V1) > 1e-9:
                    RS_ratio_V1 = R_mean_amp_V1 / abs(S_mean_amp_V1)
            else:
                print(f"[{device_id}] Tidak ada S-Peaks atau R-Peaks yang ditemukan di V1.")
            
            print(f"[{device_id}] V1 Features: R/S Ratio={RS_ratio_V1:.2f}")
            
        except Exception as e_v1:
            print(f"[{recording_id}][{device_id}] Gagal memproses Lead V1: {e_v1}\n{traceback.format_exc()}")

        # 5. Prediksi menggunakan Model ANN
        classification = "Error: Model/Scaler tidak dimuat."
        if loaded_model and scaler:
            modelData = np.array([RR_avg, PR_avg, QS_avg, QTc_avg, ST_avg, RS_ratio_V1, bpm]).reshape(1, -1)
            modelData = np.nan_to_num(modelData, nan=0.0, posinf=0.0, neginf=0.0)
            modelData_normalized = scaler.transform(modelData)
            
            print(f"[{device_id}] Input data for prediction (cleaned): {modelData}")
            predictions = loaded_model.predict(modelData_normalized)
            print(f"[{device_id}] Predictions (raw): {predictions}")
            
            predictions_flat = predictions.flatten()
            class_mapping = {
                1: 'Abnormal',
                2: 'Normal',
                3: 'Berpotensi Aritmia',
                4: 'Sangat Berpotensi Aritmia'
            }
            predicted_class = np.argmax(predictions_flat) + 1
            classification = class_mapping.get(predicted_class, "Unknown")
        else:
            if not loaded_model: print(f"[{device_id}] Model tidak dimuat, skipping prediction.")
            if not scaler: print(f"[{device_id}] Scaler tidak dimuat, skipping prediction.")

        # 6. Simpan hasil klasifikasi ke PostgreSQL
        print(f"[{recording_id}][{device_id}] Hasil klasifikasi final: {classification}")
        
        classification_record = ECGClassification3Lead(
            timestamp=datetime.now(timezone.utc),
            device_id=device_id,
            recording_id=recording_id,
            subject_id=subject_id,
            classification=classification,
            RR_avg=float(RR_avg),
            PR_avg=float(PR_avg),
            QS_avg=float(QS_avg),
            QTc_avg=float(QTc_avg),
            ST_avg=float(ST_avg),
            RS_ratio_V1=float(RS_ratio_V1),
            bpm=float(bpm)
        )
        db.add(classification_record)
        db.commit()
        
        print(f"[{recording_id}][{device_id}] Hasil analisis berhasil disimpan.")
        return classification
            
    except Exception as e:
        db.rollback()
        print(f"[{recording_id}][{device_id}] Gagal total dalam pipeline analisis: {e}\n{traceback.format_exc()}")
        
        # Save error classification
        try:
            error_record = ECGClassification3Lead(
                timestamp=datetime.now(timezone.utc),
                device_id=device_id,
                recording_id=recording_id,
                subject_id=subject_id,
                classification="Error Analisis Sistem",
                RR_avg=float(RR_avg),
                PR_avg=float(PR_avg),
                QS_avg=float(QS_avg),
                QTc_avg=float(QTc_avg),
                ST_avg=float(ST_avg),
                RS_ratio_V1=float(RS_ratio_V1),
                bpm=float(bpm)
            )
            db.add(error_record)
            db.commit()
        except:
            db.rollback()
        
        return None
            
    finally:
        db.close()

# ==================================================================
# Helper for Broadcasting to All Clients
# ==================================================================

async def broadcast_to_all(message: dict):
    """Broadcast message to all connected clients"""
    global broadcast_connections
    
    disconnected = set()
    
    for ws in broadcast_connections:
        try:
            await ws.send_json(message)
        except:
            disconnected.add(ws)
    
    broadcast_connections -= disconnected
    
# ==================================================================
# HTTP Endpoints
# ==================================================================
@app.get("/", response_class=HTMLResponse)
async def get_index():
    html_file = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    else:
        return HTMLResponse(content="<h1>Error: index.html not found</h1>", status_code=404)
    
@app.get("/api/history")
async def get_history(device_id: str = None, subject_id: str = None):
    """
    Mengambil riwayat klasifikasi, difilter berdasarkan device_id dan/atau subject_id.
    """
    db = SessionLocal()
    try:
        query = db.query(ECGClassification3Lead)
        
        if device_id:
            query = query.filter(ECGClassification3Lead.device_id == device_id)
            
        if subject_id:
            query = query.filter(ECGClassification3Lead.subject_id.ilike(f"%{subject_id}%"))
        
        records = query.order_by(
            desc(ECGClassification3Lead.timestamp)
        ).limit(50).all()
        
        return [{
            'timestamp': rec.timestamp.isoformat(),
            'device_id': rec.device_id,
            'subject_id': rec.subject_id,
            'recording_id': rec.recording_id,
            'classification': rec.classification
        } for rec in records]
    finally:
        db.close()

@app.get("/api/download/raw/{recording_id}", response_class=StreamingResponse)
async def download_raw_data(recording_id: str):
    """Download raw 3-lead ECG data as CSV for a given recording_id."""
    db = SessionLocal()
    try:
        rows = db.query(ECGRaw3Lead).filter(
            ECGRaw3Lead.recording_id == recording_id
        ).order_by(ECGRaw3Lead.timestamp).all()

        if not rows:
            return JSONResponse(content={"message": "Recording not found or no raw data."}, status_code=404)

        df = pd.DataFrame([{
            'timestamp': row.timestamp.isoformat(),
            'device_id': row.device_id,
            'subject_id': row.subject_id,
            'lead_I': row.lead_I,
            'lead_II': row.lead_II,
            'v1': row.v1,
            'cal_mv_lead_I': row.cal_mv_lead_I,
            'cal_mv_lead_II': row.cal_mv_lead_II,
            'cal_mv_v1': row.cal_mv_v1
        } for row in rows])

        csv_data = df.to_csv(index=False)
        filename = f"ecg_raw_data_{recording_id}.csv"
        
        return StreamingResponse(
            iter([csv_data]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"[API] Error raw data download: {e}")
        return JSONResponse(content={"message": f"Server error: {e}"}, status_code=500)
    finally:
        db.close()

@app.get("/api/download/feature/{recording_id}", response_class=StreamingResponse)
async def download_feature_data(recording_id: str):
    """Re-run analysis pipeline to generate and download feature data as CSV."""
    db = SessionLocal()
    try:
        classification_record = db.query(ECGClassification3Lead).filter(
            ECGClassification3Lead.recording_id == recording_id
        ).first()

        if not classification_record:
            return JSONResponse(content={"message": "Feature data not available. Run analysis first."}, status_code=404)

        # Ganti dengan kolom fitur yang sebenarnya jika Anda menyimpannya ke DB!
        feature_data = {
            'recording_id': recording_id,
            'subject_id': classification_record.subject_id,
            'classification_result': classification_record.classification,
            # Contoh kolom fitur yang harusnya diisi
            'RR_avg': classification_record.RR_avg,
            'PR_avg': classification_record.PR_avg,
            'QS_avg': classification_record.QS_avg,
            'QTc_avg': classification_record.QTc_avg,
            'ST_avg': classification_record.ST_avg,
            'RS_ratio_V1': classification_record.RS_ratio_V1,
            'BPM': classification_record.bpm,
        }
        
        df = pd.DataFrame([feature_data])

        csv_data = df.to_csv(index=False)
        filename = f"ecg_features_data_{recording_id}.csv"
        
        return StreamingResponse(
            iter([csv_data]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"[API] Error feature data download: {e}")
        return JSONResponse(content={"message": f"Server error: {e}"}, status_code=500)
    finally:
        db.close()

# ==================================================================
# Startup
# ==================================================================
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    init_db()
    
    mqtt_task = asyncio.create_task(mqtt_listener())
    db_task = asyncio.create_task(db_batch_inserter())
    monitor_task = asyncio.create_task(device_monitor())
    
    print(f"[SERVER] URL: http://localhost:{FLASK_PORT}")
    print(f"[MQTT] Broker: {MQTT_BROKER}:{MQTT_PORT}")
    
    yield
    
    mqtt_task.cancel()
    db_task.cancel()
    monitor_task.cancel()

app.router.lifespan_context = lifespan

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=FLASK_PORT,
        loop="asyncio"
    )
    server = uvicorn.Server(config)
    
    if sys.platform == 'win32':
        asyncio.run(server.serve())
    else:
        uvicorn.run(app, host="0.0.0.0", port=FLASK_PORT)