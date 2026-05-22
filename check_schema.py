import sqlite3
import os

db_path = r'e:\vision-based-mvp\data\vision_agent.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(smart_consultations)")
        columns = cursor.fetchall()
        print("Columns in 'smart_consultations':")
        for col in columns:
            print(col)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
