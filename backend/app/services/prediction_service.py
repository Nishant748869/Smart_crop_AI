def get_rain_probability_next_3_days(forecast_data):
    probs = [day["rain_probability"] for day in forecast_data["daily"][:3]]
    max_prob = max(probs) if probs else 0
    return max_prob


def next_rain_day(forecast_data):
    # forecast_data["daily"] contains dates in chronological order (Today, Tomorrow, ...)
    # [1:] skips index 0 (today) and only loops exactly over the strictly *future* dates.
    RAIN_ALERT_THRESHOLD = 40
    for day in forecast_data["daily"][1:]:
        if day["rain_probability"] >=RAIN_ALERT_THRESHOLD:
            return day["date"]

    return None


def get_max_temperature_next_7_days(forecast_data):
    temps = [day["temp_max"] for day in forecast_data["daily"]]
    return max(temps) if temps else 0


def get_heat_stress_risk(forecast_data):
    max_temp = get_max_temperature_next_7_days(forecast_data)
    threshold = 38
    
    if max_temp > threshold:
        level = "High"
    elif max_temp >= 32 and max_temp <= threshold:
        level = "Moderate"
    else:
        level = "Low"
        
    return {
        "level": level,
        "max_temp_detected": max_temp,
        "threshold_used": threshold
    }


from backend.app.services.et_service import calculate_et0, calculate_etc
from backend.app.services.soil_service import get_soil_properties
from backend.app.services.water_balance_service import WaterBalanceService
from backend.app.models.irrigation_models import IrrigationDecision

def get_irrigation_recommendation(
    forecast_data: dict,
    crop_type: str,
    days_since_sowing: int,
    days_since_last_irri: int,
    latitude: float,
    longitude: float
) -> dict:
    # Look ahead rainfall protection
    rain_next_2_days = sum([day["rain_mm"] for day in forecast_data["daily"][:2]])
    max_temp = get_max_temperature_next_7_days(forecast_data)
    heat_stress_info = get_heat_stress_risk(forecast_data)
    
    # 1. Weather processing for ET0
    today_forecast = forecast_data["daily"][0]
    weather_dict = {
        "t_max": today_forecast["temp_max"],
        "t_min": today_forecast["temp_min"],
        "humidity": today_forecast["humidity"],
        "wind_speed": today_forecast["wind_speed_kph"] * 0.27778, # Convert km/h to m/s
        "solar_radiation": today_forecast["solar_radiation"] 
    }
    
    # 2. Evapotranspiration
    et0 = calculate_et0(weather_dict)
    etc_data = calculate_etc(crop_type, days_since_sowing, et0)
    etc_mm = etc_data["ETc_mm_per_day"]
    
    # 3. Dynamic Soil properties
    soil_profile = get_soil_properties(latitude, longitude)
    taw_mm = soil_profile.total_available_water_mm
    
    # Simulate past depletion based on single-shot data
    # (In a stateful DB design, this would be fetched from yesterday's row)
    cumulative_loss = etc_mm * max(0, days_since_last_irri)
    prev_soil_water = max(0.0, taw_mm - cumulative_loss)
    
    # 4. Water Balance Engine calculation
    decision: IrrigationDecision = WaterBalanceService.calculate_daily_balance(
        previous_soil_water_mm=prev_soil_water,
        etc_mm=etc_mm,
        rainfall_mm=rain_next_2_days, 
        irrigation_mm=0.0,
        total_available_water_mm=taw_mm,
        depletion_threshold_pct=50.0  # Common trigger
    )
    
    # 5. Overrides for extreme weather
    if max_temp >= heat_stress_info["threshold_used"] and not decision.required:
        decision.required = True
        decision.urgency_level = "High"
        decision.reason = "Temperature critically high, inducing heat stress. Irrigation required despite moisture level."
        
    return {
        "required": decision.required,
        "urgency_level": decision.urgency_level,
        "reason": decision.reason,
        "soil_texture": soil_profile.texture_class,
        "soil_taw_mm": taw_mm,
        "depletion_pct": decision.depletion_pct,
        "current_water_mm": decision.new_soil_water_mm,
        "etc_mm_per_day": etc_mm,
        "stage": etc_data["stage"]
    }



class PredictionEngine:
    """Placeholder class to satisfy scheduler_service imports until fully implemented."""
    def __init__(self):
        pass
class PredictionEngine:
    """"""
    pass
