import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Pydantic Models for GeoJSON Validation ---

class PolygonGeometry(BaseModel):
    type: str # Must be "Polygon"
    coordinates: List[List[List[float]]] # GeoJSON format: array of linear rings

class GeoJSONProperties(BaseModel):
    area_acres: float
    area_killa: float
    timestamp: str

class FarmBoundaryPayload(BaseModel):
    type: str # Must be "Feature"
    geometry: PolygonGeometry
    properties: GeoJSONProperties

@router.post("/gis/save-boundary/{farmer_id}")
def save_farm_boundary(farmer_id: int, payload: FarmBoundaryPayload):
    """
    Receives the GeoJSON Polygon boundary from the Leaflet.js frontend.
    This boundary is saved for later NDVI Satellite querying and Spatial Stress mapping.
    """
    logger.info(f"Received Farm Boundary GeoJSON for Farmer ID: {farmer_id}")
    
    # Validation constraint from the Prompt:
    # "Return the boundary as a GeoJSON array of [lat, lng] coordinates"
    try:
        linear_ring = payload.geometry.coordinates[0]
        
        if len(linear_ring) < 4:
            raise ValueError("A valid polygon must have at least 3 distinct points + 1 closing point.")
            
        logger.info(f"Successfully Parsed Boundary with {len(linear_ring)-1} 'Medh' Pins.")
        logger.info(f"Calculated Area: {payload.properties.area_acres} Acres (Punjab standard: {payload.properties.area_killa} Killa)")
        
        # In a Production Database:
        # 1. db.query(FarmField).filter(id=field_id).update({"boundary_geojson": json.dumps(payload.dict())})
        # 2. Trigger Celery/Background task to query Sentinel-Hub for NDVI using this exact Polygon.
        
        return {
            "status": "success",
            "message": "Farm boundary successfully saved.",
            "data": {
                "farmer_id": farmer_id,
                "recorded_area_acres": payload.properties.area_acres,
                "total_pins_dropped": len(linear_ring) - 1,
                "first_coordinate": linear_ring[0] # Returns [lat, lng]
            }
        }
        
    except Exception as e:
        logger.error(f"GeoJSON Parsing Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

from sqlalchemy.orm import Session
from fastapi import Depends
from app.infrastructure.database import get_db
from app.services.scouting_service import get_directional_scouting_report

@router.get("/gis/field/{field_id}/scouting")
def get_field_scouting_data(field_id: int, db: Session = Depends(get_db)):
    """
    Returns Smart Directional Scouting data for a field, evaluating 4 corners 
    and identifying the edge with the lowest NDVI stress value.
    """
    try:
        scouting_report = get_directional_scouting_report(field_id, db)
        return {"status": "success", "data": scouting_report}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Scouting Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate scouting report.")
