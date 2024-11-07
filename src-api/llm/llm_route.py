from datetime import datetime
import json
import traceback
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from models import LLMConfigModel, CompleteRequest, LLMMessage
from utils import get_complete_client, get_emb_client, return_stream_chunk
from openai import OpenAI
from .llm_prompt import PROMPTS
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
def check_client_params_get(request: Request):
    logger.info(f"「GET--check_client_params_get--/」: Check client params {datetime.now()}")
    return JSONResponse(
        status_code=200, content={"message": f"This is Notez Server, {datetime.now()}"}
    )


@router.post("")
def check_client_params_post(request: LLMConfigModel):
    url, api_key, model, emb_url, emb_api_key, emb_model = (
        request.url,
        request.apiKey,
        request.model,
        request.embUrl,
        request.embApiKey,
        request.embModel,
    )
    try:
        if (
            url == None
            or api_key == None
            or model == None
            or emb_url == None
            or emb_api_key == None
            or emb_model == None
        ):
            return Response(status_code=400, content={"error": "Missing parameters"})
        logger.info("「POST--check_client_params_post--/」: Check client params")
        
        openai_client = get_complete_client(url, api_key, model)
        chat_success = False
        chat_error = None
        try:
            chat_response = openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": "This is a test, please respond「SUCCESS」, only 「SUCCESS」",
                    }
                ],
                max_tokens=100,
            )
            chat_success = chat_response.choices[0].message.content == "SUCCESS"
            logger.info(f"「POST--check_client_params_post--/」: Chat success: {chat_success}")
        except Exception as e:
            logger.error(f"「POST--check_client_params_post--/」: Chat error: {str(e)}, {traceback.format_exc()}")
            chat_error = str(e)

        # 测试emb
        emb_client = get_emb_client(emb_url, emb_api_key, emb_model)
        emb_success = False
        emb_error = None
        try:
            emb_response = emb_client.embeddings.create(
                model=emb_model,
                input=["Hello, world"],
            )
            emb_success = (
                len(emb_response.data) > 0 and len(emb_response.data[0].embedding) > 0
            )
            logger.info(f"「POST--check_client_params_post--/」: Emb success: {emb_success}")
        except Exception as e:
            logger.error(f"「POST--check_client_params_post--/」: Emb error: {str(e)}, {traceback.format_exc()}")
            emb_error = str(e)

        response_data = {
            "chatModel": {
                "success": chat_success,
                "error": chat_error,
            },
            "embModel": {
                "success": emb_success,
                "error": emb_error,
            },
        }

        return Response(status_code=200, content=json.dumps(response_data))

    except Exception as e:
        response_data = {"error": str(e)}
        logger.error(f"「POST--check_client_params_post--/」: Error: {str(e)}, {traceback.format_exc()}")
        return Response(status_code=500, content=json.dumps(response_data))


@router.post("/base")
def base_complete(request: CompleteRequest):
    try:
        messages, aiSearch, llmUrlConfig = (
        request.messages,
        request.aiSearch,
        request.llmUrlConfig,
        )
        url, apiKey, model, embUrl, embApiKey, embModel = (
            llmUrlConfig.url,
            llmUrlConfig.apiKey,
            llmUrlConfig.model,
            llmUrlConfig.embUrl,
            llmUrlConfig.embApiKey,
            llmUrlConfig.embModel,
        )
        # print(messages, aiSearch, llmUrlConfig)
        logger.info(f"「POST--base_complete--/base」: Complete base {datetime.now()} - {url} - {model} - messages")
        
        prePrompt = [
            {"role": "system", "content": PROMPTS["base"]},
        ]
        if len(aiSearch) > 0:
            prePrompt = prePrompt + [
                {
                    "role": "system",
                    "content": PROMPTS["withAISearch"].replace(
                        "{{aiSearch}}", " ||| ".join(aiSearch)
                    ),
                },
            ]
        messagesWithPrompt = prePrompt + messages
        print(f"${url} - ${model} - messages")
        logger.info(f"「POST--base_complete--/base」: Complete base {datetime.now()} - {url} - {model} - messages")

        modelClient = get_complete_client(url, apiKey, model)

        response = modelClient.chat.completions.create(
            model=model,
            messages=messagesWithPrompt,
            stream=True,
        )
        return_headers = {
            "Content-Type": "text/event-stream",
        }
        return StreamingResponse(return_stream_chunk(response), headers=return_headers)
    except Exception as e:
        logger.error(f"「POST--base_complete--/base」: Error: {str(e)}, {traceback.format_exc()}")
        return Response(status_code=500, content={"error": str(e)})