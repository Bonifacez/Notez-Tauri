import os
import sqlite3
from sqlite_vec import load as sqlite_vec_load
from conf import file_state
import logging

logger = logging.getLogger(__name__)

def mkdir_sync(path):
    try:
        os.makedirs(path, exist_ok=True)
    except Exception as error:
        print("Create directory error:", error)


def sqlite_db():
    base_file_url = file_state.base_file_url
    print("sqlite_db base_file_url---", base_file_url)
    logging.info(f"sqlite_db base_file_url--- {base_file_url}")
    mkdir_sync(f"{base_file_url}Notez-files/rag")
    # db = sqlite3.connect(f"{BASE_FILE_URL}Notez-files/rag/nodes.db")
    db = sqlite3.connect(f"{base_file_url}Notez-files/rag/nodes.db")
    # print("sqlite_db file", f"{base_file_url}Notez-files/rag/nodes.db")
    db.execute(CREATE_TABLE)
    return db


def sqlite_vec():
    db = sqlite_db()
    db.enable_load_extension(True)
    sqlite_vec_load(db)
    db.execute(CREATE_TABLE_VEC)
    db.enable_load_extension(False)
    return db


def middleware_db():
    base_file_url = file_state.base_file_url
    print("middleware_db base_file_url---", base_file_url)
    # logging.error("middleware_db base_file_url---", base_file_url)
    logger.error(f"middleware_db base_file_url--- {base_file_url}")
    mkdir_sync(f"{base_file_url}Notez-files/rag")
    # db = sqlite3.connect(f"{BASE_FILE_URL}Notez-files/rag/middleware.db")
    db = sqlite3.connect(f"{base_file_url}Notez-files/rag/middleware.db")
    print("middleware_db file", f"{base_file_url}Notez-files/rag/middleware.db")
    db.execute(CREATE_TABLE_MIDDLEWARE)
    db.execute(CREATE_TRIGGER_MIDDLEWARE)
    db.execute(CREATE_TRIGGER_MIDDLEWARE_UPDATE)
    return db


CREATE_TABLE = (
    "CREATE TABLE IF NOT EXISTS nodes("
    "id TEXT PRIMARY KEY, "
    "sessionId TEXT, "
    "metadata TEXT, "
    "fileName TEXT, "
    "excludedEmbedMetadataKeys TEXT, "
    "excludedLlmMetadataKeys TEXT, "
    "relationships TEXT, "
    "embedding TEXT, "
    "text_ TEXT, "
    "textTemplate TEXT, "
    "metadataSeparator TEXT, "
    "startCharIdx INTEGER, "
    "endCharIdx INTEGER"
    ");"
)

CREATE_TABLE_MIDDLEWARE = (
    "CREATE TABLE IF NOT EXISTS middleware("
    "id TEXT PRIMARY KEY, "
    "statue TEXT, "
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
    ");"
)

CREATE_TRIGGER_MIDDLEWARE = (
    "CREATE TRIGGER IF NOT EXISTS middleware_trigger "
    "AFTER INSERT ON middleware "
    "BEGIN "
    "   DELETE FROM middleware WHERE created_at < datetime('now', '-1 day'); "
    "END;"
)

CREATE_TRIGGER_MIDDLEWARE_UPDATE = (
    "CREATE TRIGGER IF NOT EXISTS middleware_trigger_update "
    "AFTER UPDATE ON middleware "
    "BEGIN "
    "   DELETE FROM middleware WHERE created_at < datetime('now', '-1 day'); "
    "END;"
)

CREATE_TABLE_VEC = (
    "CREATE VIRTUAL TABLE IF NOT EXISTS nodes_vec USING vec0("
    "id TEXT PRIMARY KEY, "
    "embedding FLOAT[1024]"
    ");"
)

SELECT_MIDDLEWARE = "SELECT * FROM middleware"

SELECT_MIDDLEWARE_ID = "SELECT id, statue FROM middleware WHERE id = ?"

SELECT_FILE_NAME_DUPLICATES = "SELECT DISTINCT fileName FROM nodes WHERE sessionId = ?;"

SELECT_ID_TEXT = "SELECT id, text_, embedding FROM nodes WHERE sessionId = ?"

SELECT_VEC = """
SELECT id, distance
FROM (
    SELECT id, distance
    FROM nodes_vec
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT 200
)
WHERE id LIKE ?
ORDER BY distance ASC
LIMIT 5;
"""

INSERT_NODE = (
    "INSERT INTO nodes (id, sessionId, metadata, fileName, excludedEmbedMetadataKeys, excludedLlmMetadataKeys, relationships, embedding, text_, textTemplate, metadataSeparator, startCharIdx, endCharIdx) "
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
)

INSERT_MIDDLEWARE = "INSERT OR REPLACE INTO middleware (id, statue) VALUES (?, ?);"

# const INSERT_EMBEDDING = "INSERT INTO nodes (embedding) VALUES (?) WHERE id = ?;";
UPDATE_EMBEDDING = "UPDATE nodes SET embedding = ? WHERE id = ?;"

INSET_VEC_EMBEDDING = "INSERT OR REPLACE INTO nodes_vec (id, embedding) VALUES (?, ?);"

DELETE_NODE = "DELETE FROM nodes WHERE sessionId = ? AND fileName = ?;"

DELETE_NODE_SESSION = "DELETE FROM nodes WHERE sessionId = ?;"

DELETE_NODE_VEC_SESSION = "DELETE FROM nodes_vec WHERE id LIKE ?;"
