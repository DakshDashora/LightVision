# agent_core.py
import os
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts import InMemoryArtifactService



# ===== App constants =====
APP_NAME = "lightvision"
USER_ID = "default"

# ===== ADK services =====
session_service = InMemorySessionService()
artifact_service = InMemoryArtifactService()




    
