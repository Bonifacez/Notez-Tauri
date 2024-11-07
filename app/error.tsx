"use client"; // Error boundaries must be Client Components

import ApiCheck from "@/components/apiCheck";
import mdStore from "@/store/mdStore";
import { useEffect, useState } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [showError, setShowError] = useState("No error");
    const [errorName, setErrorName] = useState("No error");
    const [clearData] = mdStore((state) => [state.clearData]);

    clearData();
    useEffect(() => {
        setShowError(error.message);
        setErrorName(error.name);
    }, [error]);

    return (
        <div>
            <ApiCheck key={Math.random()} />

            <h2>Something went wrong!</h2>
            <p>{showError}</p>
            <br />
            <p>{errorName}</p>
            <br />
            <button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Try again
            </button>
        </div>
    );
}
