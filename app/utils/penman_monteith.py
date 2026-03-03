import math

def calculate_eto(
    t_max,
    t_min,
    humidity,
    wind_speed,
    solar_radiation,
    elevation
):
    t_mean = (t_max + t_min) / 2

    # Atmospheric pressure
    p = 101.3 * ((293 - 0.0065 * elevation) / 293) ** 5.26

    # Psychrometric constant
    gamma = 0.000665 * p

    # Saturation vapor pressure
    es_tmax = 0.6108 * math.exp((17.27 * t_max) / (t_max + 237.3))
    es_tmin = 0.6108 * math.exp((17.27 * t_min) / (t_min + 237.3))
    es = (es_tmax + es_tmin) / 2

    # Actual vapor pressure
    ea = es * (humidity / 100)

    # Slope of vapor pressure curve
    delta = (4098 * (0.6108 * math.exp((17.27 * t_mean) / (t_mean + 237.3)))) / ((t_mean + 237.3) ** 2)

    # Net radiation approximation
    rn = solar_radiation * 0.77

    # Soil heat flux (daily = 0)
    g = 0

    eto = (
        (0.408 * delta * (rn - g)) +
        (gamma * (900 / (t_mean + 273)) * wind_speed * (es - ea))
    ) / (
        delta + gamma * (1 + 0.34 * wind_speed)
    )

    return round(eto, 2)
