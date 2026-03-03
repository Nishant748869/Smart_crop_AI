from dataclasses import dataclass

@dataclass
class IrrigationDecision:
    required: bool
    urgency_level: str
    reason: str
    depletion_pct: float
    new_soil_water_mm: float
