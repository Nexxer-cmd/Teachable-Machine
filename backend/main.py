"""
Teachable Machine Pro — FastAPI Backend
Routes: AI chat (Gemini), project CRUD, model export
"""

import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai

# ── App Setup ──────────────────────────────────────────────
app = FastAPI(
    title="Teachable Machine Pro API",
    description="Backend for AI chat (Gemini) and project management",
    version="1.0.0",
)

# CORS — restrict to frontend domain in production
cors_origins = os.getenv("CORS_ORIGIN", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Gemini Setup ───────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


# ── Health Check ───────────────────────────────────────────
@app.get("/health")
async def health():
    """Health check endpoint for UptimeRobot pings"""
    return {"status": "ok", "service": "teachable-machine-pro"}


# ── Models ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    context: dict  # dataType, numClasses, samplesPerClass, lastAccuracy, lastLoss, epochs


class ProjectSaveRequest(BaseModel):
    id: str
    name: str
    data_type: str
    classes_count: int
    metadata: Optional[dict] = None


# ── AI Chat Router ─────────────────────────────────────────
def build_system_prompt(ctx: dict) -> str:
    """Build context-aware system prompt for Gemini"""
    return f"""
You are an expert ML educator embedded inside Teachable Machine Pro,
a free browser-based machine learning tool for students.

Current project context:
- Data type: {ctx.get('dataType', 'image')} classification
- Classes: {ctx.get('numClasses', 2)} classes
- Samples: {ctx.get('samplesPerClass', 'unknown')}
- Latest accuracy: {ctx.get('lastAccuracy', 'N/A')}%
- Latest loss: {ctx.get('lastLoss', 'N/A')} after {ctx.get('epochs', 0)} epochs

Your responsibilities:
1. Explain ML concepts clearly for beginners — no jargon without explanation.
2. Diagnose problems from the metrics above — be specific, not generic.
3. If accuracy < 70%: suggest exactly what to fix (data, epochs, balance).
4. If accuracy > 90%: warn about possible overfitting, suggest validation.
5. Keep responses concise — bullet points preferred.
6. Always end with ONE follow-up question to deepen understanding.
7. Never mention cost or paid tools — this user is a student using free tools.
"""


@app.post("/api/ai/chat")
async def ai_chat(req: ChatRequest):
    """Stream AI chat response from Gemini API"""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Add GEMINI_API_KEY to .env",
        )

    try:
        system = build_system_prompt(req.context)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system,
        )

        def stream_response():
            try:
                response = model.generate_content(req.message, stream=True)
                for chunk in response:
                    if chunk.text:
                        yield f"data: {json.dumps({'text': chunk.text})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Project Routes ─────────────────────────────────────────
# In-memory store for development (use Supabase in production)
projects_store: dict = {}


@app.get("/api/projects")
async def list_projects():
    """List all saved projects"""
    return {
        "success": True,
        "data": list(projects_store.values()),
    }


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get a specific project by ID"""
    if project_id not in projects_store:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True,
        "data": projects_store[project_id],
    }


@app.post("/api/projects")
async def save_project(req: ProjectSaveRequest):
    """Save project metadata"""
    projects_store[req.id] = req.dict()
    return {
        "success": True,
        "data": {"id": req.id, "message": "Project saved"},
    }


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    if project_id in projects_store:
        del projects_store[project_id]
    return {
        "success": True,
        "data": {"message": "Project deleted"},
    }


# ── Run ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
