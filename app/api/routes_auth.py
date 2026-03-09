from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.auth.face_auth import register_face, login_face
from app.auth.token_auth import login_token

router = APIRouter()

class FaceLoginRequest(BaseModel):
    image_base64: str

class FaceRegisterRequest(BaseModel):
    name: str
    age: int = 30
    phone: str = ""
    email: str = ""
    image_base64: str

class TokenLoginRequest(BaseModel):
    token: str

@router.post("/register/face")
def register_with_face(req: FaceRegisterRequest, db: Session = Depends(get_db)):
    res = register_face(db, req.name, req.image_base64, req.age, req.phone, req.email)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["msg"])
    return res

@router.post("/login/face")
def login_with_face(req: FaceLoginRequest, db: Session = Depends(get_db)):
    res = login_face(db, req.image_base64)
    if not res["success"]:
        raise HTTPException(status_code=401, detail=res["msg"])
    return res

@router.post("/login/token")
def login_with_token(req: TokenLoginRequest, db: Session = Depends(get_db)):
    res = login_token(db, req.token)
    if not res["success"]:
        raise HTTPException(status_code=401, detail=res["msg"])
    return res
