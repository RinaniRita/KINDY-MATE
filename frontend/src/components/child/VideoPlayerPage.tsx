"use client";

import { useState } from "react";
import { YouTubeEmbed } from "@/components/common/YouTubeEmbed";

type VideoPlayerPageProps = {
  childId: string;
};

const CARTOON_VIDEOS = [
  {
    id: "L8A4XbM5sXA",
    title: "Dora the Explorer",
    thumbnail: "https://img.youtube.com/vi/L8A4XbM5sXA/hqdefault.jpg"
  },
  {
    id: "kd4ya7Lt2Vs",
    title: "Curious George (PBS Kids)",
    thumbnail: "https://img.youtube.com/vi/kd4ya7Lt2Vs/hqdefault.jpg"
  },
  {
    id: "0Zi8KbgVhFc",
    title: "Đếm số cùng Count (Sesame Street)",
    thumbnail: "https://img.youtube.com/vi/0Zi8KbgVhFc/hqdefault.jpg"
  }
];

const SPACE_VIDEOS = [
  {
    id: "oz-Y1Xzx5iQ",
    title: "Five Wonders of our Universe",
    thumbnail: "https://img.youtube.com/vi/oz-Y1Xzx5iQ/hqdefault.jpg"
  },
  {
    id: "4wQSwNvVI5I",
    title: "The Endless Mysteries of the Universe!",
    thumbnail: "https://img.youtube.com/vi/4wQSwNvVI5I/hqdefault.jpg"
  },
  {
    id: "yVwZSoFJWSQ",
    title: "The Mystery of Time",
    thumbnail: "https://img.youtube.com/vi/yVwZSoFJWSQ/hqdefault.jpg"
  }
];

export function VideoPlayerPage({ childId }: VideoPlayerPageProps) {
  // Default to the first video automatically
  const [activeUrl, setActiveUrl] = useState(CARTOON_VIDEOS[0].id);

  const playVideo = (id: string) => {
    setActiveUrl(id);
  };

  const renderVideoGrid = (videos: typeof CARTOON_VIDEOS, title: string) => (
    <section className="mt-8">
      <h3 className="mb-4 text-lg font-black text-slate-700">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => playVideo(video.id)}
            className={`group relative overflow-hidden rounded-[1.5rem] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md text-left border-2 ${activeUrl === video.id ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-transparent hover:border-blue-200'}`}
          >
            <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-lg">▶️</div>
              </div>
            </div>
            <div className="p-4">
              <p className="font-bold text-sm text-slate-700 line-clamp-2">{video.title}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="grid gap-6" data-child-id={childId}>
      <section className="child-scene-shell rounded-[2.4rem] px-5 py-6 md:px-8 md:py-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Rạp Chiếu Phim</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">Góc Xem Video Của Bé</h1>
          <p className="mt-4 text-base font-bold leading-8 text-slate-600">
            Chọn một video bên dưới để xem cùng Milo nhé!
          </p>
        </div>
      </section>

      {activeUrl && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <YouTubeEmbed urlOrId={activeUrl} />
        </section>
      )}

      {renderVideoGrid(CARTOON_VIDEOS, "🧸 Phim Hoạt Hình")}
      {renderVideoGrid(SPACE_VIDEOS, "🚀 Khám Phá Vũ Trụ")}
    </div>
  );
}
