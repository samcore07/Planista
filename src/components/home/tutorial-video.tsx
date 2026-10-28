"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play } from "lucide-react";

export function TutorialVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const stopAndResetToScratch = useCallback(() => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "stopVideo", args: "" }),
          "*"
        );
        iframeRef.current.src = "about:blank";
      } catch {
        // Ignore cross-origin error
      }
    }
    setIsPlaying(false);
  }, []);

  // 1. Intercept link navigations before DOM unmount to immediately kill audio/video and reset
  useEffect(() => {
    const handleNavigationClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link || !link.href) return;

      try {
        const url = new URL(link.href, window.location.href);
        // If navigating to another internal page (not just on-page hash jump)
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          stopAndResetToScratch();
        }
      } catch {
        // Ignore invalid URL
      }
    };

    document.addEventListener("click", handleNavigationClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleNavigationClick, { capture: true });
    };
  }, [stopAndResetToScratch]);

  // 2. Ensure cleanup on unmount
  useEffect(() => {
    const iframe = iframeRef.current;
    return () => {
      if (iframe) {
        try {
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "stopVideo", args: "" }),
            "*"
          );
          iframe.src = "about:blank";
        } catch {
          // Ignore
        }
      }
    };
  }, [isPlaying]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/95 shadow-inner">
      {!isPlaying ? (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          aria-label="Play Planista video tutorial walkthrough"
          className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-black/30 hover:from-black/70 hover:via-black/30 transition-all cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {/* Zero-Weight Blueprint Canvas Preview (No external HTTP / DNS / decode overhead) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#14231b] via-[#0d1712] to-[#070b09] flex items-center justify-center opacity-90">
            <svg className="w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <pattern id="video-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-emerald-500/40" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#video-grid)" />
            </svg>
          </div>

          {/* Play Button */}
          <div className="relative z-10 flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/95 text-primary-foreground shadow-2xl group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
            <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-current ml-1" />
          </div>
          <span className="relative z-10 mt-3 text-xs sm:text-sm font-medium text-white/90 group-hover:text-white transition-colors bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
            Watch Full Product Walkthrough (05:00)
          </span>
        </button>
      ) : (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1&enablejsapi=1"
          title="Planista Product Tutorial & Walkthrough"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
    </div>
  );
}
