import requests

url = "http://127.0.0.1:8000/api/v1/weather-analysis"
payload = {
    "latitude": 30.9,
    "longitude": 75.8,
    "crop": "wheat",
    "sowing_date": "2023-11-01",
    "last_irrigation_date": "2024-01-01"
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.json())
