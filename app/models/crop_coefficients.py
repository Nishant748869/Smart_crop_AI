# Punjab Crop Coefficient & Growth Stage Configuration
# Based on FAO-56 adapted for North India climate

CROP_DATA = {

    # ==============================
    # 🌾 RABI CROPS
    # ==============================

    "wheat": {
        "stages": {
            "initial": {"kc": 0.7, "days": 20},
            "vegetative": {"kc": 0.9, "days": 30},
            "flowering": {"kc": 1.15, "days": 40},
            "maturity": {"kc": 0.6, "days": 30},
        },
        "total_duration": 120
    },

    "barley": {
        "stages": {
            "initial": {"kc": 0.6, "days": 20},
            "vegetative": {"kc": 0.85, "days": 30},
            "flowering": {"kc": 1.05, "days": 35},
            "maturity": {"kc": 0.6, "days": 25},
        },
        "total_duration": 110
    },

    "mustard": {
        "stages": {
            "initial": {"kc": 0.5, "days": 20},
            "vegetative": {"kc": 0.8, "days": 30},
            "flowering": {"kc": 1.05, "days": 30},
            "maturity": {"kc": 0.7, "days": 25},
        },
        "total_duration": 105
    },

    "gram": {
        "stages": {
            "initial": {"kc": 0.4, "days": 20},
            "vegetative": {"kc": 0.75, "days": 35},
            "flowering": {"kc": 1.0, "days": 30},
            "maturity": {"kc": 0.6, "days": 25},
        },
        "total_duration": 110
    },

    "peas": {
        "stages": {
            "initial": {"kc": 0.5, "days": 20},
            "vegetative": {"kc": 0.85, "days": 30},
            "flowering": {"kc": 1.05, "days": 25},
            "maturity": {"kc": 0.7, "days": 20},
        },
        "total_duration": 95
    },


    # ==============================
    # 🌽 KHARIF CROPS
    # ==============================

    "rice": {
        "stages": {
            "initial": {"kc": 1.05, "days": 25},
            "vegetative": {"kc": 1.1, "days": 35},
            "flowering": {"kc": 1.2, "days": 30},
            "maturity": {"kc": 0.9, "days": 30},
        },
        "total_duration": 120
    },

    "maize": {
        "stages": {
            "initial": {"kc": 0.6, "days": 20},
            "vegetative": {"kc": 1.0, "days": 30},
            "flowering": {"kc": 1.2, "days": 35},
            "maturity": {"kc": 0.6, "days": 25},
        },
        "total_duration": 110
    },

    "cotton": {
        "stages": {
            "initial": {"kc": 0.5, "days": 25},
            "vegetative": {"kc": 0.85, "days": 35},
            "flowering": {"kc": 1.15, "days": 40},
            "boll_development": {"kc": 1.1, "days": 30},
            "maturity": {"kc": 0.7, "days": 25},
        },
        "total_duration": 155
    },

    "sugarcane": {
        "stages": {
            "initial": {"kc": 0.4, "days": 30},
            "vegetative": {"kc": 1.05, "days": 120},
            "grand_growth": {"kc": 1.25, "days": 120},
            "maturity": {"kc": 0.75, "days": 60},
        },
        "total_duration": 330
    },

    "bajra": {
        "stages": {
            "initial": {"kc": 0.5, "days": 15},
            "vegetative": {"kc": 0.9, "days": 25},
            "flowering": {"kc": 1.05, "days": 30},
            "maturity": {"kc": 0.6, "days": 20},
        },
        "total_duration": 90
    },

    "soybean": {
        "stages": {
            "initial": {"kc": 0.5, "days": 20},
            "vegetative": {"kc": 0.9, "days": 30},
            "flowering": {"kc": 1.15, "days": 35},
            "maturity": {"kc": 0.6, "days": 25},
        },
        "total_duration": 110
    },


    # ==============================
    # 🥬 VEGETABLES
    # ==============================

    "potato": {
        "stages": {
            "initial": {"kc": 0.5, "days": 20},
            "vegetative": {"kc": 0.9, "days": 30},
            "tuberization": {"kc": 1.15, "days": 35},
            "maturity": {"kc": 0.75, "days": 25},
        },
        "total_duration": 110
    },

    "onion": {
        "stages": {
            "initial": {"kc": 0.7, "days": 25},
            "vegetative": {"kc": 0.95, "days": 35},
            "bulb_development": {"kc": 1.05, "days": 35},
            "maturity": {"kc": 0.75, "days": 25},
        },
        "total_duration": 120
    },

    "tomato": {
        "stages": {
            "initial": {"kc": 0.6, "days": 20},
            "vegetative": {"kc": 1.05, "days": 30},
            "fruiting": {"kc": 1.15, "days": 40},
            "maturity": {"kc": 0.8, "days": 30},
        },
        "total_duration": 120
    },

    "chilli": {
        "stages": {
            "initial": {"kc": 0.6, "days": 20},
            "vegetative": {"kc": 0.95, "days": 35},
            "flowering": {"kc": 1.1, "days": 40},
            "maturity": {"kc": 0.8, "days": 30},
        },
        "total_duration": 125
    },
    
    # Generic Fallback
    "other": {
        "stages": {
            "initial": {"kc": 0.5, "days": 30},
            "mid": {"kc": 1.0, "days": 60},
            "late": {"kc": 0.5, "days": 30},
        },
        "total_duration": 120
    }
}
