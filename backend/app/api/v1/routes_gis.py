import json
import logging
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.app.infrastructure.database import get_db
from backend.app.models.db_models import FarmField

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

from fastapi import Query

@router.post("/gis/save-boundary")
def save_farm_boundary(farmer_id: int = Query(...), payload: FarmBoundaryPayload = Body(...), db: Session = Depends(get_db)):
    """
    Receives the GeoJSON Polygon boundary from the Leaflet.js frontend.
    This boundary is saved for later NDVI Satellite querying and Spatial Stress mapping.
    """
    logger.info(f"Received Farm Boundary GeoJSON for Farmer ID: {farmer_id}")
    
    try:
        linear_ring = payload.geometry.coordinates[0]
        
        if len(linear_ring) < 4:
            raise ValueError("A valid polygon must have at least 3 distinct points + 1 closing point.")
            
        logger.info(f"Successfully Parsed Boundary with {len(linear_ring)-1} 'Medh' Pins.")
        logger.info(f"Calculated Area: {payload.properties.area_acres} Acres (Punjab standard: {payload.properties.area_killa} Killa)")

        farmer_fields = db.query(FarmField).filter(FarmField.farmer_id == farmer_id).all()
        if not farmer_fields:
            raise HTTPException(status_code=404, detail="No fields found for the requested farmer")

        field = farmer_fields[0]
        field.boundary_geojson = json.dumps(payload.dict())
        db.add(field)
        db.commit()

        return {
            "status": "success",
            "message": "Farm boundary successfully saved.",
            "data": {
                "farmer_id": farmer_id,
                "field_id": field.id,
                "recorded_area_acres": payload.properties.area_acres,
                "total_pins_dropped": len(linear_ring) - 1,
                "first_coordinate": linear_ring[0]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GeoJSON Parsing Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

from backend.app.services.scouting_service import get_directional_scouting_report

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
