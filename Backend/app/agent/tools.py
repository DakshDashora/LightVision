# app/agent/agent.py
import json
import os
from typing import Dict, Any

from google.genai import Client, types
from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini
from dotenv import load_dotenv

from .agent_core import artifact_service, APP_NAME, USER_ID

# Load Environment
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise RuntimeError("❌ GOOGLE_API_KEY not found in .env")

# Initialize Client
client = Client(api_key=api_key)
VISION_MODEL = "gemini-2.5-pro"

# Helper to safely reconstruct the image part
def get_clean_image_part(stored_artifact):
    """Extracts bytes/mime from the stored artifact and makes a fresh Part."""
    if not stored_artifact:
        return None
        
    # The artifact stored was a types.Part, so it has .inline_data
    try:
        data = stored_artifact.inline_data.data
        mime_type = stored_artifact.inline_data.mime_type
        # Re-create using the official helper to ensure validity
        return types.Part.from_bytes(data=data, mime_type=mime_type)
    except AttributeError:
        # If structure is different, return as is or None
        return stored_artifact

# ===== TOOL: Vision Describe =====
async def vision_describe(image_artifact_filename: str, session_id: str) -> Dict[str, Any]:
    # 1. Try to load the artifact
    try:
        artifact = await artifact_service.load_artifact(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id,
            filename=image_artifact_filename
        )
    except Exception as e:
        print(f"Error loading artifact: {e}")
        artifact = None

    # 2. Check if artifact was actually found
    if not artifact:
        # CRITICAL FIX: Return text error instead of passing None to the model
        return {
            "error": "Image not found.",
            "detail": "Please provide an image URL for this new session."
        }
    
    # 3. Reconstruct the part
    image_part = get_clean_image_part(artifact)
    if not image_part:
        return {"error": "Image data is corrupted or empty."}
    
    prompt = """
    Describe the scene for a blind user.
    Return JSON with keys:
    scene, important_objects, hazards, navigation_cues
    """
    
    # 4. Call Model (Now safe because image_part is guaranteed not None)
    resp = client.models.generate_content(
        model=VISION_MODEL,
        contents=[prompt, image_part],
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    return json.loads(resp.text)

# ===== TOOL: OCR Read =====
async def ocr_read(image_artifact_filename: str, session_id: str) -> Dict[str, Any]:
    try:
        artifact = await artifact_service.load_artifact(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id,
            filename=image_artifact_filename
        )
    except Exception:
        artifact = None

    if not artifact:
        return {
            "error": "Image not found.",
            "detail": "Please provide an image URL for this new session."
        }

    image_part = get_clean_image_part(artifact)
    if not image_part:
        return {"error": "Image data is corrupted or empty."}

    prompt = "Extract all visible text. Return JSON only."
    
    resp = client.models.generate_content(
        model=VISION_MODEL,
        contents=[prompt, image_part],
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    return json.loads(resp.text)

