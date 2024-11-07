/** @type {import('next').NextConfig} */

import withLlamaIndex from "llamaindex/next";

const nextConfig = withLlamaIndex({
    output: "export",
});

export default nextConfig;
