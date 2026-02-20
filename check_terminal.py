import asyncio
import websockets
import sys

async def test_terminal():
    uri = "ws://localhost:8000/ws/terminal"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            
            # Send a simple command
            cmd = "echo 'Hello Terminal'"
            if sys.platform == "win32":
                cmd = "Write-Output 'Hello Terminal'"
            
            print(f"Sending: {cmd}")
            await websocket.send(cmd + "\n")
            
            # Wait for response
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    print(f"Received: {response!r}")
                    if "Hello Terminal" in response:
                        print("SUCCESS: Received expected output")
                        break
            except asyncio.TimeoutError:
                print("Timeout waiting for response")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(test_terminal())
    except ImportError:
        print("websockets library not found. Please install it to run this test.")
