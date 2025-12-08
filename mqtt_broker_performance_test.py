"""
MQTT Broker Performance Tester
Tests latency, throughput, and reliability of MQTT brokers
"""
import time
import paho.mqtt.client as mqtt
import statistics
import argparse
import os
from dotenv import load_dotenv

class BrokerTester:
    def __init__(self, broker=None, port=None, use_tls=None, username=None, password=None):
        # Load .env once per object
        load_dotenv()

        # Defaults from ENV
        env_broker = os.getenv("MQTT_BROKER", "test.mosquitto.org")
        env_port = int(os.getenv("MQTT_PORT", "1883"))
        env_tls = os.getenv("MQTT_USE_TLS", "false").lower() == "true"
        env_user = os.getenv("MQTT_USERNAME", None)
        env_pass = os.getenv("MQTT_PASSWORD", None)

        # Override only if CLI passes something
        self.broker = broker or env_broker
        self.port = port or env_port
        self.use_tls = env_tls if use_tls is None else use_tls
        self.username = username or env_user
        self.password = password or env_pass

        # Others
        self.connect_time = None
        self.latencies = []
        self.publish_times = []
        self.received_count = 0
        self.sent_count = 0
        
    def on_connect(self, client, userdata, flags, rc, properties=None):
        self.connect_time = time.time()
        if rc == 0:
            print(f"✓ Connected to {self.broker}:{self.port}")
            # Subscribe to test topic
            client.subscribe("test/latency/#")
        else:
            print(f"✗ Connection failed with code {rc}")
    
    def on_message(self, client, userdata, msg):
        """Calculate round-trip latency"""
        try:
            sent_time = float(msg.payload.decode())
            latency = (time.time() - sent_time) * 1000  # Convert to ms
            self.latencies.append(latency)
            self.received_count += 1
        except:
            pass
    
    def test_connection_time(self):
        """Test how long it takes to establish connection"""
        print("\n" + "="*60)
        print("TEST 1: Connection Time")
        print("="*60)
        
        try:
            client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        except TypeError:
            client = mqtt.Client()
        
        if self.username and self.password:
            client.username_pw_set(self.username, self.password)
        
        if self.use_tls:
            import ssl
            client.tls_set(cert_reqs=ssl.CERT_NONE)
            client.tls_insecure_set(True)
        
        start = time.time()
        try:
            client.connect(self.broker, self.port, 60)
            client.loop_start()
            
            # Wait for connection
            timeout = 10
            elapsed = 0
            while not client.is_connected() and elapsed < timeout:
                time.sleep(0.1)
                elapsed = time.time() - start
            
            if client.is_connected():
                conn_time = (time.time() - start) * 1000
                print(f"Connection established in: {conn_time:.2f} ms")
                
                if conn_time < 100:
                    print("✓ Excellent connection time")
                elif conn_time < 500:
                    print("⚠ Acceptable connection time")
                elif conn_time < 1000:
                    print("⚠ Slow connection time")
                else:
                    print("✗ Very slow connection time - possible network issues")
                
                client.loop_stop()
                client.disconnect()
                return True
            else:
                print(f"✗ Connection timeout after {timeout}s")
                return False
        except Exception as e:
            print(f"✗ Connection error: {e}")
            return False
    
    def test_publish_latency(self, num_messages=100):
        """Test publish latency (time to send message)"""
        print("\n" + "="*60)
        print("TEST 2: Publish Latency")
        print("="*60)
        
        try:
            client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        except TypeError:
            client = mqtt.Client()
        
        if self.username and self.password:
            client.username_pw_set(self.username, self.password)
        
        if self.use_tls:
            import ssl
            client.tls_set(cert_reqs=ssl.CERT_NONE)
            client.tls_insecure_set(True)
        
        try:
            client.connect(self.broker, self.port, 60)
            client.loop_start()
            time.sleep(2)
            
            publish_times = []
            failures = 0
            
            print(f"Publishing {num_messages} test messages...")
            
            for i in range(num_messages):
                start = time.time()
                result = client.publish("test/performance", f"test_{i}", qos=0)
                pub_time = (time.time() - start) * 1000
                
                if result.rc == 0:
                    publish_times.append(pub_time)
                else:
                    failures += 1
                
                if i % 25 == 0 and i > 0:
                    avg = statistics.mean(publish_times[-25:]) if publish_times else 0
                    print(f"  Progress: {i}/{num_messages} - Avg: {avg:.2f}ms")
                
                time.sleep(0.01)  # 100 Hz
            
            client.loop_stop()
            client.disconnect()
            
            if publish_times:
                avg_latency = statistics.mean(publish_times)
                min_latency = min(publish_times)
                max_latency = max(publish_times)
                p95_latency = sorted(publish_times)[int(len(publish_times) * 0.95)]
                
                print(f"\nPublish Performance:")
                print(f"  Average: {avg_latency:.2f} ms")
                print(f"  Min: {min_latency:.2f} ms")
                print(f"  Max: {max_latency:.2f} ms")
                print(f"  P95: {p95_latency:.2f} ms")
                print(f"  Failures: {failures}/{num_messages} ({failures/num_messages*100:.1f}%)")
                
                if avg_latency < 10:
                    print("✓ Excellent publish latency")
                elif avg_latency < 50:
                    print("⚠ Acceptable publish latency")
                elif avg_latency < 100:
                    print("⚠ High publish latency - may affect 100Hz streaming")
                else:
                    print("✗ Very high publish latency - NOT suitable for 100Hz")
                
                return True
            else:
                print("✗ All publishes failed")
                return False
                
        except Exception as e:
            print(f"✗ Test error: {e}")
            return False
    
    def test_round_trip_latency(self, num_messages=50):
        """Test round-trip latency (publish + receive)"""
        print("\n" + "="*60)
        print("TEST 3: Round-Trip Latency")
        print("="*60)
        
        self.latencies = []
        self.received_count = 0
        self.sent_count = 0
        
        try:
            client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        except TypeError:
            client = mqtt.Client()
        
        client.on_connect = self.on_connect
        client.on_message = self.on_message
        
        if self.username and self.password:
            client.username_pw_set(self.username, self.password)
        
        if self.use_tls:
            import ssl
            client.tls_set(cert_reqs=ssl.CERT_NONE)
            client.tls_insecure_set(True)
        
        try:
            client.connect(self.broker, self.port, 60)
            client.loop_start()
            time.sleep(2)
            
            print(f"Sending {num_messages} messages to measure round-trip...")
            
            for i in range(num_messages):
                timestamp = str(time.time())
                client.publish("test/latency/ping", timestamp, qos=0)
                self.sent_count += 1
                
                if i % 10 == 0 and i > 0:
                    print(f"  Progress: {i}/{num_messages}")
                
                time.sleep(0.1)
            
            # Wait for responses
            time.sleep(2)
            
            client.loop_stop()
            client.disconnect()
            
            if self.latencies:
                avg_rtt = statistics.mean(self.latencies)
                min_rtt = min(self.latencies)
                max_rtt = max(self.latencies)
                p95_rtt = sorted(self.latencies)[int(len(self.latencies) * 0.95)]
                packet_loss = (1 - self.received_count / self.sent_count) * 100
                
                print(f"\nRound-Trip Performance:")
                print(f"  Average RTT: {avg_rtt:.2f} ms")
                print(f"  Min RTT: {min_rtt:.2f} ms")
                print(f"  Max RTT: {max_rtt:.2f} ms")
                print(f"  P95 RTT: {p95_rtt:.2f} ms")
                print(f"  Packet Loss: {packet_loss:.1f}% ({self.received_count}/{self.sent_count})")
                
                if avg_rtt < 50 and packet_loss < 1:
                    print("✓ Excellent round-trip performance")
                elif avg_rtt < 200 and packet_loss < 5:
                    print("⚠ Acceptable performance")
                elif avg_rtt < 500 and packet_loss < 10:
                    print("⚠ Poor performance - may cause issues")
                else:
                    print("✗ Very poor performance - NOT recommended")
                
                return True
            else:
                print("✗ No responses received")
                return False
                
        except Exception as e:
            print(f"✗ Test error: {e}")
            return False
    
    def test_throughput(self, duration=10):
        """Test maximum throughput (messages per second)"""
        print("\n" + "="*60)
        print("TEST 4: Throughput Test")
        print("="*60)
        
        try:
            client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        except TypeError:
            client = mqtt.Client()
        
        if self.username and self.password:
            client.username_pw_set(self.username, self.password)
        
        if self.use_tls:
            import ssl
            client.tls_set(cert_reqs=ssl.CERT_NONE)
            client.tls_insecure_set(True)
        
        try:
            client.connect(self.broker, self.port, 60)
            client.loop_start()
            time.sleep(2)
            
            print(f"Sending maximum messages for {duration} seconds...")
            
            sent = 0
            failures = 0
            start = time.time()
            last_report = start
            
            # 27-byte packet similar to ECG data
            payload = b'\x02' + b'\x00' * 24 + b'\x00\x03'
            
            while time.time() - start < duration:
                result = client.publish("test/throughput", payload, qos=0)
                if result.rc == 0:
                    sent += 1
                else:
                    failures += 1
                
                # Report every second
                if time.time() - last_report >= 1.0:
                    elapsed = time.time() - start
                    rate = sent / elapsed
                    print(f"  {elapsed:.0f}s: {rate:.0f} msg/s")
                    last_report = time.time()
            
            client.loop_stop()
            client.disconnect()
            
            elapsed = time.time() - start
            throughput = sent / elapsed
            failure_rate = failures / (sent + failures) * 100 if sent + failures > 0 else 0
            
            print(f"\nThroughput Results:")
            print(f"  Total sent: {sent}")
            print(f"  Duration: {elapsed:.2f}s")
            print(f"  Throughput: {throughput:.0f} msg/s")
            print(f"  Failures: {failures} ({failure_rate:.2f}%)")
            
            if throughput >= 100 and failure_rate < 1:
                print("✓ Excellent - Can handle 100Hz ECG streaming")
            elif throughput >= 80 and failure_rate < 5:
                print("⚠ Acceptable - May have occasional drops")
            elif throughput >= 50:
                print("⚠ Poor - Will struggle with 100Hz")
            else:
                print("✗ Insufficient - Cannot handle ECG streaming")
            
            return True
            
        except Exception as e:
            print(f"✗ Test error: {e}")
            return False
    
    def run_all_tests(self):
        """Run complete diagnostic suite"""
        print("\n" + "="*60)
        print(f"MQTT Broker Performance Test")
        print(f"Broker: {self.broker}:{self.port}")
        print(f"TLS: {'Enabled' if self.use_tls else 'Disabled'}")
        print(f"Auth: {'Yes' if self.username else 'No'}")
        print("="*60)
        
        results = []
        
        # Test 1: Connection
        results.append(("Connection", self.test_connection_time()))
        time.sleep(1)
        
        # Test 2: Publish Latency
        results.append(("Publish Latency", self.test_publish_latency(100)))
        time.sleep(1)
        
        # Test 3: Round-Trip
        results.append(("Round-Trip", self.test_round_trip_latency(50)))
        time.sleep(1)
        
        # Test 4: Throughput
        results.append(("Throughput", self.test_throughput(10)))
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        for test_name, passed in results:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"{test_name:20s}: {status}")
        
        all_passed = all(r[1] for r in results)
        print("="*60)
        if all_passed:
            print("✓ Broker is suitable for ECG streaming")
        else:
            print("⚠ Broker may have issues - consider alternatives")
        print("="*60)

def main():
    # Instantiate once just to read defaults
    default_cfg = BrokerTester()

    parser = argparse.ArgumentParser(description='MQTT Broker Performance Tester')
    parser.add_argument('--broker', type=str, default=default_cfg.broker)
    parser.add_argument('--port', type=int, default=default_cfg.port)
    parser.add_argument('--use-tls', action='store_true', default=default_cfg.use_tls)
    parser.add_argument('--no-tls', action='store_false', dest='use_tls')
    parser.add_argument('--username', type=str, default=default_cfg.username)
    parser.add_argument('--password', type=str, default=default_cfg.password)

    args = parser.parse_args()

    tester = BrokerTester(
        broker=args.broker,
        port=args.port,
        use_tls=args.use_tls,
        username=args.username,
        password=args.password
    )

    tester.run_all_tests()


if __name__ == "__main__":
    main()