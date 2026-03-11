"""
Server startup script for Vision Agentic AI MVP
Run this script instead of using uvicorn directly to avoid command-line issues.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

