import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.infrastructure.database import get_db
from app.models.db_models import Farmer, FarmField, DailySoilStatus

logger = logging.getLogger(__name__)

router = APIRouter()

from app.services.soil_service import get_soil_properties

# --- Pydantic Schemas ---

class SendOTPRequest(BaseModel):
    phone_number: str

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    crop: Optional[str] = None
    sowing_date: Optional[str] = None
    last_irrigation_date: Optional[str] = None
    initial_irrigation_mm: Optional[float] = None
    boundary_geojson: Optional[str] = None

class AddFieldRequest(BaseModel):
    field_name: str
    lat: float
    lon: float
    crop: str
    sowing_date: Optional[str] = None
    last_irrigation_date: Optional[str] = None
    initial_irrigation_mm: Optional[float] = None
    boundary_geojson: Optional[str] = None

class DailySoilLogRequest(BaseModel):
    field_id: int
    date: str
    soil_water_mm: float
    etc_mm: float
    rain_mm: float
    irrigation_mm: float

# --- Routes ---

import requests
import os

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")

@router.post("/auth/send-otp")
def send_otp(payload: SendOTPRequest):
    """
    Sends an OTP to a phone number using Fast2SMS API.
    If no API key is set, it falls back to a simulated response.
    """
    if len(payload.phone_number) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    
    # Extract just the 10 digits if it has +91
    raw_number = payload.phone_number.replace("+91", "").strip()
    
    # We are using 1234 statically since we don't have a Redis/DB session store for OTPs yet in this scope.
    otp_code = "1234" 
    
    if FAST2SMS_API_KEY:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            querystring = {
                "authorization": FAST2SMS_API_KEY,
                "variables_values": otp_code,
                "route": "otp",
                "numbers": raw_number
            }
            response = requests.request("GET", url, params=querystring)
            logger.info(f"Fast2SMS Response: {response.text}")
            return {"message": "OTP sent successfully via SMS", "simulated_otp": otp_code}
        except Exception as e:
            logger.error(f"Failed to send real SMS: {e}")
            raise HTTPException(status_code=500, detail="Failed to send SMS")
    else:
        logger.warning(f"FAST2SMS_API_KEY not found. Simulating OTP to {payload.phone_number}")
        return {"message": "OTP Simulation Mode (No API Key)", "simulated_otp": otp_code}

