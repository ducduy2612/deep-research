import type { NextConfig } from "next";
import pkg from "./package.json";

const BUILD_MODE = process.env.NEXT_PUBLIC_BUILD_MODE;

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  env: {
    NEXT_PUBLIC_VERSION: pkg.version,
  },
  transpilePackages: ["pdfjs-dist", "mermaid"],
};

if (BUILD_MODE === "export") {
  nextConfig.output = "export";
  nextConfig.webpack = (config) => {
    config.module.rules.push({
      test: /src\/app\/api/,
      loader: "ignore-loader",
    });
    config.module.rules.push({
      test: /src\/middleware/,
      loader: "ignore-loader",
    });
    return config;
  };
} else if (BUILD_MODE === "standalone") {
  nextConfig.output = "standalone";
}
// API rewrites will be added back in Phase 2 (Provider Factory)

export default nextConfig;
