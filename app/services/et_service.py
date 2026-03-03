from app.utils.penman_monteith import calculate_eto
from app.services.crop_service import CropService
from app.models.weather_models import WeatherData

def calculate_et0(weather_data: dict, elevation: float = 250.0) -> float:
    """
    Core function for computing Reference Evapotranspiration (ETo).
    Currently delegates to the penman_monteith util math engine.
    Structure supports future upgrades to full FAO-56 math if required.
    """
    return calculate_eto(
        t_max=weather_data.get("t_max", 30.0),
        t_min=weather_data.get("t_min", 20.0),
        humidity=weather_data.get("humidity", 50.0),
        wind_speed=weather_data.get("wind_speed", 2.0),
        solar_radiation=weather_data.get("solar_radiation", 15.0),
        elevation=elevation
    )

def calculate_etc(crop_name: str, days_since_sowing: int, et0: float) -> dict:
    """
    Calculates Crop Evapotranspiration (ETc) by compounding
    the Reference ETo with the Crop Coefficient (Kc).
    """
    stage = CropService.get_crop_stage(crop_name, days_since_sowing)
    kc = CropService.get_kc(crop_name, stage)
    
    etc_mm_per_day = et0 * kc
    
    return {
        "ETc_mm_per_day": round(etc_mm_per_day, 2),
        "stage": stage,
        "kc_used": kc
    }
