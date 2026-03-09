from app.database.crud import get_all_patients
from app.core.similarity_engine import cosine_similarity
from sqlalchemy.orm import Session
import json

def find_best_match(db: Session, login_embedding: list, threshold: float = 0.70):
    patients = get_all_patients(db)
    best_match = None
    best_score = -1.0
    
    for p in patients:
        if not p.face_embedding:
            continue
        try:
            stored_emb = json.loads(p.face_embedding)
            score = cosine_similarity(login_embedding, stored_emb)
            if score > best_score:
                best_score = score
                best_match = p
        except Exception as e:
            continue
            
    if best_score >= threshold:
        return best_match, best_score
    return None, best_score
