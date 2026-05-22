from app.database.db import SessionLocal
from app.database.models import Patient
import json

db = SessionLocal()
patients = db.query(Patient).all()
print(f"Total Patients: {len(patients)}")
for p in patients:
    emb_len = 0
    if p.face_embedding:
        try:
            emb = json.loads(p.face_embedding)
            emb_len = len(emb)
        except:
            emb_len = -1
    print(f"ID: {p.id}, Name: {p.name}, Embedding Length: {emb_len}")
db.close()
