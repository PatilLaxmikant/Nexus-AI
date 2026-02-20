import pytest
from backend.core_tools import calculate, get_time, get_weather
from unittest.mock import patch, MagicMock

def test_calculate_simple():
    assert calculate("2 + 2") == "4"

def test_calculate_complex():
    assert calculate("min(10, 5)") == "5"

def test_calculate_error():
    assert "Error" in calculate("2 / 0")

def test_get_time():
    # Just check if it returns a string with date format
    t = get_time()
    assert isinstance(t, str)
    assert ":" in t
    assert "-" in t

@patch("backend.core_tools.requests.get")
def test_get_weather_success(mock_get):
    # Mock successful response
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "Sunny, 25°C"
    mock_get.return_value = mock_resp

    result = get_weather("London")
    assert "Sunny, 25°C" in result
    assert "London" in result

@patch("backend.core_tools.requests.get")
def test_get_weather_failure(mock_get):
    # Mock failure response
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_get.return_value = mock_resp

    result = get_weather("InvalidCity")
    assert "Error" in result
