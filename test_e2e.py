import requests
import sqlite3
import time
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

print("--- 1. Testing Send OTP ---")
res = requests.post(f"{BASE_URL}/auth/send-otp", json={"phone_number": "+919988776655"})
print("Status:", res.status_code)
print("Response:", res.json())
assert res.status_code == 200

print("\n--- 2. Testing Verify OTP (Registration) ---")
res = requests.post(f"{BASE_URL}/auth/verify-otp", json={
    "phone_number": "+919988776655", 
    "otp": "1234",
    "lat": 30.9,
    "lon": 75.8,
    "crop": "wheat",
    "sowing_date": "2023-11-01"
})
print("Status:", res.status_code)
print("Response:", res.json())
assert res.status_code == 200
farmer_id = res.json()["farmer_id"]

print("\n--- 3. Testing Weather Analysis Prediction ---")
res = requests.post(f"{BASE_URL}/weather-analysis", json={
    "latitude": 30.9,
    "longitude": 75.8,
    "crop": "wheat",
    "sowing_date": "2023-11-01",
    "last_irrigation_date": "2023-11-20"
})
print("Status:", res.status_code)
data = res.json()
print("Recommendation Status:", data.get("irrigation_recommendation", {}).get("required"))
assert res.status_code == 200

print("\n--- 4. Testing Daily Soil Logging ---")
res = requests.post(f"{BASE_URL}/soil/log-daily", json={
    "farmer_id": farmer_id,
    "date": "2024-03-01",
    "soil_water_mm": data["irrigation_recommendation"]["current_water_mm"],
    "etc_mm": data["irrigation_recommendation"]["etc_mm_per_day"],
    "rain_mm": 0,
    "irrigation_mm": 0
})
print("Status:", res.status_code)
print("Response:", res.json())
assert res.status_code == 200

print("\n--- 5. Verifying Database Integrity ---")
conn = sqlite3.connect("smart_crop.db")
cursor = conn.cursor()
cursor.execute("SELECT * FROM farmers WHERE id = ?", (farmer_id,))
farmer = cursor.fetchone()
print(f"Farmer DB Record: {farmer}")
assert farmer is not None

cursor.execute("SELECT * FROM daily_soil_status WHERE farmer_id = ?", (farmer_id,))
log = cursor.fetchone()
print(f"Soil Log DB Record: {log}")
assert log is not None

print("\n✅ All End-to-End Tests Passed Successfully!")
