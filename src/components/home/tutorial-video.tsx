"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, PlayCircle, ExternalLink, ArrowRight, Sparkles } from "lucide-react";

export interface VideoChapter {
  time: string;
  startSeconds: number;
  title: string;
  desc: string;
}

export const TUTORIAL_CHAPTERS: VideoChapter[] = [
  {
    time: "00:00 - 00:25",
    startSeconds: 0,
    title: "Intro & Auth",
    desc: "Live email validation, error handling, and secure session onboarding.",
  },
  {
    time: "00:25 - 00:46",
    startSeconds: 25,
    title: "Dashboard",
    desc: "Centralized command center, real-time KPI cards, and event telemetry.",
  },
  {
    time: "00:46 - 01:25",
    startSeconds: 46,
    title: "AI Architect",
    desc: "Natural language brief intake with real-time LLaMA 3.3 blueprint generation.",
  },
  {
    time: "01:25 - 02:06",
    startSeconds: 85,
    title: "Overview & Budget",
    desc: "Event telemetry hub and deterministic zero-LLM financial balance ledger.",
  },
  {
    time: "02:06 - 02:46",
    startSeconds: 126,
    title: "Timeline & Logistics",
    desc: "CPM critical path DAG, 0ms optimistic task completion, and manifests.",
  },
  {
    time: "02:46 - 03:02",
    startSeconds: 166,
    title: "Risk Radar & Doc Scanner",
    desc: "Severity-likelihood matrix and live browser-based QR ticket check-in.",
  },
  {
    time: "03:02 - 03:37",
    startSeconds: 182,
    title: "Theme Studio & Copilot",
    desc: "Dynamic zero-reflow CSS themes and inline AI planning assistance.",
  },
  {
    time: "03:37 - 03:54",
    startSeconds: 217,
    title: "Export Pack",
    desc: "One-click print-ready PDF Run-of-Show and JSON dossier backup.",
  },
];

export function TutorialVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setActiveSeconds(0);
  }, []);

  // 1. Intercept link navigations before DOM unmount to immediately kill audio/video and reset
  useEffect(() => {
    const handleNavigationClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link || !link.href) return;

      try {
        const url = new URL(link.href, window.location.href);
        // If navigating to another internal page (not on-page hash jump)
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

  const handlePlayChapter = (seconds: number) => {
    setActiveSeconds(seconds);
    if (!isPlaying) {
      setIsPlaying(true);
    } else if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }),
          "*"
        );
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
          "*"
        );
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: "" }),
          "*"
        );
      } catch {
        // Ignore cross-origin errors
      }
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > window.innerHeight) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const embedUrl = `https://www.youtube-nocookie.com/embed/nCGiojMqvQI?autoplay=1&vq=hd1080&start=${activeSeconds}&rel=0&modestbranding=1&enablejsapi=1`;

  return (
    <div className="space-y-6">
      {/* Video Container Frame */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-xl"
      >
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/95 shadow-inner">
          {!isPlaying ? (
            <button
              type="button"
              onClick={() => handlePlayChapter(0)}
              aria-label="Play Planista video tutorial walkthrough"
              className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-black/30 hover:from-black/70 hover:via-black/30 transition-all cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {/* Zero-Weight Blueprint Canvas Preview */}
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
              <span className="relative z-10 mt-3 text-xs sm:text-sm font-medium text-white/90 group-hover:text-white transition-colors bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-sm border border-white/10 flex items-center gap-1.5 shadow-lg">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Watch Full Product Walkthrough (03:54)
              </span>
            </button>
          ) : (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              src={embedUrl}
              title="Planista Product Tutorial & Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                try {
                  iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
                    "*"
                  );
                } catch {
                  // Ignore
                }
              }}
            />
          )}
        </div>

        {/* Video Subtitle & Quick Link */}
        <div className="mt-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Official Demo Submission (Under 4 minutes)
          </span>
          <a
            href="https://youtu.be/nCGiojMqvQI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary transition-colors text-[11px] font-medium"
          >
            Watch on YouTube
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Timestamp / Chapter Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {TUTORIAL_CHAPTERS.map((ch, idx) => {
          const isActive = isPlaying && activeSeconds === ch.startSeconds;
          return (
            <button
              type="button"
              key={idx}
              onClick={() => handlePlayChapter(ch.startSeconds)}
              className={`group relative p-4 rounded-xl border text-left space-y-2.5 overflow-hidden transition-all duration-300 cursor-pointer ${
                isActive
                  ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                  : "border-border/80 bg-card/90 hover:bg-card hover:border-primary/50 hover:shadow-md"
              }`}
            >
              {/* Top ambient hover gradient glow */}
              <div
                className={`absolute top-0 left-0 right-0 h-0.5 transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-primary via-emerald-400 to-primary"
                    : "bg-transparent group-hover:bg-gradient-to-r group-hover:from-primary/40 group-hover:via-emerald-400 group-hover:to-primary/40"
                }`}
              />

              {/* Visual timestamp badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold tracking-tight shadow-xs transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border border-primary"
                    : "bg-primary/10 dark:bg-emerald-950/40 border border-primary/20 dark:border-emerald-500/30 text-primary dark:text-emerald-300 group-hover:bg-primary/20 group-hover:border-primary/40"
                }`}
              >
                <PlayCircle className="h-3 w-3 shrink-0" />
                <span>{ch.time}</span>
              </div>

              <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                <span>{ch.title}</span>
                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
              </h4>

              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {ch.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
