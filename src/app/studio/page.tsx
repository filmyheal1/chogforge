import type { Metadata } from "next";
import Studio from "@/components/Studio";

export const metadata: Metadata = {
  title: "PFP Studio — Chogforge",
  description:
    "Restyle your Chog Genesis NFT: drop the background, add text, frame it, and download a 1080² PFP or 1500×500 X header. Read-only wallet lookup — never connect.",
};

export default function StudioPage() {
  return <Studio />;
}
