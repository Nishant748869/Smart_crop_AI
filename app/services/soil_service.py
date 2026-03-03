import logging
from app.infrastructure.soilgrids_client import SoilGridsClient, SoilGridsClientError
from app.models.soil_models import SoilProfile
from app.utils.cache import cache

logger = logging.getLogger(__name__)
client = SoilGridsClient()

def get_soil_properties(latitude: float, longitude: float, root_depth_m: float = 1.0) -> SoilProfile:
    """
    Fetches soil property data across India dynamically using ISRIC.
    Rounds coordinates to 3 decimal places (approx 100m) to optimize caching.
    """
    lat_r = round(latitude, 3)
    lon_r = round(longitude, 3)
    cache_key = f"soil_{lat_r}_{lon_r}"

    cached_profile = cache.get(cache_key)
    if cached_profile:
        logger.info(f"Soil cache HIT for {lat_r}, {lon_r}")
        return cached_profile

    logger.info(f"Soil cache MISS for {lat_r}, {lon_r}. Fetching from ISRIC SoilGrids...")
    
    try:
        composition = client.fetch_soil_composition(lat=lat_r, lon=lon_r)
        
        sand = composition.get("sand", 40.0)
        silt = composition.get("silt", 40.0)
        clay = composition.get("clay", 20.0)

        texture = client.classify_usda_texture(sand, silt, clay)
        capacity_per_m = client.estimate_water_capacity_mm_per_m(texture)
        
        # Calculate Total Available Water (TAW)
        total_available_water = capacity_per_m * root_depth_m

        profile = SoilProfile(
            texture_class=texture,
            sand_pct=sand,
            silt_pct=silt,
            clay_pct=clay,
            water_capacity_mm_per_m=capacity_per_m,
            total_available_water_mm=round(total_available_water, 2)
        )
        
        # Cache for 24 hours (86400s) since soil data rarely changes
        cache.set(cache_key, profile, ttl_seconds=86400)
        return profile
    
    except SoilGridsClientError as e:
        logger.warning(f"Soil prediction fallback due to API error: {e}")
        # Production Fallback -> Assume Loam
        return SoilProfile(
            texture_class="Loam",
            sand_pct=40.0,
            silt_pct=40.0,
            clay_pct=20.0,
            water_capacity_mm_per_m=170.0,
            total_available_water_mm=170.0 * root_depth_m
        )
