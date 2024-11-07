import { Descendant } from "slate";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { BASE_URL } from "@/app/config";

function createEmptySession(): mdSession {
    return {
        id: nanoid(12),
        title: "New Markdown",
        content: [
            {
                type: "paragraph",
                children: [
                    {
                        text: "",
                    },
                ],
            },
        ],
        initDate: new Date().toISOString(),
        fileBox: [],
        aiSearch: [],
    };
}

interface FileItem {
    id: string;
    name: string;
    path: string;
    // file: File; // 不存放文件内容
    statue?: "pending" | "done" | "error";
}

interface mdSession {
    id: string;
    title: string;
    content: Descendant[];
    initDate: string;
    fileBox: FileItem[];
    aiSearch: string[];
}

interface SessionStore {
    sessions: mdSession[];
    currentSessionIndex: number;
    currentSession: () => mdSession;
    selectSession: (index: number) => void;
    removeSession: (index: number) => void;
    newSession: () => void;
    updateContent: (content: Descendant[]) => void;
    updateTitle: (title: string) => void;
    updataAISearch: (searchList: string[]) => void;
    updateFileBox: (fileBox: FileItem[]) => void;
    removeFileBox: (id: string) => void;
    updateCurrentSession: (updater: (session: mdSession) => void) => void;
    getAISearch: () => string[];
    clearData: () => void;
    texting: boolean;
    setTexing: (texting: boolean) => void;
    getTexing: () => boolean;
}

const mdStore = create<SessionStore>()(
    persist(
        (set, get) => ({
            sessions: [createEmptySession()],
            currentSessionIndex: 0,
            texting: false,
            setTexing: (texting: boolean) => {
                set({ texting });
            },
            getTexing: () => {
                return get().texting;
            },
            updateContent: (content: Descendant[]) => {
                const currentSessionId = get().currentSession().id;
                // console.log("updateContent", content);
                get().updateCurrentSession((session) => {
                    if (session.id === currentSessionId) {
                        session.content = content;
                    }
                });
            },
            updateTitle: (title: string) => {
                const currentSessionId = get().currentSession().id;
                get().updateCurrentSession((session) => {
                    if (session.id === currentSessionId) {
                        session.title = title;
                    }
                });
            },
            updataAISearch: (searchList: string[]) => {
                const currentSessionId = get().currentSession().id;
                get().updateCurrentSession((session) => {
                    if (session.id === currentSessionId) {
                        session.aiSearch = searchList;
                    }
                });
            },
            getAISearch: () => {
                return get().currentSession().aiSearch;
            },
            currentSession() {
                let index = get().currentSessionIndex;
                const sessions = get().sessions;

                if (sessions.length === 0) {
                    return createEmptySession();
                }

                if (index < 0 || index >= sessions.length) {
                    index = Math.min(sessions.length - 1, Math.max(0, index));
                    set(() => ({ currentSessionIndex: index }));
                }
                return sessions[index];
            },
            selectSession: (index: number) => {
                set({ currentSessionIndex: index });
            },
            removeSession(index: number) {
                set((state) => {
                    let nextIndex = state.currentSessionIndex;
                    const sessions = state.sessions;
                    const session = sessions[index];
                    try {
                        fetch(`${BASE_URL}/api/file/deleteSession`, {
                            method: "POST",
                            body: JSON.stringify({
                                sessionId: session.id,
                            }),
                        });
                    } catch (error) {
                        console.error("Delete session error:", error);
                    }

                    if (sessions.length === 1) {
                        return {
                            currentSessionIndex: 0,
                            sessions: [createEmptySession()],
                        };
                    }

                    sessions.splice(index, 1);

                    if (nextIndex === index) {
                        nextIndex -= 1;
                    }

                    return {
                        currentSessionIndex: 0,
                        sessions,
                    };
                });
            },
            newSession: () => {
                set((state) => ({
                    currentSessionIndex: 0,
                    sessions: [createEmptySession()].concat(state.sessions),
                }));
            },
            updateFileBox(fileBox: FileItem[]) {
                const currentSessionId = get().currentSession().id;
                get().updateCurrentSession((session) => {
                    if (session.id === currentSessionId) {
                        const newFileBox = session.fileBox.concat(fileBox);
                        session.fileBox = newFileBox;
                    }
                });
            },
            removeFileBox(id: string) {
                const currentSessionId = get().currentSession().id;
                get().updateCurrentSession((session) => {
                    if (session.id === currentSessionId) {
                        const currentFile = session.fileBox.find(
                            (file) => file.id === id
                        );
                        const newFileBox = session.fileBox.filter(
                            (file) => file.id !== id
                        );
                        session.fileBox = newFileBox;
                        try {
                            if (currentFile) {
                                fetch(`${BASE_URL}/api/file/delete`, {
                                    method: "POST",
                                    body: JSON.stringify({
                                        filePath: currentFile.path,
                                        sessionId: currentSessionId,
                                    }),
                                });
                            }
                        } catch (error) {
                            console.error("Delete file error:", error);
                        }
                    }
                });
            },
            updateCurrentSession(updater) {
                const sessions = get().sessions;
                const index = get().currentSessionIndex;
                updater(sessions[index]);
                set(() => ({ sessions }));
            },
            clearData: () => {
                set({
                    sessions: [createEmptySession()],
                    currentSessionIndex: 0,
                });
            },
        }),
        {
            name: "mdStore",
        }
    )
);

export default mdStore;
export type { mdSession, FileItem };
