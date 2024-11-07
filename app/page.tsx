"use client";

import Sidebar from "@/components/sidebar";
import RightSidebar from "@/components/sidebar/right";
import MarkdownShortcuts from "@/components/slate/MarkdownShortcuts";
import { extractContentToString } from "@/components/slate/tools";
import mdStore, { FileItem } from "@/store/mdStore";
import useRagStore, { LLMUrlConfig } from "@/store/ragStore";
import { Button, Card, ScrollShadow } from "@nextui-org/react";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Descendant, Selection } from "slate";
import useApiStore, { useApiHealthStore } from "@/store/apiStore";
import { checkHealth } from "@/utils/fetchs/base";
import { BASE_URL } from "./config";
import { revalidatePath } from "next/cache";
import { useRouter } from "next/navigation";
import ApiCheck from "@/components/apiCheck";

export default function AppPage() {
    const [
        session,
        updateContent,
        updataAISearch,
        updateTitle,
        texting,
        setTexing,
    ] = mdStore((state) => [
        state.currentSession(),
        state.updateContent,
        state.updataAISearch,
        state.updateTitle,
        state.getTexing(),
        state.setTexing,
    ]);

    const [mdValue, setMdValue] = useState<Record<string, Descendant[]>>({
        root: [{ type: "paragraph", children: [{ text: "" }] }],
    });
    const [textEmbStatue, setTextEmbStatue, isCompleteWithEmb, llmUrlConfig] =
        useRagStore((state) => [
            state.getTextEmbStatue(),
            state.setTextEmbStatue,
            state.getIsCompleteWithEmb(),
            state.getLlmConfig(),
        ]);
    const [apiReady, setApiReady] = useApiHealthStore((state) => [
        state.getApiReady(),
        state.setApiReady,
    ]);

    function setMdValueFunc(id: string, value: Descendant[]) {
        const newValues = { ...mdValue };
        newValues[id] = value;
        setMdValue(newValues);
    }
    const setMdValueFuncCallback = useCallback(
        (id: string, value: Descendant[]) => {
            setMdValueFunc(id, value);
        },
        [session.id]
    );
    const [isComposition, setIsComposition] = useState(false);
    const [pendingAIComplete, setPendingAIComplete] = useState(false);

    useEffect(() => {
        setApiReady(false);
    }, []);

    useEffect(() => {
        const newValues = { ...mdValue };
        newValues[session.id] = session.content;
        setMdValue(newValues);
    }, [session.id]); // 只有当切换session时才会更新mdValue

    useEffect(() => {
        // 一定要确保mdValue[session.id]存在，如果不存在会有bug
        if (mdValue[session.id]) {
            updateContent(mdValue[session.id]);
        }

        if (session.title === "New Markdown" || session.title.length < 15) {
            const content = extractContentToString(session.content);
            if (content.trim().length > 20) {
                updateTitle(content.slice(0, 20));
            }
        }
    }, [mdValue]);

    const RightSidebarMemo = useMemo(
        () => (
            <RightSidebar
                key={session.id}
                pendingAIComplete={pendingAIComplete}
                isComposition={isComposition}
            />
        ),
        [session.id, pendingAIComplete, isComposition, apiReady]
    );

    const SidebarMemo = useMemo(() => <Sidebar />, [llmUrlConfig]);

    return (
        <div>
            <div className="flex flex-auto justify-center items-center w-full h-screen overflow-hidden">
                <div
                    className="m-3 p-5 w-full max-w-full min-w-full h-full flex flex-row"
                    data-tauri-drag-region
                >
                    {/* <Sidebar /> */}
                    {SidebarMemo}
                    <Card className="p-5 w-full h-full" shadow="sm">
                        <ScrollShadow
                            offset={100}
                            isEnabled={false}
                            className="h-full overflow-x-hidden"
                        >
                            {session && session.id && mdValue[session.id] && (
                                <MarkdownShortcuts
                                    key={session.id}
                                    mdValue={mdValue[session.id]}
                                    setMdValue={(value) =>
                                        setMdValueFuncCallback(
                                            session.id,
                                            value
                                        )
                                    }
                                    isAIComplete={pendingAIComplete}
                                    setIsAIComplete={setPendingAIComplete}
                                    aiSearchList={session.aiSearch.slice(0, 2)}
                                    isCompleteWithEmb={isCompleteWithEmb}
                                    isComposition={isComposition}
                                    setIsComposition={setIsComposition}
                                />
                            )}
                        </ScrollShadow>
                    </Card>
                    {RightSidebarMemo}
                </div>
            </div>

            {/* <ApiCheck key={Math.random()} /> */}
        </div>
    );
}
