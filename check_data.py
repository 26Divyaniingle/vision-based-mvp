import sqlite3
import os
import json

db_path = r'e:\vision-based-mvp\data\vision_agent.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM smart_consultations WHERE patient_id = 1")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} rows for patient 1.")
        for row in rows:
            print(row)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
