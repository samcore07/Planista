import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { RenderingIndicator } from "@/components/rendering/rendering-indicator";

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

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('planista-theme');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth scroll-pt-20" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider>
          {children}
          <RenderingIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
