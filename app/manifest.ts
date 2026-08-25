import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest — lets phones install the app to the
// home screen with a real icon instead of living as a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gamify Life",
    short_name: "Gamify",
    description: "Josh's habit tracker, rebuilt online.",
    start_url: "/",
    display: "standalone",
    background_color: "#0C0E15",
    theme_color: "#0C0E15",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