@router.post("/auth/verify-otp")
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verifies the OTP and logs the farmer in. 
    If the phone number doesn't exist, creates a new Farmer account.
    """
    # 1. Verify OTP Simulation
    if payload.otp != "1234":
        raise HTTPException(status_code=401, detail="Invalid OTP")
        
    # 2. Check if farmer exists
    farmer = db.query(Farmer).filter(Farmer.phone_number == payload.phone_number).first()
    
    is_new_farmer = False
    if not farmer:
        is_new_farmer = True
        logger.info(f"Registering new farmer: {payload.phone_number}")
        farmer = Farmer(phone_number=payload.phone_number)
        db.add(farmer)
        db.commit()
        db.refresh(farmer)

    # Guest conversion / Adding a field during login
    if payload.lat and payload.lon:
        # Prevent exact duplicate fields from being created
        existing_field = db.query(FarmField).filter(
            FarmField.farmer_id == farmer.id,
            FarmField.lat == payload.lat,
            FarmField.lon == payload.lon,
            FarmField.crop == payload.crop
        ).first()

        if not existing_field:
            field = FarmField(
                farmer_id=farmer.id,
                field_name=f"{payload.crop.capitalize() if payload.crop else 'Farm'} Field",
                lat=payload.lat,
                lon=payload.lon,
                crop=payload.crop or 'wheat',
                sowing_date=payload.sowing_date,
                boundary_geojson=payload.boundary_geojson
            )
            db.add(field)
            db.commit()
            db.refresh(field)
            
            # --- Check 3: Initial Soil Water Logic (100% Capacity on Day 1) ---
            try:
                import datetime
                baseline_taw_mm = 80.0 
                
                init_date = payload.last_irrigation_date if payload.last_irrigation_date else datetime.date.today().isoformat()
                init_irri = payload.initial_irrigation_mm if payload.initial_irrigation_mm is not None else (50.0 if payload.last_irrigation_date else 0.0)

                initial_entry = DailySoilStatus(
                    field_id=field.id,
                    date=init_date,
                    soil_water_mm=baseline_taw_mm,
                    etc_mm=0.0,
                    rain_mm=0.0,
                    irrigation_mm=init_irri
                )
                db.add(initial_entry)
                db.commit()
                logger.info(f"Initialized Field {field.id} soil water for {init_date} with {init_irri}mm irrigation")
            except Exception as e:
                import traceback
                logger.error(f"Failed to initialize day-1 soil data: {e}")
                traceback.print_exc()
            
    # Fetch all fields associated with the farmer for the new Multi-Crop dashboard
    fields = db.query(FarmField).filter(FarmField.farmer_id == farmer.id).all()
    fields_data = []
    
    for f in fields:
        irrigation_events = db.query(DailySoilStatus).filter(
            DailySoilStatus.field_id == f.id,
            DailySoilStatus.irrigation_mm > 0
        ).all()

        soil_profile = get_soil_properties(f.lat, f.lon)

        fields_data.append({
            "id": f.id,
            "name": f.field_name,
            "crop": f.crop,
            "sowing_date": f.sowing_date,
            "lat": f.lat,
            "lon": f.lon,
            "soil_type": soil_profile.texture_class,
            "total_irrigations": len(irrigation_events),
            "last_irrigation_date": max([e.date for e in irrigation_events]) if irrigation_events else "None Recorded",
            "irrigation_history": sorted([{"date": e.date, "amount": e.irrigation_mm} for e in irrigation_events], key=lambda x: x['date'], reverse=True)
        })

    return {
        "message": "Login successful",
        "farmer_id": farmer.id,
        "is_new": is_new_farmer,
        "fields": fields_data
    }

@router.post("/auth/farmer/{farmer_id}/add-field")
def add_farmer_field(farmer_id: int, payload: AddFieldRequest, db: Session = Depends(get_db)):
    """
    Registers a new FarmField for an existing logged-in Farmer and initializes boundary logic.
    """
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    field = FarmField(
        farmer_id=farmer.id,
        field_name=payload.field_name,
        lat=payload.lat,
        lon=payload.lon,
        crop=payload.crop,
        sowing_date=payload.sowing_date,
        boundary_geojson=payload.boundary_geojson
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    
    # Initialize Soil Water baseline (100% capacity on Day 1)
    try:
        import datetime
        baseline_taw_mm = 80.0 
        
        init_date = payload.last_irrigation_date if payload.last_irrigation_date else datetime.date.today().isoformat()
        init_irri = payload.initial_irrigation_mm if payload.initial_irrigation_mm is not None else (50.0 if payload.last_irrigation_date else 0.0)

        initial_entry = DailySoilStatus(
            field_id=field.id,
            date=init_date,
            soil_water_mm=baseline_taw_mm,
            etc_mm=0.0,
            rain_mm=0.0,
            irrigation_mm=init_irri
        )
        db.add(initial_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to initialize day-1 soil data for new field: {e}")
        
    return {"message": "Field added successfully", "field_id": field.id}

@router.post("/soil/log-daily")
def log_daily_soil(payload: DailySoilLogRequest, db: Session = Depends(get_db)):
    """
    Logs the daily internal soil tracking state to the database for core engine persistence.
    """
    log_entry = DailySoilStatus(
        field_id=payload.field_id,
        date=payload.date,
        soil_water_mm=payload.soil_water_mm,
        etc_mm=payload.etc_mm,
        rain_mm=payload.rain_mm,
        irrigation_mm=payload.irrigation_mm
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    return {"message": "Daily soil status logged", "log_id": log_entry.id}

@router.get("/auth/farmer/{farmer_id}/fields")
def get_farmer_fields(farmer_id: int, db: Session = Depends(get_db)):
    """
    Fetches all FarmFields for a user, dynamically calculating Total Irrigations and Last Irrigation Date for each.
    """
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    fields = db.query(FarmField).filter(FarmField.farmer_id == farmer_id).all()
    results = []
    
    for f in fields:
        irrigation_events = db.query(DailySoilStatus).filter(
            DailySoilStatus.field_id == f.id,
            DailySoilStatus.irrigation_mm > 0
        ).all()
        
        soil_profile = get_soil_properties(f.lat, f.lon)
        
        results.append({
            "id": f.id,
            "name": f.field_name,
            "crop": f.crop,
            "sowing_date": f.sowing_date,
            "lat": f.lat,
            "lon": f.lon,
            "boundary_geojson": f.boundary_geojson,
            "soil_type": soil_profile.texture_class,
            "total_irrigations": len(irrigation_events),
            "last_irrigation_date": max([e.date for e in irrigation_events]) if irrigation_events else "None Recorded",
            "irrigation_history": sorted([{"date": e.date, "amount": e.irrigation_mm} for e in irrigation_events], key=lambda x: x['date'], reverse=True)
        })

    return {
        "farmer_id": farmer_id,
        "fields": results
    }

@router.delete("/auth/farmer/{farmer_id}/fields/{field_id}")
def delete_farmer_field(farmer_id: int, field_id: int, db: Session = Depends(get_db)):
    """Deletes a FarmField and its associated daily telemetry."""
    field = db.query(FarmField).filter(FarmField.id == field_id, FarmField.farmer_id == farmer_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    # Delete associated soil logs
    db.query(DailySoilStatus).filter(DailySoilStatus.field_id == field_id).delete()
    
    # Delete field
    db.delete(field)
    db.commit()
    return {"message": "Field deleted successfully"}

class IrrigateFieldRequest(BaseModel):
    date: str
    irrigation_mm: float

@router.post("/auth/farmer/{farmer_id}/fields/{field_id}/irrigate")
def log_field_irrigation(farmer_id: int, field_id: int, payload: IrrigateFieldRequest, db: Session = Depends(get_db)):
    """Logs a manual irrigation event for a specific field."""
    field = db.query(FarmField).filter(FarmField.id == field_id, FarmField.farmer_id == farmer_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    import datetime
    
    # Check if a log entry already exists for this date
    existing_log = db.query(DailySoilStatus).filter(
        DailySoilStatus.field_id == field_id,
        DailySoilStatus.date == payload.date
    ).first()
    
    if existing_log:
        existing_log.irrigation_mm += payload.irrigation_mm
        db.commit()
        return {"message": "Irrigation added to existing daily log", "total_irrigation_today": existing_log.irrigation_mm}
    else:
        # Create a new rudimentary log containing just the irrigation (the midnight scheduler will fill the rest if ET missing)
        log_entry = DailySoilStatus(
            field_id=field_id,
            date=payload.date,
            soil_water_mm=80.0, # Approximate Taw
            etc_mm=0.0,
            rain_mm=0.0,
            irrigation_mm=payload.irrigation_mm
        )
        try:
            db.add(log_entry)
            db.commit()
            return {"message": "New irrigation log created"}
        except Exception as e:
            logger.error(f"Failed to log irrigation: {e}")
            raise HTTPException(status_code=500, detail="Failed to log irrigation event")
