# app/agent/runner_helper.py
import aiohttp
import json
import base64
from google.genai import types
from google.adk.runners import Runner

from .agent_core import APP_NAME, USER_ID, session_service, artifact_service
from .agent import lightvision_agent

runner = Runner(
    agent=lightvision_agent,
    app_name=APP_NAME,
    session_service=session_service,
    artifact_service=artifact_service,
)

async def run_session(
    user_text: str | None = None,
    user_image_url: str | None = None,
    user_id: str | None = None,
    session_id: str = "default_session",
):
    """Run a LightVision session using an online image URL."""

    user_id = user_id or USER_ID

    # Create or reuse session
    try:
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
    except:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )

    payload = {"session_id": session.id}

    if user_text:
        payload["user_text"] = user_text

    # === IMAGE HANDLING ===
    if user_image_url:
        img_bytes = None
        mime_type = "image/jpeg" # Default fallback
        
        # 1. Handle Base64 Data URL (e.g. data:image/png;base64,...)
        if user_image_url.startswith("data:"):
            try:
                header, encoded = user_image_url.split(",", 1)
                img_bytes = base64.b64decode(encoded)
                if "image/" in header:
                    mime_type = header.split(":")[1].split(";")[0]
            except Exception as e:
                print(f"Error decoding base64: {e}")
                
        # ... inside runner_helper.py ...

        # 2. Handle Web URL (STEALTH MODE)
        else:
            # Full browser mimicry to bypass 403 blocks
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.google.com/"
            }
            
            async with aiohttp.ClientSession(headers=headers) as client:
                async with client.get(user_image_url) as resp:
                    if resp.status != 200:
                        print(f"❌ Failed to fetch image: {resp.status} - {resp.reason}")
                        img_bytes = None # Ensure we don't crash later
                    else:
                        # ... extraction logic stays same ...
                        content_type = resp.headers.get('Content-Type', '')
                        if 'image' in content_type:
                             mime_type = content_type.split(";")[0].strip()
                        img_bytes = await resp.read()
                

        if img_bytes:
            # 1. Create Blob
            blob = types.Blob(data=img_bytes, mime_type=mime_type)
            
            # 2. Wrap in Part (Google native format)
            image_artifact = types.Part(inline_data=blob)

            # 3. Save to Artifact Service
            await artifact_service.save_artifact(
                app_name=APP_NAME,
                user_id=user_id,
                session_id=session.id,
                filename="user_image.jpg",
                artifact=image_artifact 
            )

            payload["image_artifact_filename"] = "user_image.jpg"

    # Construct query
    query = types.Content(
        role="user",
        parts=[types.Part(text=json.dumps(payload))]
    )

    print(f"\n=== Session: {session_id} ===")

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=query,
    ):
        if event.content and event.content.parts:
            text = event.content.parts[0].text
            if text and text != "None":
                yield text