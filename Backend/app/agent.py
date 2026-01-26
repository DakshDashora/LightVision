from typing import Optional
import vertexai
from vertexai.preview.generative_models import Part
from .config import PROJECT_ID, LOCATION, AGENT_ENGINE_NAME

client = vertexai.Client(project=PROJECT_ID, location=LOCATION)
adk_app = client.agent_engines.get(name=AGENT_ENGINE_NAME)


async def run_agent(
    user_text: str,
    user_image_path: Optional[str] = None,
    session_id: Optional[str] = None,
):
    parts = []

    # 1. Add text
    if user_text:
        parts.append(Part.from_text(user_text))

    # 2. Add image (directly, NOT via artifact_service)
    if user_image_path:
        with open(user_image_path, "rb") as f:
            image_bytes = f.read()

        parts.append(
            Part.from_data(
                data=image_bytes,
                mime_type="image/jpeg"
            )
        )

    # 3. Stream response from DEPLOYED agent
    full_answer = ""

    async for event in adk_app.async_stream_query(
        user_id="USER_ID",
        session_id=session_id,  # optional
        message=parts,          # <-- THIS is the key
    ):
        if event.text:
            print("> " + event.text)
            full_answer += event.text

    return full_answer
