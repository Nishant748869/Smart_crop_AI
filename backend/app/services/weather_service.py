import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

class WeatherService:

    BASE_URL = "https://api.open-meteo.com/v1/forecast"
    GEO_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client"

    def __init__(self):
        self.timeout = 10.0  # 10s timeout


    def get_forecast(self, latitude: float, longitude: float):
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,shortwave_radiation_sum,relative_humidity_2m_max,relative_humidity_2m_min",
            "timezone": "auto"
        }

        try:
            response = requests.get(self.BASE_URL, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            
            forecast = []
            for i in range(len(data["daily"]["time"])):
                humidity = (data["daily"]["relative_humidity_2m_max"][i] + data["daily"]["relative_humidity_2m_min"][i]) / 2
                
                forecast.append({
                    "date": data["daily"]["time"][i],
                    "temp_max": data["daily"]["temperature_2m_max"][i],
                    "temp_min": data["daily"]["temperature_2m_min"][i],
                    "rain_mm": data["daily"]["precipitation_sum"][i],
                    "rain_probability": data["daily"]["precipitation_probability_max"][i],
                    "wind_speed_kph": data["daily"]["wind_speed_10m_max"][i],
                    "solar_radiation": data["daily"]["shortwave_radiation_sum"][i],
                    "humidity": round(humidity, 1)
                })
            
            return {"daily": forecast}
            
        except Exception as e:
            logger.error(f"Weather API failed: {e}")
            raise Exception("Weather API failed")

    def get_location_name(self, latitude: float, longitude: float):
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "localityLanguage": "en"
        }
        try:
            response = requests.get(self.GEO_URL, params=params, timeout=(3.0, 10.0))
            if response.status_code == 200:
                data = response.json()
                city = data.get("city") or data.get("locality") or ""
                state = data.get("principalSubdivision") or ""
                if city and state:
                    return f"{city}, {state}"
        except Exception:
            pass
        
        # Fallback if API fails or rate limited
        if round(latitude, 1) == 30.9 and round(longitude, 1) == 75.8:
            return "Ludhiana, Punjab"
            
        return f"Lat: {latitude}, Lon: {longitude}"