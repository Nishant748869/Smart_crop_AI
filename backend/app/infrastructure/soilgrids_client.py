import logging
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry # type: ignore

logger = logging.getLogger(__name__)

class SoilGridsClientError(Exception):
    """Base exception for SoilGrids API failures."""
    pass

class SoilGridsClient:
    """
    Client for fetching soil properties from ISRIC - World Soil Information.
    Uses robust timeout and retry logic for production readiness.
    """
    BASE_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"

    def __init__(self, timeout: int = 10, max_retries: int = 3):
        self.timeout = timeout
        
        # Configure robust retry strategy
        retry_strategy = Retry(
            total=max_retries,
            status_forcelist=[429, 500, 502, 503, 504],
            backoff_factor=1 # Exponential backoff: 1s, 2s, 4s
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session = requests.Session()
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def fetch_soil_composition(self, lat: float, lon: float) -> dict:
        """
        Fetches the sand, silt, and clay percentage at a given location.
        Returns average percentage across the 0-30cm depth.
        """
        params = {
            "lon": lon,
            "lat": lat,
            "property": ["sand", "silt", "clay"],
            "depth": ["0-5cm", "5-15cm", "15-30cm"],
            "value": "mean"
        }

        try:
            # Enforce strict 3.0s connect timeout, and self.timeout read timeout
            # This prevents the thread from hanging indefinitely if the DNS or socket drops
            response = self.session.get(self.BASE_URL, params=params, timeout=(3.0, self.timeout))
            response.raise_for_status()
            data = response.json()
            return self._parse_composition(data)
        except requests.exceptions.RequestException as e:
            logger.error(f"SoilGrids API lookup failed: {e}")
            raise SoilGridsClientError(f"Failed to fetch soil data for {lat},{lon}") from e

    def _parse_composition(self, payload: dict) -> dict:
        """
        Extracts and averages the composition from the deep nested JSON.
        SoilGrids returns values in mapped units (g/kg), converting to percentage.
        """
        result = {"sand": 0.0, "silt": 0.0, "clay": 0.0}
        
        properties = payload.get("properties", {}).get("layers", [])
        if not properties:
            raise SoilGridsClientError("Invalid payload structure from SoilGrids API")

        for prop in properties:
            name = prop.get("name")
            if name in result:
                # Average the depths for 0-30cm
                depths = prop.get("depths", [])
                valid_values = [d.get("values", {}).get("mean") for d in depths if d.get("values", {}).get("mean") is not None]
                if valid_values:
                    avg_g_per_kg = sum(valid_values) / len(valid_values)
                    # Convert g/kg to percentage ( / 10)
                    result[name] = round(avg_g_per_kg / 10.0, 2)
        
        # Normalize to 100% just in case of slight precision loss
        total = sum(result.values())
        if total > 0:
            result = {k: round((v / total) * 100, 2) for k, v in result.items()}
            
        return result

    @staticmethod
    def classify_usda_texture(sand: float, silt: float, clay: float) -> str:
        """
        Simplified logical mapping to USDA soil texture classes based on percentages.
        """
        if clay >= 40:
            return "Clay"
        elif sand >= 85:
            return "Sand"
        elif silt >= 80:
            return "Silt"
        elif 27 <= clay <= 40 and sand <= 45:
            return "Clay Loam"
        elif 7 <= clay < 27 and 28 <= silt < 50 and sand <= 52:
            return "Loam"
        elif sand >= 50 and clay < 20:
            return "Sandy Loam"
        elif silt >= 50 and clay < 27:
            return "Silt Loam"
        else:
            return "Loam" # Fallback

    @staticmethod
    def estimate_water_capacity_mm_per_m(texture: str) -> float:
        """
        Estimates the soil water holding capacity (Field Capacity - Permanent Wilting Point).
        Returns values in mm of water per meter of soil depth.
        """
        mapping = {
            "Sand": 80.0,
            "Sandy Loam": 120.0,
            "Silt": 160.0,
            "Loam": 170.0,
            "Silt Loam": 200.0,
            "Clay Loam": 210.0,
            "Clay": 150.0
        }
        return mapping.get(texture, 170.0) 
