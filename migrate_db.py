import sqlite3
import os

def migrate():
    db_path = os.path.join("data", "vision_agent.db")
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}. No migration needed.")
        return
        
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check sessions table columns
        cursor.execute("PRAGMA table_info(sessions)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Existing columns in 'sessions': {columns}")
        
        # Add is_serious column if missing
        if "is_serious" not in columns:
            print("Adding 'is_serious' column to 'sessions' table...")
            cursor.execute("ALTER TABLE sessions ADD COLUMN is_serious BOOLEAN DEFAULT 0")
            conn.commit()
            print("'is_serious' column added successfully!")
        else:
            print("'is_serious' column already exists in 'sessions' table.")
            
        # Let's also check for other columns or tables to ensure absolute consistency
        cursor.execute("PRAGMA table_info(patients)")
        patient_columns = [col[1] for col in cursor.fetchall()]
        print(f"Existing columns in 'patients': {patient_columns}")
        
        # Ensure sessionCount and isLocked are present
        if "sessionCount" not in patient_columns:
            print("Adding 'sessionCount' column to 'patients' table...")
            cursor.execute("ALTER TABLE patients ADD COLUMN sessionCount INTEGER DEFAULT 0")
            conn.commit()
            
        if "isLocked" not in patient_columns:
            print("Adding 'isLocked' column to 'patients' table...")
            cursor.execute("ALTER TABLE patients ADD COLUMN isLocked BOOLEAN DEFAULT 0")
            conn.commit()
            
        # Check smart_consultations table columns
        cursor.execute("PRAGMA table_info(smart_consultations)")
        consultation_columns = [col[1] for col in cursor.fetchall()]
        print(f"Existing columns in 'smart_consultations': {consultation_columns}")
        
        if consultation_columns: # If table exists
            if "language" not in consultation_columns:
                print("Adding 'language' column to 'smart_consultations' table...")
                cursor.execute("ALTER TABLE smart_consultations ADD COLUMN language VARCHAR DEFAULT 'English'")
                conn.commit()
                print("'language' column added successfully!")
            else:
                print("'language' column already exists in 'smart_consultations' table.")
            
        print("All database migrations completed successfully!")
    except Exception as e:
        print(f"Error migrating database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
