import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "Open People",
  description: "Structure before power. Humanity before machine. Alignment before acceleration.",
};

export default function HomePage() {
  return <LandingPage />;
}
