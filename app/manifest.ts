import type { MetadataRoute } from "next";

/**
 * Provides the web app manifest for the Student OS progressive web app.
 *
 * @returns A MetadataRoute.Manifest object containing the app's name, short_name, description, start_url, display mode, background_color, theme_color, orientation, and icon definitions (including maskable variants).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Student OS",
    short_name: "StudentOS",
    description: "The all-in-one workspace for students",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}