from pydantic import BaseModel
from typing import Optional


class AgentRequest(BaseModel):
    text: Optional[str] = None
    image_path: Optional[str] = None


class AgentResponse(BaseModel):
    response: str
