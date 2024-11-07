import Database from "better-sqlite3";
import fs, { mkdir } from "fs";
import * as sqliteVec from "sqlite-vec";

function mkdirSync() {
    try {
        mkdir("files/rag", { recursive: true }, (error) => {
            if (error) {
                console.error("Create directory error:", error);
            }
        });
    } catch (error) {
        console.error("Create directory error:", error);
    }
}

function middlewareDB() {
    mkdirSync();
    const db = new Database("files/rag/middleware.db");
    db.exec(CREATE_TABLE_MIDDLEWARE);
    db.exec(CREATE_TRIGGER_MIDDLEWARE);
    db.exec(CREATE_TRIGGER_MIDDLEWARE_UPDATE);
    return db;
}

function sqliteDB() {
    mkdirSync();
    const db = new Database("files/rag/nodes.db");
    db.exec(CREATE_TABLE);
    return db;
}

function sqliteVEC() {
    const db = sqliteDB();
    sqliteVec.load(db);
    db.exec(CREATE_TABLE_VEC);
    return db;
}

const CREATE_TABLE =
    "CREATE TABLE IF NOT EXISTS nodes(" +
    "id TEXT PRIMARY KEY, " +
    "sessionId TEXT, " +
    "metadata TEXT, " +
    "fileName TEXT, " +
    "excludedEmbedMetadataKeys TEXT, " +
    "excludedLlmMetadataKeys TEXT, " +
    "relationships TEXT, " +
    "embedding TEXT, " +
    "text_ TEXT, " +
    "textTemplate TEXT, " +
    "metadataSeparator TEXT, " +
    "startCharIdx INTEGER, " +
    "endCharIdx INTEGER" +
    ");";

const CREATE_TABLE_MIDDLEWARE =
    "CREATE TABLE IF NOT EXISTS middleware(" +
    "id TEXT PRIMARY KEY, " +
    "statue TEXT, " +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
    ");";

const CREATE_TRIGGER_MIDDLEWARE =
    "CREATE TRIGGER IF NOT EXISTS middleware_trigger " +
    "AFTER INSERT ON middleware " +
    "BEGIN " +
    "   DELETE FROM middleware WHERE created_at < datetime('now', '-1 day'); " +
    "END;";

const CREATE_TRIGGER_MIDDLEWARE_UPDATE =
    "CREATE TRIGGER IF NOT EXISTS middleware_trigger_update " +
    "AFTER UPDATE ON middleware " +
    "BEGIN " +
    "   DELETE FROM middleware WHERE created_at < datetime('now', '-1 day'); " +
    "END;";
const CREATE_TABLE_VEC =
    "CREATE VIRTUAL TABLE IF NOT EXISTS nodes_vec USING vec0(" +
    "id TEXT PRIMARY KEY, " +
    "embedding FLOAT[1024]" +
    ");";

const SELECT_MIDDLEWARE = "SELECT * FROM middleware";

const SELECT_MIDDLEWARE_ID = "SELECT id, statue FROM middleware WHERE id = ?";

const SELECT_FILE_NAME_DUPLICATES =
    "SELECT DISTINCT fileName FROM nodes WHERE sessionId = ?;";

const SELECT_ID_TEXT =
    "SELECT id, text_, embedding FROM nodes WHERE sessionId = ?";



const SELECT_VEC = `
SELECT id, distance
FROM (
    SELECT id, distance
    FROM nodes_vec
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT 50
)
WHERE id LIKE ?
ORDER BY distance ASC
LIMIT 5;
`;

const INSERT_NODE =
    "INSERT INTO nodes (id, sessionId, metadata, fileName, excludedEmbedMetadataKeys, excludedLlmMetadataKeys, relationships, embedding, text_, textTemplate, metadataSeparator, startCharIdx, endCharIdx) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
const INSERT_MIDDLEWARE =
    "INSERT OR REPLACE INTO middleware (id, statue) VALUES (?, ?);";

// const INSERT_EMBEDDING = "INSERT INTO nodes (embedding) VALUES (?) WHERE id = ?;";
const UPDATE_EMBEDDING = "UPDATE nodes SET embedding = ? WHERE id = ?;";

const INSET_VEC_EMBEDDING =
    "INSERT OR REPLACE INTO nodes_vec (id, embedding) VALUES (?, ?);";

const DELETE_NODE = "DELETE FROM nodes WHERE sessionId = ? AND fileName = ?;";

const DELETE_NODE_SESSION = "DELETE FROM nodes WHERE sessionId = ?;";

export { sqliteDB, sqliteVEC, middlewareDB };

export {
    INSERT_NODE,
    UPDATE_EMBEDDING,
    SELECT_FILE_NAME_DUPLICATES,
    SELECT_ID_TEXT,
    DELETE_NODE,
    DELETE_NODE_SESSION,
    CREATE_TABLE_MIDDLEWARE,
    CREATE_TRIGGER_MIDDLEWARE,
    CREATE_TRIGGER_MIDDLEWARE_UPDATE,
    INSERT_MIDDLEWARE,
    SELECT_MIDDLEWARE,
    SELECT_MIDDLEWARE_ID,
    INSET_VEC_EMBEDDING,
    SELECT_VEC,
};
