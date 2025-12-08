"""
ECG Device Simulator - FIXED SIGNAL AMPLITUDE
Generates realistic ECG signals with proper scaling
"""
import time
import struct
import random
import argparse
import paho.mqtt.client as mqtt
import numpy as np
import os
from dotenv import load_dotenv

class ECGDeviceSimulator:
    """Simulates a 3-lead ECG device with realistic signal amplitudes"""

    def __init__(
        self,
        device_id=None,
        broker=None,
        port=None,
        packet_format=None,
        use_tls=None,
        username=None,
        password=None,
        topic_format=None
    ):
        # Load env per object
        load_dotenv()

        # Defaults from ENV if parameters are not provided
        env_broker = os.getenv("MQTT_BROKER", "test.mosquitto.org")
        env_port = int(os.getenv("MQTT_PORT", "1883"))
        env_tls = os.getenv("MQTT_USE_TLS", "false").lower() == "true"
        env_user = os.getenv("MQTT_USERNAME", None)
        env_pass = os.getenv("MQTT_PASSWORD", None)

        # Final assignment (CLI overrides env if passed)
        self.device_id = device_id or "ecg-dev-001"
        self.broker = broker or env_broker
        self.port = port or env_port
        self.packet_format = packet_format or "metrics"
        self.use_tls = env_tls if use_tls is None else use_tls
        self.username = username or env_user
        self.password = password or env_pass
        self.topic_format = topic_format or "production"

        # Topic configuration
        if self.topic_format == "testing":
            self.topic = f"ecg/3lead/{self.device_id}/data"
        elif self.topic_format == "production":
            self.topic = f"raw/ecg/{self.device_id}"
        else:
            self.topic = "ctai/oneject/ecg3lead"

        self.client_id = f"ecg-3lead-{self.device_id}"
        self.client = None
        self.packet_counter = 0
        self.running = False

        # ECG parameters
        self.heart_rate = 75  # BPM
        self.sampling_rate = 100  # Hz
        self.time = 0

        # Proper scaling for ECG amplitude
        self.scale_factor = 400000
    
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"[{self.device_id}] Connected to MQTT broker")
            print(f"[{self.device_id}] Publishing to: {self.topic}")
        else:
            print(f"[{self.device_id}] Connection failed with code {rc}")
    
    def connect(self):
        print(f"[{self.device_id}] Connecting to {self.broker}:{self.port}")
        
        self.client = mqtt.Client(client_id=self.client_id)
        self.client.on_connect = self._on_connect
        
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
            print(f"[{self.device_id}] Using authentication")
        
        if self.use_tls:
            import ssl
            self.client.tls_set(cert_reqs=ssl.CERT_NONE)
            self.client.tls_insecure_set(True)
            print(f"[{self.device_id}] Using TLS (insecure mode)")
        
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
    
    def disconnect(self):
        self.running = False
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
        print(f"[{self.device_id}] Disconnected")
    
    def generate_ecg_sample(self):
        """
        Generate realistic ECG waveform with proper amplitude
        Returns: (lead_I, lead_II, v1) as 32-bit signed integers
        """
        t = self.time
        freq = self.heart_rate / 60.0  # Convert BPM to Hz
        
        # Phase for different heart rate components
        cardiac_cycle = 2 * np.pi * freq * t
        
        # P wave (atrial depolarization) - around 0.08-0.11s
        p_wave = 0.15 * np.sin(cardiac_cycle - np.pi/6)
        
        # QRS complex (ventricular depolarization) - around 0.06-0.10s
        # Q wave (small negative deflection)
        q_wave = -0.1 * np.sin(cardiac_cycle + np.pi/8) if np.sin(cardiac_cycle + np.pi/8) > 0 else 0
        
        # R wave (large positive deflection)
        r_wave = 2.5 * np.exp(-((cardiac_cycle - np.pi/2) % (2*np.pi) - np.pi/2)**2 / 0.02)
        
        # S wave (negative deflection after R)
        s_wave = -0.3 * np.sin(cardiac_cycle + np.pi/3) if cardiac_cycle % (2*np.pi) > np.pi/2 and cardiac_cycle % (2*np.pi) < 3*np.pi/4 else 0
        
        # T wave (ventricular repolarization) - around 0.16s
        t_wave = 0.35 * np.sin(cardiac_cycle + np.pi/2)
        
        # Combine waveforms for Lead II (most prominent)
        lead_ii = p_wave + r_wave + s_wave + t_wave + random.gauss(0, 0.03)
        
        # Lead I (slightly smaller amplitude, different morphology)
        lead_i = 0.8 * (p_wave + 0.7 * r_wave + s_wave + 0.9 * t_wave) + random.gauss(0, 0.02)
        
        # V1 (precordial lead - can show negative QRS)
        v1 = 0.6 * (p_wave - 0.5 * r_wave + 0.8 * s_wave + 0.7 * t_wave) + random.gauss(0, 0.025)
        
        # Add baseline wander (simulates breathing artifact)
        baseline = 0.05 * np.sin(2 * np.pi * 0.3 * t)  # 0.3 Hz breathing rate
        
        lead_i += baseline
        lead_ii += baseline
        v1 += baseline
        
        # Convert to ADC values with proper scaling
        lead_i_adc = int(lead_i * self.scale_factor)
        lead_ii_adc = int(lead_ii * self.scale_factor)
        v1_adc = int(v1 * self.scale_factor)
        
        # Clamp to 32-bit signed integer range
        max_val = 2**31 - 1
        min_val = -(2**31)
        lead_i_adc = max(min_val, min(max_val, lead_i_adc))
        lead_ii_adc = max(min_val, min(max_val, lead_ii_adc))
        v1_adc = max(min_val, min(max_val, v1_adc))
        
        self.time += 1.0 / self.sampling_rate
        
        return lead_i_adc, lead_ii_adc, v1_adc
    
    def create_metrics_packet(self, lead_i, lead_ii, v1):
        """Create 27-byte metrics packet"""
        timestamp_us = int(time.time() * 1_000_000)
        data = struct.pack('<QI3i', timestamp_us, self.packet_counter, lead_i, lead_ii, v1)
        checksum = sum(data) & 0xFF
        packet = struct.pack('<B', 0x02) + data + struct.pack('<BB', checksum, 0x03)
        self.packet_counter += 1
        return packet
    
    def create_legacy_packet(self, lead_i, lead_ii, v1):
        """Create 15-byte legacy packet"""
        data = struct.pack('<3i', lead_i, lead_ii, v1)
        checksum = sum(data) & 0xFF
        packet = struct.pack('<B', 0x02) + data + struct.pack('<BB', checksum, 0x03)
        return packet
    
    def start_streaming(self, duration=None):
        """Start streaming ECG data"""
        self.running = True
        start_time = time.time()
        samples_sent = 0
        
        print(f"[{self.device_id}] Starting ECG stream ({self.packet_format} format)")
        print(f"[{self.device_id}] Heart Rate: {self.heart_rate} BPM")
        print(f"[{self.device_id}] Sampling Rate: {self.sampling_rate} Hz")
        print(f"[{self.device_id}] Scale Factor: {self.scale_factor}")
        
        interval = 1.0 / self.sampling_rate
        next_sample_time = start_time
        
        try:
            while self.running:
                current_time = time.time()
                
                if duration and (current_time - start_time) >= duration:
                    break
                
                if current_time >= next_sample_time:
                    lead_i, lead_ii, v1 = self.generate_ecg_sample()
                    
                    # Debug output every 100 samples
                    if samples_sent % 100 == 0 and samples_sent > 0:
                        print(f"[{self.device_id}] Sample {samples_sent}: Lead II = {lead_ii:+8d} "
                              f"(range: ~±{int(2.5 * self.scale_factor)})")
                    
                    if self.packet_format == "metrics":
                        packet = self.create_metrics_packet(lead_i, lead_ii, v1)
                    else:
                        packet = self.create_legacy_packet(lead_i, lead_ii, v1)
                    
                    result = self.client.publish(self.topic, packet)
                    
                    if result.rc != 0:
                        print(f"[{self.device_id}] Warning: Publish failed with code {result.rc}")
                    
                    samples_sent += 1
                    next_sample_time += interval
                else:
                    sleep_time = next_sample_time - current_time
                    if sleep_time > 0:
                        time.sleep(min(sleep_time, 0.001))
        
        except KeyboardInterrupt:
            print(f"\n[{self.device_id}] Interrupted by user")
        except Exception as e:
            print(f"[{self.device_id}] Error during streaming: {e}")
            import traceback
            traceback.print_exc()
        finally:
            elapsed = time.time() - start_time
            rate = samples_sent / elapsed if elapsed > 0 else 0
            print(f"[{self.device_id}] Stream ended. Total: {samples_sent} samples in {elapsed:.2f}s (avg rate: {rate:.1f} Hz)")

