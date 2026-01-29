from fastapi import APIRouter, HTTPException
from app.schemas import QueryRequest, QueryResponse
import asyncio
from app.agent.runner_helper import run_session

router = APIRouter(
    prefix = '/query',
    tags = ['query']
)

@router.post("/query", response_model=QueryResponse)
async def query_lightvision(request: QueryRequest):
    """
    Endpoint to query LightVision agent.
    Accepts:
    - user_text: Optional text question
    - user_image_url: Optional image URL
    - session_id: Optional session identifier (default 'default_session')
    """

    try:
        # Collect printed output into a list
        output_lines = []

        async def capture_output(user_text, user_image_url, session_id):
            async for line in run_session(
                user_text=user_text,
                user_image_url=user_image_url,
                session_id=session_id
            ):
                output_lines.append(line)

        # Run the session
        await capture_output(
            request.user_text, request.user_image_url, request.session_id
        )

        return QueryResponse(
            session_id = request.session_id,
            response = output_lines
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
