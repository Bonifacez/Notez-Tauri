from datetime import datetime
import os
import sys
from fastapi.responses import JSONResponse
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from llm import router as llm_route
from file import router as file_route
from rag import router as rag_route
from utils import init_logging
from utils.db import INSERT_MIDDLEWARE, mkdir_sync
from conf import file_state
import logging
import traceback

app = FastAPI(
    title="Notez API server",
    version="0.1.0",
)

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)


@app.get("/api")
def connect():
    logger.info(
        f"「GET--connect--/api」: Connect to Notez Server, {os.getcwd()} - {os.listdir()} {datetime.now()}"
    )
    return JSONResponse(
        status_code=200,
        content={
            "message": f"This is Notez Server, {os.getcwd()} - {os.listdir()} {datetime.now()}"
        },
    )


@app.post("/api")
async def filebase(request: Request):
    global BASE_FILE_URL
    logger.info(f"「POST--filebase--/api」: Set base file url {datetime.now()}")
    body = await request.json()
    user_file_url = body.get("userFileUrl")
    if user_file_url.strip() != "":
        try:
            logger.info(
                f"「POST--filebase--/api」: Set base file url to {user_file_url}"
            )
            file_state.base_file_url = user_file_url
            os.makedirs(f"{file_state.base_file_url}", exist_ok=True)
            init_logging(f"{file_state.base_file_url}notez.log")
            print(f"{os.getcwd()}")
            print(f'init_logging("{file_state.base_file_url}notez.log")')
            logger.info(
                f"「POST--filebase--/api」: Set base file url to {user_file_url} successfully"
            )

        except Exception as e:
            print(f"Error creating directory {user_file_url}: {traceback.format_exc()}")
            logger.error(
                f"「POST--filebase--/api」: Error creating directory {user_file_url}: {traceback.format_exc()}"
            )
            return JSONResponse(
                status_code=500,
                content={
                    "message": f"Error creating directory {user_file_url}: {traceback.format_exc()}"
                },
            )
        return JSONResponse(
            status_code=200,
            content={"message": f"Base file url set to {user_file_url}"},
        )


app.include_router(llm_route, prefix="/api/llm")
app.include_router(file_route, prefix="/api/file")
app.include_router(rag_route, prefix="/api/rag")


if __name__ == "__main__":
    uvicorn.run(app, port=18321)
