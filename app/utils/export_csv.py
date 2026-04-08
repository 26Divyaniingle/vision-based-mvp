import csv
import os
from sqlalchemy.orm import Session
from sqlalchemy import inspect
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def export_table_to_csv(model_class, db_session: Session):
    """
    Exports a SQLAlchemy model's table to a CSV file in the data_exports directory.
    Uses utf-8-sig for Excel compatibility.
    """
    try:
        # Define export directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_dir = os.path.join(base_dir, "data_exports")
        
        if not os.path.exists(export_dir):
            os.makedirs(export_dir)
            
        file_path = os.path.join(export_dir, f"{model_class.__tablename__}.csv")
        
        # Get all records
        records = db_session.query(model_class).all()
        
        # Get column names
        mapper = inspect(model_class)
        columns = [column.key for column in mapper.attrs]
        
        # Write to CSV
        with open(file_path, mode='w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            for record in records:
                # Convert record to dict, handling JSON/DateTime etc. if needed
                row = {col: getattr(record, col) for col in columns}
                # Optional: Convert complex types to string for CSV
                for key, value in row.items():
                    if isinstance(value, (list, dict)):
                        import json
                        row[key] = json.dumps(value)
                writer.writerow(row)
                
        logger.info(f"Successfully exported {model_class.__tablename__} to {file_path}")
        
    except Exception as e:
        logger.error(f"Failed to export {model_class.__tablename__} to CSV: {str(e)}")

def trigger_export_from_event(mapper, connection, target):
    """
    Event handler that triggers CSV export.
    Note: We need a session, so we can't easily use the connection here for a full query 
    unless we use the target's session.
    """
    from sqlalchemy.orm import object_session
    session = object_session(target)
    if session:
        # We export the whole table to ensure the CSV is always a complete snapshot
        export_table_to_csv(target.__class__, session)
