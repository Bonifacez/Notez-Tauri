from typing import List, Optional
from pydantic import BaseModel, Field


class LLMConfigModel(BaseModel):
    url: str = Field(None, title="URL of the LLM model")
    apiKey: str = Field(None, title="API key of the LLM model")
    model: str = Field(None, title="Model name of the LLM model")
    embUrl: str = Field(None, title="URL of the embedding model")
    embApiKey: str = Field(None, title="API key of the embedding model")
    embModel: str = Field(None, title="Model name of the embedding model")


class ModelResponse(BaseModel):
    success: bool
    error: Optional[str] = None


class CheckParamsResponse(BaseModel):
    chatModel: ModelResponse
    embModel: ModelResponse


class LLMMessage(BaseModel):
    role: str = Field(
        None,
        title="Role of the message",
        description="Can be 'system', 'user', or 'assistant'",
    )
    content: str = Field(None, title="Content of the message")


class CompleteRequest(BaseModel):
    messages: List[LLMMessage]
    aiSearch: List[str]
    llmUrlConfig: LLMConfigModel
