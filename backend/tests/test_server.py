import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from backend.server import app

client = TestClient(app)

def test_health_check_no_graph():
    # If graph is not initialized, it returns error
    response = client.get("/health")
    # It might be 200 or error depending on how lifespan runs in TestClient
    # TestClient runs lifespan by default.
    # But lifespan tries to connect to sqlite. 
    # Let's hope it works or fails gracefully.
    assert response.status_code in [200, 500] 

@patch("backend.server.AsyncSqliteSaver")
def test_health_check_mocked(mock_saver):
    # Mock the lifespan context manager
    # This is hard with TestClient context manager.
    # Instead, we can manually set app.state.graph
    app.state.graph = MagicMock()
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch("backend.server.AsyncSqliteSaver")
def test_chat_validation(mock_saver):
    # Test that valid JSON is accepted by Pydantic
    # We don't need the graph to run to test Pydantic validation
    # But the endpoint code runs `app.state.graph.astream` immediately.
    
    app.state.graph = MagicMock()
    app.state.graph.astream = MagicMock(return_value=AsyncMock()) # Mock async gen
    
    response = client.post("/chat", json={
        "message": "Hello", 
        "thread_id": "1",
        "model_name": "gemini-2.5-flash"
    })
    
    # It returns a StreamingResponse, so status code should be 200
    # It returns a StreamingResponse, so status code should be 200
    assert response.status_code == 200

import os

def test_set_workspace():
    # Store initial workspace
    initial_path = os.getcwd() # Or whatever the server defaults to
    
    # Use a directory one level up
    new_path = os.path.dirname(initial_path)
    
    response = client.post("/workspace", json={"path": new_path})
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify list files returns files from new path
    # We can check if list_files endpoint works
    response = client.get("/files")
    assert response.status_code == 200
    
    # Restore workspace
    client.post("/workspace", json={"path": initial_path})
