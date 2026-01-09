import paho.mqtt.client as mqtt
import json
import time
import math
import random
import threading

# ==========================================
# KONFIGURASI
# ==========================================
MQTT_BROKER = "103.183.75.251"
MQTT_PORT = 1883
MQTT_USERNAME = "admin"
MQTT_PASSWORD = "ecgctai"
# MQTT_BROKER = "test.mosquitto.org"
# MQTT_PORT = 1883
# MQTT_USERNAME = ""
# MQTT_PASSWORD = ""
SPS = 100 

# Konfigurasi Batching (Sesuai ESP32)
BATCH_SIZE = 10 

# Berapa banyak device palsu yang mau dinyalakan?
JUMLAH_DEVICE = 2
PREFIX_ID = "SIMULATOR" # Nanti jadi SIMULATOR-001, SIMULATOR-002, dst.

# ==========================================
# GENERATOR SINYAL
# ==========================================
def generate_ecg_point(step, offset_noise=0.0):
    t = (step % SPS) / SPS
    val = random.uniform(-0.02, 0.02) + offset_noise
    val += 0.15 * math.exp(-((t - 0.2)**2) / (2 * 0.015**2))
    val -= 0.15 * math.exp(-((t - 0.35)**2) / (2 * 0.005**2))
    val += 1.0 * math.exp(-((t - 0.38)**2) / (2 * 0.005**2))
    val -= 0.25 * math.exp(-((t - 0.42)**2) / (2 * 0.005**2))
    val += 0.3 * math.exp(-((t - 0.6)**2) / (2 * 0.03**2))
    return val

# ==========================================
# FUNGSI UNTUK SATU DEVICE (THREAD)
# ==========================================
def device_thread(device_index):
    device_id = f"{PREFIX_ID}-{device_index+1:03d}" 
    topic = f"raw/ecg/{device_id}"
    
    # Client MQTT
    client = mqtt.Client(client_id=f"sim_client_{device_id}")
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        print(f"[START] {device_id} menyala dan mengirim data (Batching Mode)...")
        
        counter = 0
        step = random.randint(0, 100) 
        
        # Buffer untuk Batching
        buf_r1, buf_r2, buf_r3 = [], [], []
        buf_c1, buf_c2, buf_c3 = [], [], []

        while True:
            loop_start = time.time()

            # 1. Generate 1 Titik Data
            ecg_mv = generate_ecg_point(step)
            
            # Simulasi Lead (I, II, V1)
            lead_I = ecg_mv * 0.8
            lead_II = ecg_mv * 1.0
            v1 = ecg_mv * 0.5
            
            # 2. Masukkan ke Buffer (Array)
            buf_r1.append(int(lead_I * 1000) + 2000)
            buf_r2.append(int(lead_II * 1000) + 2000)
            buf_r3.append(int(v1 * 1000) + 2000)
            
            # Pembulatan 3 desimal agar hemat bandwidth (sama seperti ESP)
            buf_c1.append(round(lead_I, 3))
            buf_c2.append(round(lead_II, 3))
            buf_c3.append(round(v1, 3))

            counter += 1
            step += 1

            # 3. Cek apakah Buffer sudah penuh (10 data)
            if len(buf_r1) >= BATCH_SIZE:
                # Siapkan Payload Batch
                payload = {
                    "id": device_id,
                    "ts_us": int(time.time() * 1_000_000), # Waktu kirim (akhir batch)
                    "cnt": counter,
                    "r1": buf_r1,
                    "r2": buf_r2,
                    "r3": buf_r3,
                    "c1": buf_c1,
                    "c2": buf_c2,
                    "c3": buf_c3
                }
                
                # Kirim ke MQTT
                client.publish(topic, json.dumps(payload))
                
                # Reset Buffer
                buf_r1, buf_r2, buf_r3 = [], [], []
                buf_c1, buf_c2, buf_c3 = [], [], []

            # 4. Timing Control (Tetap berjalan di 100Hz untuk simulasi sampling)
            # Kita mengirim setiap 10 loop (100ms), tapi loop tetap jalan per 10ms
            elapsed = time.time() - loop_start
            time.sleep(max(0, (1.0/SPS) - elapsed))
            
    except Exception as e:
        print(f"[ERROR] {device_id} mati: {e}")
    finally:
        client.disconnect()

# ==========================================
# MAIN LAUNCHER
# ==========================================
if __name__ == "__main__":
    print(f"--- MENYALAKAN {JUMLAH_DEVICE} DEVICE SIMULATOR (BATCH MODE) ---")
    
    threads = []
    for i in range(JUMLAH_DEVICE):
        t = threading.Thread(target=device_thread, args=(i,))
        t.daemon = True 
        t.start()
        threads.append(t)
        time.sleep(0.5) # Jeda agar tidak connect barengan
        
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[STOP] Mematikan semua simulator...")