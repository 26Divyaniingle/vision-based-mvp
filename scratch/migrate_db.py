
import sqlite3
import os

db_path = os.path.join('data', 'vision_agent.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding sessionCount column to patients table...")
    cursor.execute("ALTER TABLE patients ADD COLUMN sessionCount INTEGER DEFAULT 0;")
    print("Success.")
except sqlite3.OperationalError as e:
    print(f"sessionCount column might already exist: {e}")

try:
    print("Adding isLocked column to patients table...")
    cursor.execute("ALTER TABLE patients ADD COLUMN isLocked BOOLEAN DEFAULT 0;")
    print("Success.")
except sqlite3.OperationalError as e:
    print(f"isLocked column might already exist: {e}")

conn.commit()
conn.close()
print("Migration complete.")
