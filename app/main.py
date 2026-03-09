from fastapi import FastAPI
from app.api import routes_auth, routes_session, routes_report, routes_interview, routes_ws
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Vision Agentic AI MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_auth.router, prefix="/auth", tags=["auth"])
app.include_router(routes_session.router, prefix="/session", tags=["session"])
app.include_router(routes_report.router, prefix="/report", tags=["report"])
app.include_router(routes_interview.router, prefix="/interview", tags=["interview"])
app.include_router(routes_ws.router, prefix="/ws", tags=["websocket"])

@app.get("/")
def root():
    return {"message": "Vision Agentic AI Core Active"}
