from fastapi import APIRouter
from datetime import datetime
from app.services.weather_service import WeatherService
from app.services.prediction_service import (
    get_rain_probability_next_3_days,
    next_rain_day,
    get_max_temperature_next_7_days,
    get_heat_stress_risk,
    get_irrigation_recommendation
)
from app.services.soil_service import get_soil_properties

router = APIRouter()

weather_service = WeatherService()

def calculate_days_ago(date_str: str) -> int:
    if not date_str:
        return 0
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        return (datetime.now() - date_obj).days
    except ValueError:
        return 0

@router.post("/weather-analysis")
def weather_analysis(payload: dict):

    latitude = payload["latitude"]
    longitude = payload["longitude"]
    
    # Farmer inputs
    crop_type = payload.get("crop", "wheat")
    sowing_date = payload.get("sowing_date", "")
    last_irri_date = payload.get("last_irrigation_date", "")
    
    days_since_sowing = calculate_days_ago(sowing_date)
    days_since_last_irri = calculate_days_ago(last_irri_date)

    forecast = weather_service.get_forecast(latitude, longitude)
    location = weather_service.get_location_name(latitude, longitude)
    soil_profile = get_soil_properties(latitude, longitude)

    result = {
        "location": location,
        "soil_type": soil_profile.texture_class,
        "rain_probability_next_3_days": get_rain_probability_next_3_days(forecast),
        "next_rain_expected_on": next_rain_day(forecast),
        "max_temperature_next_7_days": get_max_temperature_next_7_days(forecast),
        "heat_stress_risk": get_heat_stress_risk(forecast),
        "irrigation_recommendation": get_irrigation_recommendation(
            forecast_data=forecast,
            crop_type=crop_type,
            days_since_sowing=days_since_sowing,
            days_since_last_irri=days_since_last_irri,
            latitude=latitude,
            longitude=longitude
        )
    }

    return result