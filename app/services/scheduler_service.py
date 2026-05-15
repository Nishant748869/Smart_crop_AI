import logging
from sqlalchemy.orm import Session
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

from app.infrastructure.database import SessionLocal
from app.models.db_models import Farmer, DailySoilStatus
from app.services.prediction_service import PredictionEngine

logger = logging.getLogger(__name__)

def run_midnight_soil_update():
    """
    Check 2: Har din: Weather fetch, ET calculate, Soil update, Insert daily_soil_status row
    This job iterates over all farmers, calculates their current state using the live prediction engine,
    and natively dumps it to the database to ensure unbroken telemetry tracking without user intervention.
    """
    logger.info("Executing Midnight Soil Tracking Scheduler...")
    db: Session = SessionLocal()
    try:
        from app.models.db_models import FarmField
        fields = db.query(FarmField).all()
        today = datetime.now().date().isoformat()
        
        for field in fields:
            if not field.lat or not field.lon or not field.crop or not field.sowing_date:
                continue # Skip fields without complete setup
                
            # Check if already logged today to prevent unique constraint failures
            existing_log = db.query(DailySoilStatus).filter(
                DailySoilStatus.field_id == field.id,
                DailySoilStatus.date == today
            ).first()
            
            if existing_log:
                continue

            try:
                # We use the prediction engine to fetch live AWS weather, calculate ET, and run water balance
                result = PredictionEngine.evaluate(
                    lat=field.lat,
                    lon=field.lon,
                    crop_type=field.crop,
                    sowing_date_str=field.sowing_date,
                    last_irrigation_date_str=field.sowing_date # Approximation
                )
                
                # Insert safe clamped constraints into DB
                log_entry = DailySoilStatus(
                    field_id=field.id,
                    date=today,
                    soil_water_mm=result["current_water_mm"], # This is implicitly clamped per Check 4
                    etc_mm=result["etc_mm_per_day"],
                    rain_mm=0.0, # Rainfall handled in simulation delta
                    irrigation_mm=0.0 
                )
                db.add(log_entry)
                db.commit()
                logger.info(f"Logged daily status for field {field.id}")
                
            except Exception as inner_e:
                logger.error(f"Schedule failed for field {field.id}: {inner_e}")
                
    except Exception as e:
        logger.error(f"Global Midnight Scheduler failed: {e}")
    finally:
        db.close()

# Scheduler manager
scheduler = BackgroundScheduler()
scheduler.add_job(run_midnight_soil_update, 'cron', hour=0, minute=0)

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        logger.info("Midnight Soil Engine Scheduler Started.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Midnight Soil Engine Scheduler Stopped.")
