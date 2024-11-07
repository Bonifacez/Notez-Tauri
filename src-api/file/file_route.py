from datetime import datetime
import json
import os
import shutil
from fastapi import APIRouter, File, HTTPException, UploadFile, Form, Request, Response
from fastapi.responses import JSONResponse
from utils import sqlite_db, delete_folder_recursive, sqlite_vec
from utils.db import DELETE_NODE, DELETE_NODE_SESSION, DELETE_NODE_VEC_SESSION
from conf import file_state
import traceback
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload")
async def file_upload(request: Request):
    BASE_FILE_URL = file_state.base_file_url
    try:
        data = await request.form()
        files = data.getlist("files")
        sessionId = data.get("sessionId")

        print(f"Uploading {len(files)} files to session {sessionId}")
        logger.info(
            f"「POST--file_upload--/upload」: Uploading {len(files)} files to session {sessionId}"
        )
        if not files:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Please choose any file."},
            )

        if not sessionId:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Session ID is required."},
            )

        sessionDir = os.path.join(
            os.getcwd(), f"{BASE_FILE_URL}Notez-files", "uploads", sessionId
        )

        try:
            os.makedirs(sessionDir, exist_ok=True)
            upload_results = []
            for file in files:
                file_path = os.path.join(sessionDir, file.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                upload_results.append({"name": file.filename, "size": file.size})
            logger.info(
                f"「POST--file_upload--/upload」: Upload success: {upload_results}"
            )
            return JSONResponse(
                status_code=200, content={"success": True, "files": upload_results}
            )

        except Exception as error:
            print(f"Upload error: {error}")
            logger.error(
                f"「POST--file_upload--/upload」: Upload error: {error} == {traceback.format_exc()}"
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": f"An error occurred during upload. {os.getcwd()} {datetime.now()} --- {error} == {traceback.format_exc()}",
                },
            )
    except Exception as error:
        logger.error(
            f"「POST--file_upload--/upload」: Upload error: {error} == {traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"An error occurred during upload. {os.getcwd()} {datetime.now()} --- {error} == {traceback.format_exc()}",
            },
        )


@router.post("/delete")
async def file_delete(request: Request):
    try:
        body = await request.json()
        file_path = body["filePath"]
        file_name = os.path.basename(file_path)
        session_id = body["sessionId"]
        print(f"Deleting file: {file_path}")
        logger.info(f"「POST--file_delete--/delete」: Deleting file: {file_path}")
        # 删除文件
        try:
            os.remove(file_path)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="File not found")
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")

        # 删除db中的记录
        db_client = sqlite_db()
        db_client.execute(DELETE_NODE, (session_id, file_name))
        db_client.commit()
        print("Deleted file from db:", file_name)
        logger.info(f"「POST--file_delete--/delete」: Deleted file from db: {file_name}")
        db_client.close()

        return JSONResponse(content={"success": True, "message": "File deleted"})
    except Exception as error:
        logger.error(
            f"「POST--file_delete--/delete」: Delete error: {error} == {traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"An error occurred during delete. {os.getcwd()} {datetime.now()} --- {error} == {traceback.format_exc()}",
            },
        )


@router.post("/deleteSession")
async def file_deleteSession(request: Request):
    try:
        body = await request.json()
        session_id = body["sessionId"]

        BASE_FILE_URL = file_state.base_file_url
        # 删除文件夹
        delete_folder_recursive(f"{BASE_FILE_URL}Notez-files/uploads/{session_id}")

        # 删除db中的记录
        db_client = sqlite_db()
        db_client.execute(DELETE_NODE_SESSION, (session_id,))
        db_client.commit()
        print("Deleted Session from db:", session_id)
        db_client.close()

        # db_vec = sqlite_vec()
        # db_vec.execute(DELETE_NODE_VEC_SESSION, (f"%{session_id}%",))
        # db_vec.commit()
        # print("Deleted Session from db_vec:", session_id)
        # db_vec.close()

        return JSONResponse(content={"success": True, "message": "Session deleted"})
    except Exception as error:
        logger.error(
            f"「POST--file_deleteSession--/deleteSession」: Delete error: {error} == {traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"An error occurred during delete. {os.getcwd()} {datetime.now()} --- {error} == {traceback.format_exc()}",
            },
        )
