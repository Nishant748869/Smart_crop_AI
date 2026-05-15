from dataclasses import dataclass

@dataclass
class WeatherData:
    t_max: float
    t_min: float
    humidity: float
    wind_speed: float
    solar_radiation: float
