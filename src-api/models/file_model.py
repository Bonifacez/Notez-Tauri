from pydantic import BaseModel


class DeleteFileRequest(BaseModel):
    filePath: str
    sessionId: str
