async function fetchWithTimeout(url: string, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
        ...options,
        signal: controller.signal,
    });

    clearTimeout(id);

    return response;
}

async function checkHealth(
    url: string,
    maxRetries = Infinity,
    retryInterval = 5000
) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await fetchWithTimeout(url, {}, 5000);
            if (response.ok) {
                console.log("Backend is healthy");
                return true;
            }
        } catch (error) {
            console.error("Health check failed:", error);
        }

        retries++;
        console.log(
            `Retrying in ${
                retryInterval / 1000
            } seconds... (Attempt ${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    console.error("Max retries reached. Backend is not responding.");
    return false;
}

declare global {
    interface Window {
        __TAURI__?: any;
    }
}

async function getTauriPath() {
    try {
        if (window.__TAURI__) {
            const {
                appLocalDataDir,
                appCacheDir,
                appConfigDir,
                appDataDir,
                appLogDir,
            } = await import("@tauri-apps/api/path");
            const appLocalDataDir_ = await appLocalDataDir();
            const appCacheDir_ = await appCacheDir();
            const appConfigDir_ = await appConfigDir();
            const appDataDir_ = await appDataDir();
            const appLogDir_ = await appLogDir();

            return {
                appLocalDataDir: appLocalDataDir_,
                appCacheDir: appCacheDir_,
                appConfigDir: appConfigDir_,
                appDataDir: appDataDir_,
                appLogDir: appLogDir_,
            };
        } else {
            console.log("Not running in Tauri environment");
            return { appLocalDataDir: "./" };
        }
    } catch (error) {
        console.error("Error getting local data path:", error);
        return { appLocalDataDir: "./" };
    }
}

export { fetchWithTimeout, checkHealth, getTauriPath };
