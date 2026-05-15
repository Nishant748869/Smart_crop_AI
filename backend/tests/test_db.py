from backend.app.infrastructure.database import SessionLocal
from backend.app.models.db_models import DailySoilStatus, FarmField, Farmer

db = SessionLocal()
irrigations = db.query(DailySoilStatus).filter(DailySoilStatus.irrigation_mm > 0).all()
for i in irrigations:
    print(f"Field {i.field_id} - {i.date} - {i.irrigation_mm}mm")
