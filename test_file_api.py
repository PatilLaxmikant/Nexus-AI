import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"

def test_list_files():
    print("Testing /files...")
    try:
        response = requests.get(f"{BASE_URL}/files")
        if response.status_code == 200:
            files = response.json()
            print(f"Success! Found {len(files)} top-level items.")
            # Print first few items to verify structure
            print(json.dumps(files[:2], indent=2))
        else:
            print(f"Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_write_and_read():
    print("\nTesting /write and /read...")
    test_file = "test_vibe.txt"
    content = "Hello from Vibe Coding Platform!"
    
    # Write
    try:
        response = requests.post(f"{BASE_URL}/write", json={"path": test_file, "content": content})
        if response.status_code == 200:
            print("Write Success!")
        else:
            print(f"Write Failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"Write Error: {e}")
        return

    # Read
    try:
        response = requests.get(f"{BASE_URL}/read", params={"path": test_file})
        if response.status_code == 200:
            read_content = response.json().get("content")
            if read_content == content:
                print("Read Success! Content matches.")
            else:
                print(f"Read Failed: Content mismatch. Got '{read_content}'")
        else:
            print(f"Read Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Read Error: {e}")
        
    # Cleanup
    if os.path.exists(test_file):
        os.remove(test_file)
        print("Cleanup done.")

if __name__ == "__main__":
    test_list_files()
    test_write_and_read()
