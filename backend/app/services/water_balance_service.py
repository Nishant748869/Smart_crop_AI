from backend.app.models.irrigation_models import IrrigationDecision

class WaterBalanceService:
    """
    CORE ENGINE: Evaluates standard soil water balance strictly adhering to 
    maximum field capacity limits and minimum 0 depletion thresholds.
    """
    
    @staticmethod
    def calculate_daily_balance(
        previous_soil_water_mm: float,
        etc_mm: float,
        rainfall_mm: float,
        irrigation_mm: float,
        total_available_water_mm: float,
        depletion_threshold_pct: float = 50.0
    ) -> IrrigationDecision:
        """
        Calculates the new soil water status.
        Formula: new_soil_water = prev - etc + rainfall + irrigation
        """
        new_soil_water = previous_soil_water_mm - etc_mm + rainfall_mm + irrigation_mm
        
        # Constraints enforcement (Can't exceed capacity, can't drop below 0)
        new_soil_water = max(0.0, min(new_soil_water, total_available_water_mm))
        
        # Depletion Percentage Calculation
        # (How empty the tank is, standard agronomy approach)
        if total_available_water_mm > 0:
            depletion_mm = total_available_water_mm - new_soil_water
            depletion_pct = (depletion_mm / total_available_water_mm) * 100.0
        else:
            depletion_pct = 100.0 # Extreme edge case

        # Decision threshold check (e.g., typically irrigate at 50% MAD)
        required = bool(depletion_pct >= depletion_threshold_pct)
        
        moisture_pct = round(100.0 - depletion_pct, 1)
        reason = f"Soil moisture is at {moisture_pct}%. Sufficient for now."
        urgency_level = "Low"
        
        if required:
            urgency_level = "High" if depletion_pct >= 75.0 else "Medium"
            reason = f"Soil depletion is at {round(depletion_pct, 1)}% ({round(new_soil_water, 1)}mm remaining). Irrigation needed."
            
        return IrrigationDecision(
            required=required,
            urgency_level=urgency_level,
            reason=reason,
            depletion_pct=round(depletion_pct, 2),
            new_soil_water_mm=round(new_soil_water, 2)
        )
