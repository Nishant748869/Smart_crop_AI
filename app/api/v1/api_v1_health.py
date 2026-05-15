from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import shutil
import os
import uuid
from pydantic import BaseModel

from app.services.health_validation_engine import CropHealthValidationEngine
from app.infrastructure.database import get_db
from app.models.db_models import FarmField

router = APIRouter()

class HealthDiagnosticRequest(BaseModel):
    field_id: int
    image_path: str = "default_leaf.jpg" # In real app, this would be an uploaded file

@router.post("/health/diagnostic")
def get_health_diagnostic(payload: HealthDiagnosticRequest, db: Session = Depends(get_db)):
    """
    Executes the 3-Layer Crop Health Validation Engine.
    Cross-validates Satellite (Layer 1), Environment (Layer 2), and Vision AI (Layer 3).
    """
    field = db.query(FarmField).filter(FarmField.id == payload.field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    # Parse boundary for Layer 1
    import json
    try:
        boundary_data = json.loads(field.boundary_geojson)
        coords = boundary_data.get("geometry", {}).get("coordinates", [[]])[0]
        # Format for validation engine: List[Dict[str, float]]
        polygon = [{"lat": p[1], "lon": p[0]} for p in coords]
    except Exception:
        polygon = [] # Fallback

    # Execute Engine
    result = CropHealthValidationEngine.process_diagnostic(
        field_polygon=polygon,
        lat=field.lat,
        lon=field.lon,
        crop_type=field.crop,
        soil_moisture_pct=35.0, # Simulated baseline moisture
        image_file_path=payload.image_path
    )

    return result

@router.post("/health/upload-diagnostic")
async def upload_health_diagnostic(
    field_id: int, 
    image: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Receives an uploaded leaf image and runs the 3-Layer Validation Engine.
    """
    field = db.query(FarmField).filter(FarmField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    # Ensure uploads directory exists
    upload_dir = "/tmp/smart_crop_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save uploaded file
    file_ext = os.path.splitext(image.filename)[1]
    file_path = os.path.join(upload_dir, f"{uuid.uuid4()}{file_ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Parse boundary for Layer 1
    import json
    try:
        boundary_data = json.loads(field.boundary_geojson)
        coords = boundary_data.get("geometry", {}).get("coordinates", [[]])[0]
        polygon = [{"lat": p[1], "lon": p[0]} for p in coords]
    except Exception:
        polygon = [] # Fallback

    # Execute Engine
    result = CropHealthValidationEngine.process_diagnostic(
        field_polygon=polygon,
        lat=field.lat,
        lon=field.lon,
        crop_type=field.crop,
        soil_moisture_pct=35.0,
        image_file_path=file_path
    )

    # Note: In production, we might want to cleanup the file or move it to permanent storage
    return result
