import type { MetadataRoute } from "next";

// Placeholder icon (default Next.js favicon) until section 2 picks the accent
// colour and real icons are designed — see docs/decisions.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ten Minute Handover",
    short_name: "Handover",
    description: "Post-class notes that become next class's plan.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
