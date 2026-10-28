"use client";

import { useState } from "react";
import { Play } from "lucide-react";

export function TutorialVideo() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/95 shadow-inner">
      {!isPlaying && (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          aria-label="Play Planista video tutorial walkthrough"
          className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-black/30 hover:from-black/70 hover:via-black/30 transition-all cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {/* YouTube Thumbnail Background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
            alt="Planista video walkthrough preview"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:opacity-80 transition-opacity"
          />
          {/* Play Button */}
          <div className="relative z-10 flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/90 text-primary-foreground shadow-2xl group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
            <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-current ml-1" />
          </div>
          <span className="relative z-10 mt-3 text-xs sm:text-sm font-medium text-white/90 group-hover:text-white transition-colors bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
            Watch Full Product Walkthrough (05:00)
          </span>
        </button>
      )}

      <iframe
        className={`w-full h-full border-0 ${!isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        src={
          isPlaying
            ? "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1"
            : "about:blank"
        }
        title="Planista Product Tutorial & Walkthrough"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
