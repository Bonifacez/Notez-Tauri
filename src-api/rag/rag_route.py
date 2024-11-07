import json
import traceback
from typing import Dict, List, Union
from fastapi import APIRouter, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from utils import sqlite_db, sqlite_vec, middleware_db
from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter
from utils import get_emb_client
from utils.db import (
    INSERT_MIDDLEWARE,
    INSERT_NODE,
    INSET_VEC_EMBEDDING,
    SELECT_FILE_NAME_DUPLICATES,
    SELECT_ID_TEXT,
    SELECT_MIDDLEWARE_ID,
    SELECT_VEC,
    UPDATE_EMBEDDING,
)
from sqlite_vec import serialize_float32
import logging

logger = logging.getLogger(__name__)


router = APIRouter()


# 加入embStack是因为，改post会定时调用，每次调用的session_id可能不同，所以需要一个全局变量来存储
embStack = {}
embeddingIng = False
length_text = 0
finished = 0
acc_post_time = 0  # 累计post次数，这个主要针对embedding 失败的情况，如果连续10次post都失败，就重置embeddingIng


# Function to handle the embedding process in the background
async def process_embedding(
    session_id, emb_client, db_vec, middleware_client, embModel
):
    global embeddingIng, embStack, length_text, finished

    sessionData = embStack[session_id]
    for item in sessionData:
        if item["embedding"] != "null":
            continue
        embeddingIng = True
        itemEmbeded = middleware_client.execute(
            SELECT_MIDDLEWARE_ID, (item["id"],)
        ).fetchone()

        if itemEmbeded is None:
            text = item["text"]
            print("openaiClient start", session_id, item["id"])
            logger.info(
                f"「process_embedding」: openaiClient start {session_id}, {item['id']}"
            )
            response = emb_client.embeddings.create(
                model=embModel,
                input=[text],
            )
            embedding = response.data[0].embedding[:1024]
            # If embedding length is less than 1024, pad with zeros
            if len(embedding) < 1024:
                embedding.append([0.0] * (1024 - len(embedding)))
            db_vec.execute(UPDATE_EMBEDDING, (json.dumps(embedding), item["id"]))
            finished += 1
            middleware_client.execute(INSERT_MIDDLEWARE, (item["id"], "finished"))

            db_embedding = serialize_float32(embedding)
            vec_id = item["id"] + "_vec_" + session_id
            db_vec.execute(INSET_VEC_EMBEDDING, (vec_id, db_embedding))
            print("openaiClient done", session_id, item["id"])
            logger.info(
                f"「process_embedding」: openaiClient done {session_id}, {item['id']}"
            )

            db_vec.commit()
            middleware_client.commit()

    embeddingIng = False
    embStack.pop(session_id)
    db_vec.close()
    middleware_client.close()
    print(f"Embedding done for session {session_id}")


@router.post("/emb")
async def rag_emb(request: Request, background_tasks: BackgroundTasks):
    global embeddingIng, embStack, length_text, finished, acc_post_time
    body = await request.json()
    session_id = body["sessionId"]
    llmUrlConfig = body["llmUrlConfig"]
    embUrl, embApiKey, embModel = (
        llmUrlConfig["embUrl"],
        llmUrlConfig["embApiKey"],
        llmUrlConfig["embModel"],
    )
    print(
        "len(background_tasks)",
        len(background_tasks.tasks),
        "acc_post_time",
        acc_post_time,
        "embeddingIng",
        embeddingIng,
        embUrl,
        embApiKey,
        embModel,
    )
    logger.info(
        f"「POST--emb--/api/rag」: session_id: {session_id}, len(background_tasks): {len(background_tasks.tasks)}, acc_post_time: {acc_post_time}, embeddingIng: {embeddingIng}, embUrl: {embUrl}, embApiKey: {embApiKey}, embModel: {embModel}"
    )

    if (
        (acc_post_time > 10)
        and (len(background_tasks.tasks) == 0)
        and (embeddingIng == True)
    ):
        embeddingIng = False
        print("Reset embeddingIng")
    acc_post_time += 1

    # If embedding is already in progress, return status
    if embeddingIng:
        logger.info(
            f"「POST--emb--/api/rag」: Embedding is in progress, please wait. {session_id}"
        )
        return JSONResponse(
            status_code=200,
            content={
                "total": length_text,
                "finished": finished,
                "message": "Embedding is in progress, please wait.",
            },
        )

    db_vec = sqlite_vec()
    middleware_client = middleware_db()

    db_data = db_vec.execute(SELECT_ID_TEXT, (session_id,)).fetchall()
    emb_data = [{"id": i[0], "text": i[1], "embedding": i[2]} for i in db_data]

    length_text = len(emb_data)
    finished = sum(1 for item in emb_data if item["embedding"] != "null")

    embStack[session_id] = emb_data
    emb_client = get_emb_client(embUrl, embApiKey, embModel)

    # Add the embedding task to the background
    background_tasks.add_task(
        process_embedding, session_id, emb_client, db_vec, middleware_client, embModel
    )

    acc_post_time = 0

    return_content = {"total": length_text, "finished": finished}
    logger.info(
        f"「POST--emb--/api/rag」: Embedding done for session {session_id}, {return_content}"
    )
    return JSONResponse(status_code=200, content=return_content)


