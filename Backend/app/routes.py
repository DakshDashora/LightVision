from fastapi import APIRouter, HTTPException
from .schemas import AgentRequest, AgentResponse
from .agent import run_agent

router = APIRouter()


@router.post("/query", response_model=AgentResponse)
async def query_agent_endpoint(req: AgentRequest):
    # Basic validation
    if not req.text and not req.image_path:
        raise HTTPException(
            status_code=400,
            detail="Provide at least text or image"
        )

    try:
        result = await run_agent(
            user_text=req.text,
            user_image_path=req.image_path,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    return AgentResponse(response=result)
