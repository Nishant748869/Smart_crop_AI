from app.models.crop_coefficients import CROP_DATA

class CropService:
    """
    Service for managing crop profiles and coefficients dynamically.
    Currently uses an in-memory dictionary, ready to be hot-swapped
    for a database integration for India-wide scale.
    """
    
    @staticmethod
    def get_kc(crop_name: str, stage: str) -> float:
        """
        Retrieves the exact crop coefficient (Kc) for a given crop and life stage.
        Falls back to 'other' and 'initial' if not found.
        """
        crop = crop_name.lower().strip()
        kc_data = CROP_DATA.get(crop, CROP_DATA.get("other"))
        
        stages = kc_data.get("stages", {})
        stage_info = stages.get(stage, stages.get("initial", {"kc": 0.5}))
        return stage_info.get("kc", 0.5)

    @staticmethod
    def get_crop_stage(crop_name: str, days_since_sowing: int) -> str:
        """
        Predicts the exact growth stage based on the cumulative
        days defined in the crop database.
        """
        crop = crop_name.lower().strip()
        kc_data = CROP_DATA.get(crop, CROP_DATA.get("other"))
        stages = kc_data.get("stages", {})
        
        cumulative_days = 0
        for stage_name, stage_info in stages.items():
            cumulative_days += stage_info.get("days", 30)
            if days_since_sowing <= cumulative_days:
                return stage_name
                
        # If passed total days, return the final maturity stage
        return list(stages.keys())[-1]
