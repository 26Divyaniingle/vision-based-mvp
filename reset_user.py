import sqlite3
import os

db_path = r'e:\vision-based-mvp\data\vision_agent.db'
token_part = '6f8de32d1f16199bf'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, name, token, sessionCount, isLocked FROM patients WHERE token LIKE ?", (f"{token_part}%",))
    rows = cursor.fetchall()
    
    if not rows:
        print("No patient found with that token.")
    else:
        for row in rows:
            p_id, name, token, count, locked = row
            print(f"Resetting patient: {name} (ID: {p_id}, Token: {token})")
            cursor.execute("UPDATE patients SET sessionCount = 0, isLocked = 0 WHERE id = ?", (p_id,))
            conn.commit()
            print("Access granted and session count reset to 0/2.")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
