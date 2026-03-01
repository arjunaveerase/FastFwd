from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routes_auth import router as auth_router
from app.routes_sheets import router as sheets_router
from app.routes_workflows import router as workflows_router
from app.routes_logs import router as logs_router
from app.config import FRONTEND_URL

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FastFwd SaaS MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://fast-fwd.vercel.app",
        "https://fast-fwd-git-main-arjunaveerases-projects.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sheets_router)
app.include_router(workflows_router)
app.include_router(logs_router)

@app.get("/")
def root():
    return {"message": "FastFwd backend is running"}