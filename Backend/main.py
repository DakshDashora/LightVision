from fastapi import FastAPI
from app.routes import router as agent_router

app = FastAPI(title="LightVision Backend")

app.include_router(agent_router)
