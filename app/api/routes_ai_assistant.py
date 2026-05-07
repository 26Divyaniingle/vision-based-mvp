from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Optional
import base64
from app.services.ai_assistant_service import AIAssistantService

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/chat")
async def chat_with_assistant(req: ChatRequest):
    """
    General purpose chat endpoint for the AI Assistant.
    """
    messages_dict = [{"role": msg.role, "content": msg.content} for msg in req.messages]
    response = await AIAssistantService.chat(messages_dict)
    return {"reply": response}

@router.post("/analyze-report")
async def analyze_report(
    file: UploadFile = File(...),
    patient_id: Optional[int] = Form(None)
):
    """
    Endpoint to analyze a medical report (image).
    """
    try:
        contents = await file.read()
        image_base64 = base64.b64encode(contents).decode("utf-8")
        
        result = await AIAssistantService.analyze_report(image_base64, file.filename)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeBase64Request(BaseModel):
    image_base64: str
    filename: Optional[str] = "image.jpg"

@router.post("/analyze-report-base64")
async def analyze_report_base64(req: AnalyzeBase64Request):
    """
    Endpoint to analyze a medical report sent as base64.
    """
    result = await AIAssistantService.analyze_report(req.image_base64, req.filename)
    if result["success"]:
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))
