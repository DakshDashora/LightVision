from pydantic import BaseModel
from typing import Optional, List


class QueryRequest(BaseModel):
    user_text: Optional[str] = None
    user_image_url: Optional[str] = None
    session_id: Optional[str] = "default_session"

class QueryResponse(BaseModel):
    session_id:str
    response:List[str]
