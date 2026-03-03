from sqlalchemy import Column, Integer, String, Float, DateTime, UniqueConstraint
from datetime import datetime
from app.infrastructure.database import Base

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(15), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class FarmField(Base):
    __tablename__ = "farm_fields"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, index=True, nullable=False)
    field_name = Column(String(100), nullable=True, default="My Field")
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    crop = Column(String(50), nullable=False)
    sowing_date = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DailySoilStatus(Base):
    __tablename__ = "daily_soil_status"
    __table_args__ = (UniqueConstraint('field_id', 'date', name='uq_field_date'),)

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, index=True, nullable=False)
    date = Column(String(20), index=True, nullable=False)
    soil_water_mm = Column(Float, nullable=False)
    etc_mm = Column(Float, nullable=False)
    rain_mm = Column(Float, nullable=False)
    irrigation_mm = Column(Float, nullable=False)
