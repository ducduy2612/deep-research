import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deep Research",
    short_name: "Deep Research",
    description: "AI-powered deep research tool",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#c0c1ff",
    background_color: "#0e0e10",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
