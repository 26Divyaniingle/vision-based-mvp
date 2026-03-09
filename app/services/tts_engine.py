"""
Text-to-Speech Engine
Uses edge-tts as a fast, high-quality free alternative to ElevenLabs/Coqui.
It generated streaming audio bytes that can be sent over WebSocket.
"""
import edge_tts
import asyncio
import io

VOICE_MAP = {
    "English": "en-US-AriaNeural",
    "Spanish": "es-ES-ElviraNeural",
    "Hindi": "hi-IN-SwaraNeural",
    "French": "fr-FR-DeniseNeural",
    "Arabic": "ar-SA-ZariyahNeural",
    "Portuguese": "pt-BR-FranciscaNeural",
    "German": "de-DE-KatjaNeural",
    "Italian": "it-IT-ElsaNeural",
    "Russian": "ru-RU-SvetlanaNeural",
    "Japanese": "ja-JP-NanamiNeural",
    "Korean": "ko-KR-SunHiNeural",
    "Chinese": "zh-CN-XiaoxiaoNeural",
    "Marathi": "mr-IN-AarohiNeural",
    "Hinglish": "en-IN-NeerjaNeural"
}

async def generate_speech_bytes(text: str, language: str = "English") -> bytes:
    """
    Generate speech using edge_tts and return as bytes for the WebSocket.
    Automatically maps the language to the appropriate native neural voice.
    """
    voice = VOICE_MAP.get(language, "en-US-AriaNeural")
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    return audio_data