@router.post("/emb_state")
async def rag_emb(request: Request, background_tasks: BackgroundTasks):
    global embeddingIng, embStack, acc_post_time
    body = await request.json()
    session_id = body["sessionId"]
    total = 0
    done = 0
    logger.info(f"「POST--emb_state--/api/rag」: {session_id}")
    try:
        if embeddingIng:
            data = embStack[session_id]
            total = len(data)
            done = sum(1 for item in data if item["embedding"] != "null")
            logger.info(
                f"「POST--emb_state--/api/rag」: Embedding is in progress, please wait. {session_id}"
            )
            return JSONResponse(
                status_code=200,
                content={
                    "total": total,
                    "finished": done,
                    "message": "Embedding is in progress, please wait.",
                },
            )
        else:
            db_client = sqlite_db()
            db_data = db_client.execute(SELECT_ID_TEXT, (session_id,)).fetchall()
            emb_data = [{"id": i[0], "text": i[1], "embedding": i[2]} for i in db_data]
            total = len(emb_data)
            done = sum(1 for item in emb_data if item["embedding"] != "null")
            logger.info(
                f"「POST--emb_state--/api/rag」: Embedding is finished. {session_id}"
            )
            return JSONResponse(
                status_code=200,
                content={
                    "total": total,
                    "finished": done,
                    "message": "Embedding is finished.",
                },
            )
    except Exception as e:
        print("Error in emb_state", {traceback.format_exc()})
        logger.error(
            f"「POST--emb_state--/api/rag」: Error in emb_state. {traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "total": total,
                "finished": done,
                "message": f"Error in emb_state. {traceback.format_exc()}",
            },
        )


#  之前的代码
# @router.post("/emb")
# async def rag_emb(request: Request):
#     global embeddingIng, embStack, length_text, finished
#     body = await request.json()
#     session_id = body["sessionId"]
#     llmUrlConfig = body["llmUrlConfig"]
#     url, apiKey, model, embUrl, embApiKey, embModel = (
#         llmUrlConfig["url"],
#         llmUrlConfig["apiKey"],
#         llmUrlConfig["model"],
#         llmUrlConfig["embUrl"],
#         llmUrlConfig["embApiKey"],
#         llmUrlConfig["embModel"],
#     )
#     # 放到这里，是为了避免sqlite3.OperationalError: database is locked
#     if embeddingIng == True:
#         return JSONResponse(
#             status_code=200,
#             content={
#                 "total": length_text,
#                 "finished": finished,
#                 "message": "Embedding is in progress, please wait.",
#             },
#         )
#     db_vec = sqlite_vec()
#     middleware_client = middleware_db()

#     db_data = db_vec.execute(SELECT_ID_TEXT, (session_id,)).fetchall()
#     emb_data = [{"id": i[0], "text": i[1], "embedding": i[2]} for i in db_data]

#     length_text = len(emb_data)
#     finished = sum(1 for item in emb_data if item["embedding"] != "null")

#     embStack[session_id] = emb_data
#     sessionData = embStack[session_id]

#     emb_client = get_emb_client(embUrl, embApiKey, embModel)

#     for item in sessionData:
#         if item["embedding"] != "null":
#             continue
#         embeddingIng = True
#         itemEmbeded = middleware_client.execute(
#             SELECT_MIDDLEWARE_ID, (item["id"],)
#         ).fetchone()

#         if itemEmbeded is None:
#             text = item["text"]
#             print("openaiClient start", session_id, item["id"])
#             response = emb_client.embeddings.create(
#                 model=embModel,
#                 input=[text],
#             )
#             embedding = response.data[0].embedding[:1024]
#             # 如果embedding的长度不够1024，就补0
#             if len(embedding) < 1024:
#                 embedding.append([0.0] * (1024 - len(embedding)))
#             db_vec.execute(UPDATE_EMBEDDING, (json.dumps(embedding), item["id"]))
#             finished += 1
#             middleware_client.execute(INSERT_MIDDLEWARE, (item["id"], "finished"))

#             db_embedding = serialize_float32(embedding)
#             vec_id = item["id"] + "_vec_" + session_id
#             db_vec.execute(INSET_VEC_EMBEDDING, (vec_id, db_embedding))
#             print("openaiClient done", session_id, item["id"])

#             db_vec.commit()
#             middleware_client.commit()

#     embeddingIng = False

#     # 清空embStack中的sessionId对应的数据
#     embStack.pop(session_id)

#     db_vec.close()
#     middleware_client.close()
#     return_content = {"total": length_text, "finished": finished}
#     print("emb done", session_id, return_content)
#     return JSONResponse(status_code=200, content=return_content)


