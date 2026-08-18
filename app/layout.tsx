import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gausswerks Games",
  description: "Original games and playable prototypes from Gausswerks.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