import os
import argparse
from dotenv import load_dotenv
import time

class ECGDeviceSimulator:
    """Simulates a 3-lead ECG device with realistic signal amplitudes"""

    def __init__(
        self,
        device_id=None,
        broker=None,
        port=None,
        packet_format=None,
        use_tls=None,
        username=None,
        password=None,
        topic_format=None
    ):
        # Load env per object
        load_dotenv()

        # Defaults from ENV if parameters are not provided
        env_broker = os.getenv("MQTT_BROKER", "test.mosquitto.org")
        env_port = int(os.getenv("MQTT_PORT", "1883"))
        env_tls = os.getenv("MQTT_USE_TLS", "false").lower() == "true"
        env_user = os.getenv("MQTT_USERNAME", None)
        env_pass = os.getenv("MQTT_PASSWORD", None)

        # Final assignment (CLI overrides env if passed)
        self.device_id = device_id or "ecg-dev-001"
        self.broker = broker or env_broker
        self.port = port or env_port
        self.packet_format = packet_format or "metrics"
        self.use_tls = env_tls if use_tls is None else use_tls
        self.username = username or env_user
        self.password = password or env_pass
        self.topic_format = topic_format or "production"

        # Topic configuration
        if self.topic_format == "testing":
            self.topic = f"ecg/3lead/{self.device_id}/data"
        elif self.topic_format == "production":
            self.topic = f"raw/ecg/{self.device_id}"
        else:
            self.topic = "ctai/oneject/ecg3lead"

        self.client_id = f"ecg-3lead-{self.device_id}"
        self.client = None
        self.packet_counter = 0
        self.running = False

        # ECG parameters
        self.heart_rate = 75  # BPM
        self.sampling_rate = 100  # Hz
        self.time = 0

        # Proper scaling for ECG amplitude
        self.scale_factor = 400000


