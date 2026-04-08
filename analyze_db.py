import sqlite3
import os

db_path = r'e:\vision-based-mvp\data\vision_agent.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def get_table_stats(table_name):
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    return count

def get_foreign_keys(table_name):
    cursor.execute(f"PRAGMA foreign_key_list({table_name});")
    return cursor.fetchall()

def get_indexes(table_name):
    cursor.execute(f"PRAGMA index_list({table_name});")
    return cursor.fetchall()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]

print(f"Tables: {tables}")

for table in tables:
    print(f"\n--- Analysis for {table} ---")
    print(f"Record Count: {get_table_stats(table)}")
    
    fks = get_foreign_keys(table)
    if fks:
        print("Foreign Keys:")
        for fk in fks:
            print(f"  From {table}({fk[3]}) to {fk[2]}({fk[4]})")
    else:
        print("No Foreign Keys.")

    idxs = get_indexes(table)
    if idxs:
        print("Indexes:")
        for idx in idxs:
            print(f"  Name: {idx[1]}, Unique: {idx[2]}")
    else:
        print("No Indexes.")

conn.close()
