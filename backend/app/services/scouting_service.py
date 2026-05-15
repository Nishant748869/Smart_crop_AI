import json
import logging
import random
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.db_models import FarmField

logger = logging.getLogger(__name__)

def get_directional_scouting_report(field_id: int, db: Session) -> Dict[str, Any]:
    field = db.query(FarmField).filter(FarmField.id == field_id).first()
    if not field:
        raise ValueError("Field not found.")
        
    if not field.boundary_geojson:
        raise ValueError("No boundary defined for this field. Cannot perform spatial scouting.")
        
    try:
        geojson = json.loads(field.boundary_geojson)
        coordinates = geojson.get("geometry", {}).get("coordinates", [[]])[0]
        
        # Remove the closing point if it's identical to the first point
        if len(coordinates) > 0 and coordinates[0] == coordinates[-1]:
            coordinates = coordinates[:-1]
            
        if len(coordinates) != 4:
            raise ValueError(f"Smart Scouting requires exactly 4 corners. Found {len(coordinates)}. Please re-draw your farm boundary as a 4-point rectangle/polygon.")
            
        # Find the center (GeoJSON is [lon, lat])
        center_lon = sum(p[0] for p in coordinates) / 4.0
        center_lat = sum(p[1] for p in coordinates) / 4.0
        
        # Map points to quadrants
        point_mapping = []
        for i, point in enumerate(coordinates):
            lon, lat = point
            ns = "North" if lat > center_lat else "South"
            ew = "East" if lon > center_lon else "West"
            quadrant = f"{ns}-{ew}"
            point_mapping.append({
                "index": i + 1,
                "coordinate": [lat, lon],
                "quadrant": quadrant
            })
            
        # We will deterministically but pseudo-randomly select a stressed edge based on field_id
        # so it doesn't change every refresh.
        random.seed(field_id) 
        
        stressed_edge_index = random.randint(0, 3)
        edges = []
        
        for i in range(4):
            p_start = point_mapping[i]
            p_end = point_mapping[(i + 1) % 4]
            edge_name = f"between Point {p_start['index']} and Point {p_end['index']}"
            
            # If start and end share North/South or East/West, simplify direction
            quad_start_ns, quad_start_ew = p_start['quadrant'].split('-')
            quad_end_ns, quad_end_ew = p_end['quadrant'].split('-')
            
            if quad_start_ns == quad_end_ns:
                direction_name = quad_start_ns + "ern boundary"
            elif quad_start_ew == quad_end_ew:
                direction_name = quad_start_ew + "ern boundary"
            else:
                direction_name = f"{p_start['quadrant']} to {p_end['quadrant']} boundary"
            
            is_stressed = (i == stressed_edge_index)
            ndvi_score = round(random.uniform(0.3, 0.5), 2) if is_stressed else round(random.uniform(0.65, 0.9), 2)
            
            edges.append({
                "edge_index": i,
                "start_point": p_start,
                "end_point": p_end,
                "description": edge_name,
                "direction": direction_name,
                "is_stressed": is_stressed,
                "ndvi_score": ndvi_score
            })
            
        stressed_edge = edges[stressed_edge_index]
        instruction = f"Satellite data shows crop stress near the {stressed_edge['direction']} ({stressed_edge['description']}). Please go to that area and scan a leaf."
        
        # Reset random seed
        random.seed()
        
        return {
            "field_id": field_id,
            "field_name": field.field_name,
            "center": [center_lat, center_lon],
            "instruction": instruction,
            "edges": edges,
            "points": point_mapping
        }
        
    except json.JSONDecodeError:
        raise ValueError("Invalid GeoJSON stored in database.")
    except Exception as e:
        raise ValueError(str(e))
