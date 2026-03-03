from dataclasses import dataclass

@dataclass
class SoilProfile:
    texture_class: str
    sand_pct: float
    silt_pct: float
    clay_pct: float
    water_capacity_mm_per_m: float
    total_available_water_mm: float
