import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Slotly",
    short_name: "Slotly",
    description: "Gestiona tus citas de forma sencilla",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fcfdfb",
    theme_color: "#176348",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
