import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { RenderingIndicator } from "@/components/rendering/rendering-indicator";

export const metadata: Metadata = {
  metadataBase: new URL("https://planista-five.vercel.app"),
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
  openGraph: {
    title: "Planista — Intelligent Event Planning & Production",
    description:
      "Transform natural language requests into actionable blueprints with live budget intelligence and adaptive timelines.",
    url: "https://planista-five.vercel.app",
    siteName: "Planista",
    locale: "en_US",
    type: "website",
  },
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
    var isDark = stored === 'dark';
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-xs font-semibold uppercase tracking-wider transition-all"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          {children}
          <RenderingIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
