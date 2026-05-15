import requests

url = "http://127.0.0.1:8000/api/v1/weather-analysis"
payload = {
    "latitude": None,
    "longitude": None,
    "crop": "wheat",
    "sowing_date": "",
    "last_irrigation_date": ""
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.json())