@router.post("/split")
async def rag_split(request: Request):
    try:
        body = await request.json()
        file_dir = body["fileDir"]
        session_id = body["sessionId"]
        logger.info(f"「POST--split--/api/rag」: {session_id}, {file_dir}")

        db_client = sqlite_db()

        documents = SimpleDirectoryReader(input_dir=file_dir).load_data()
        splitter = SentenceSplitter(chunk_size=512)
        nodes = splitter.get_nodes_from_documents(documents)

        print("nodes parsed", session_id, file_dir)
        logger.info(f"「POST--split--/api/rag」: nodes parsed {session_id}, {file_dir}")

        file_names = db_client.execute(
            SELECT_FILE_NAME_DUPLICATES, (session_id,)
        ).fetchall()
        file_names = [item[0] for item in file_names]

        # nodes 写入数据库
        insert_node_count = 0
        for node in nodes:
            if node.metadata["file_name"] in file_names:
                print("file_name exists", node.metadata["file_name"])
                continue
            node_dict = node.to_dict()
            insert_data = (
                node_dict["id_"],
                session_id,
                json.dumps(node_dict["metadata"]),
                node_dict["metadata"]["file_name"],
                json.dumps(node_dict["excluded_embed_metadata_keys"]),
                json.dumps(node_dict["excluded_llm_metadata_keys"]),
                json.dumps(node_dict["relationships"]),
                json.dumps(node_dict["embedding"]),
                node_dict["text"],
                node_dict["text_template"],
                node_dict.get("metadata_separator", ""),
                node_dict["start_char_idx"],
                node_dict["end_char_idx"],
            )
            logger.info(
                f"「POST--split--/api/rag」: start insert node {session_id}, {node_dict['id_']}"
            )

            db_client.execute(INSERT_NODE, insert_data)
            db_client.commit()
            insert_node_count += 1
            logger.info(
                f"「POST--split--/api/rag」: end insert node {session_id}, {node_dict['id_']}, {insert_node_count}"
            )

        db_client.close()
        print("nodes inserted", session_id, insert_node_count)
        logger.info(
            f"「POST--split--/api/rag」: nodes inserted {session_id}, {insert_node_count}"
        )
        return JSONResponse(content={"success": True, "message": "Split success"})
    except Exception as e:
        print(f"Error in split {traceback.format_exc()}")
        logger.error(
            f"「POST--split--/api/rag」: Error in split {traceback.format_exc()}"
        )
        return JSONResponse(
            content={
                "success": False,
                "message": f"Error in split {traceback.format_exc()}",
            }
        )


@router.post("/fileSearch")
async def rag_file_search(request: Request):
    try:
        body = await request.json()
        session_id = body["sessionId"]
        text = body["text"]
        llmUrlConfig = body["llmUrlConfig"]
        embUrl, embApiKey, embModel = (
            llmUrlConfig["embUrl"],
            llmUrlConfig["embApiKey"],
            llmUrlConfig["embModel"],
        )
        logger.info(
            f"「POST--fileSearch--/api/rag」: {session_id}, embUrl: {embUrl}, embApiKey: {embApiKey}, embModel: {embModel}"
        )

        emb_client = get_emb_client(embUrl, embApiKey, embModel)
        post_emb_res = emb_client.embeddings.create(
            model=embModel,
            input=[text],
        )
        post_emb = serialize_float32(post_emb_res.data[0].embedding[:1024])

        sqlite_vec_client = sqlite_vec()

        vec_like_id = f"%{session_id}%"
        query_res = sqlite_vec_client.execute(
            SELECT_VEC, (post_emb, vec_like_id)
        ).fetchall()
        query_res_with_clean_id = [
            {"id": item[0].split("_vec_")[0], "distance": item[1]} for item in query_res
        ]

        ids = [item["id"] for item in query_res_with_clean_id]
        placeholders = ",".join(["?" for _ in ids])

        SELECT_IDs_query = f"SELECT id, text_ FROM nodes WHERE id IN ({placeholders});"
        query_text = sqlite_vec_client.execute(SELECT_IDs_query, ids).fetchall()

        search_res = [
            {
                "id": item[0],
                "text": item[1],
                "distance": next(
                    res["distance"]
                    for res in query_res_with_clean_id
                    if res["id"] == item[0]
                ),
            }
            for item in query_text
        ]

        search_res.sort(key=lambda x: x["distance"])
        search_list = [item["text"] for item in search_res]
        print(f"searchList {len(search_list)}")
        logger.info(f"「POST--fileSearch--/api/rag」: searchList {len(search_list)}")

        sqlite_vec_client.close()

        return JSONResponse(content={"success": True, "searchList": search_list})
    except Exception as e:
        print(f"Error in fileSearch {traceback.format_exc()}")
        logger.error(
            f"「POST--fileSearch--/api/rag」: Error in fileSearch {traceback.format_exc()}"
        )
        return JSONResponse(
            content={
                "success": False,
                "message": f"Error in fileSearch {traceback.format_exc()}",
            }
        )
