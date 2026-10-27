import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planista — Intelligent Event Planning & Production",
  description:
    "Transform natural language requests into actionable blueprints with live budget intelligence, adaptive timelines, and context-aware planning copilot.",
  keywords: [
    "event planning",
    "budget intelligence",
    "wedding planner",
    "celebration planning",
    "event management",
    "AI architect",
  ],
};

export const viewport: Viewport = {
  themeColor: "#1C3829",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