def main():
    # TEMP INSTANCE TO LOAD DEFAULTS FROM .env
    default_cfg = ECGDeviceSimulator()

    parser = argparse.ArgumentParser(description="ECG Device Simulator (Realistic Amplitudes)")

    parser.add_argument("--device-id", type=str, default=default_cfg.device_id)
    parser.add_argument("--broker", type=str, default=default_cfg.broker)
    parser.add_argument("--port", type=int, default=default_cfg.port)
    parser.add_argument("--format", choices=["metrics", "legacy"], default=default_cfg.packet_format)
    parser.add_argument("--duration", type=int, default=None)
    parser.add_argument("--heart-rate", type=int, default=default_cfg.heart_rate)
    parser.add_argument("--use-tls", action="store_true", default=default_cfg.use_tls)
    parser.add_argument("--no-tls", action="store_false", dest="use_tls")
    parser.add_argument("--username", type=str, default=default_cfg.username)
    parser.add_argument("--password", type=str, default=default_cfg.password)
    parser.add_argument("--topic-format", choices=["testing", "production", "legacy"], 
                        default=default_cfg.topic_format)
    parser.add_argument("--scale", type=int, default=default_cfg.scale_factor)

    args = parser.parse_args()

    # Create simulator with final parameters
    simulator = ECGDeviceSimulator(
        device_id=args.device_id,
        broker=args.broker,
        port=args.port,
        packet_format=args.format,
        use_tls=args.use_tls,
        username=args.username,
        password=args.password,
        topic_format=args.topic_format
    )

    simulator.heart_rate = args.heart_rate
    simulator.scale_factor = args.scale

    print("\n" + "=" * 60)
    print("ECG Device Simulator - Realistic Signal Amplitudes")
    print("=" * 60)
    print(f"Device ID:         {simulator.device_id}")
    print(f"Heart Rate:        {args.heart_rate} BPM")
    print(f"Amplitude (peak):  ±{int(2.5 * args.scale)}")
    print("=" * 60 + "\n")

    simulator.connect()
    time.sleep(2)
    simulator.start_streaming(duration=args.duration)
    simulator.disconnect()


if __name__ == "__main__":
    main()
