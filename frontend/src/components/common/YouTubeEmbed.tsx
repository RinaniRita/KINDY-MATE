"use client";

import { useMemo } from "react";
import { extractYouTubeId } from "@/lib/youtube";

type YouTubeEmbedProps = {
  /** The full YouTube URL or just the video ID */
  urlOrId: string;
  /** Optional title for accessibility */
  title?: string;
  /** Additional CSS classes for the container */
  className?: string;
};

export function YouTubeEmbed({ urlOrId, title = "YouTube Video", className = "" }: YouTubeEmbedProps) {
  const videoId = useMemo(() => {
    // If it's already an 11-char ID, use it directly
    if (urlOrId && urlOrId.length === 11 && !urlOrId.includes(".")) {
      return urlOrId;
    }
    // Otherwise try to parse it as a URL
    return extractYouTubeId(urlOrId);
  }, [urlOrId]);

  if (!videoId) {
    return (
      <div className={`flex aspect-video w-full items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center ${className}`}>
        <div>
          <div className="text-4xl">🔗</div>
          <p className="mt-3 text-sm font-bold text-slate-500">
            Không tìm thấy video. Vui lòng kiểm tra lại link YouTube.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-[2rem] bg-slate-900 shadow-xl ${className}`}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
