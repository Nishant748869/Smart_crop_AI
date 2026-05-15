import requests
print("Testing OpenMeteo...")
try:
    r = requests.get("https://api.open-meteo.com/v1/forecast?latitude=30.9&longitude=75.8&daily=temperature_2m_max", timeout=(2.0, 5.0))
    print(f"OpenMeteo SUCCESS: {r.status_code}")
except Exception as e:
    print(f"OpenMeteo FAILED: {type(e).__name__} - {e}")
    
print("Testing ISRIC SoilGrids...")
try:
    r = requests.get("https://rest.isric.org/soilgrids/v2.0/properties/query?lon=75.8&lat=30.9&property=sand&depth=0-5cm&value=mean", timeout=(2.0, 5.0))
    print(f"ISRIC SUCCESS: {r.status_code}")
except Exception as e:
    print(f"ISRIC FAILED: {type(e).__name__} - {e}")
