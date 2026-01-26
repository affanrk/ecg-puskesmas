import asyncio
import sys
import os
from datetime import datetime
import aiomqtt
import orjson

# Add the backend directory to sys.path to allow imports from core
# Assuming this script is in backend/helper/
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

try:
    from core.config import settings
except ImportError:
    print("Warning: Could not import settings from core.config. Using fallback configuration.")
    class Settings:
        MQTT_BROKER = "103.183.75.251"
        MQTT_PORT = 1883
        MQTT_USERNAME = "admin"
        MQTT_PASSWORD = "ecgctai"
        MQTT_USE_TLS = False
    settings = Settings()

async def listen():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Connecting to MQTT Broker at {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
    
    conn_params = {
        "hostname": settings.MQTT_BROKER,
        "port": settings.MQTT_PORT,
        "username": settings.MQTT_USERNAME,
        "password": settings.MQTT_PASSWORD,
    }

    if settings.MQTT_USE_TLS:
         import ssl
         ctx = ssl.create_default_context()
         ctx.check_hostname = False
         ctx.verify_mode = ssl.CERT_NONE
         conn_params["tls_context"] = ctx

    try:
        async with aiomqtt.Client(**conn_params) as client:
            topic = "raw/ecg/+"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Connected. Subscribing to '{topic}'...")
            await client.subscribe(topic)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Subscribed successfully. Listening for messages... (Press Ctrl+C to stop)")

            async for message in client.messages:
                payload_len = len(message.payload)
                timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                
                try:
                    # Try to decode as JSON for better readability
                    data = orjson.loads(message.payload)
                    cnt = data.get('counter', data.get('cnt', 'N/A'))

                    # Create a summarized version if it's too long
                    data_str = str(data)
                    if len(data_str) > 200:
                        data_str = data_str[:200] + "..."
                    
                    print(f"[{timestamp}] Cnt: {str(cnt):<8} | Topic: {str(message.topic):<20} | Size: {payload_len:<5} | Data: {data_str}")
                except Exception:
                    # If decoding fails, print raw repr
                    print(f"[{timestamp}] Cnt: {'?':<8} | Topic: {str(message.topic):<20} | Size: {payload_len:<5} | Raw: {message.payload!r}")

    except aiomqtt.MqttError as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] MQTT Error: {e}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Unexpected Error: {e}")

if __name__ == "__main__":
    try:
        # Windows specific event loop policy fix
        if sys.platform == 'win32':
             asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        asyncio.run(listen())
    except KeyboardInterrupt:
        print("\nStopped by user.")
