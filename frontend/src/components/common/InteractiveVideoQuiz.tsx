"use client";

import { useEffect, useRef, useState } from "react";
import { MascotVisual } from "@/components/child/MascotVisual";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type InteractiveVideoQuizProps = {
  videoId: string;
  triggerTimeSec: number;
  question: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
};

export function InteractiveVideoQuiz({
  videoId,
  triggerTimeSec,
  question,
  options,
  correctOptionId,
}: InteractiveVideoQuizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const quizCompletedRef = useRef(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    // Load YouTube API script if not already loaded
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // We might overwrite an existing callback, but since we only have one player, it's ok for this simple use case
      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    function initPlayer() {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: handleStateChange,
        },
      });
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoId]);

  const handleStateChange = (event: any) => {
    // YT.PlayerState.PLAYING = 1
    if (event.data === 1) {
      startTimePolling();
    } else {
      stopTimePolling();
    }
  };

  const startTimePolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current && !quizCompletedRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        if (currentTime >= triggerTimeSec) {
          // Trigger the quiz
          playerRef.current.pauseVideo();
          setShowQuiz(true);
          stopTimePolling();
        }
      }
    }, 500);
  };

  const stopTimePolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleAnswer = (answerId: string) => {
    setSelectedAnswer(answerId);
    if (answerId === correctOptionId) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  const handleContinue = () => {
    setShowQuiz(false);
    setQuizCompleted(true);
    quizCompletedRef.current = true;
    if (playerRef.current) {
      playerRef.current.playVideo();
    }
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[2.6rem] bg-slate-900 shadow-xl border-4 border-white/60">
      <div ref={containerRef} className="absolute inset-0 h-full w-full border-0" />

      {/* Floating Quiz Overlay */}
      {showQuiz && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg rounded-[2.4rem] bg-white p-7 shadow-2xl flex flex-col items-center border border-white/80 border-b-4 border-b-slate-200">
            
            {/* Absolute Mascot Position */}
            <div className="absolute -top-[5.5rem] left-1/2 -translate-x-1/2">
               <MascotVisual 
                 size="sm" 
                 mood={isCorrect === true ? "cheer" : isCorrect === false ? "surprise" : "focus"} 
                 message="" 
                 compact={false}
               />
            </div>

            <div className="mt-20 w-full text-center">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-6 leading-snug">
                {question}
              </h3>

              {isCorrect === true ? (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm">
                    🎉
                  </div>
                  <h4 className="text-2xl font-black text-emerald-600 mb-2">Chính xác!</h4>
                  <p className="text-slate-600 font-bold mb-6 text-sm">Cậu nhớ bài siêu giỏi! Mình cùng xem tiếp nha.</p>
                  <button
                    onClick={handleContinue}
                    className="bubbly-btn rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-8 py-4 text-sm font-black text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                  >
                    Xem tiếp video ▶️
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {options.map((option) => {
                    const isSelected = selectedAnswer === option.id;
                    const isWrong = isSelected && isCorrect === false;

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleAnswer(option.id)}
                        className={`relative overflow-hidden rounded-[1.5rem] border-2 p-4 text-left transition-all ${
                          isWrong
                            ? "border-rose-400 bg-rose-50 text-rose-700 animate-shake"
                            : "border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-md text-slate-700"
                        }`}
                      >
                        <span className="font-black text-lg mr-2 text-slate-400">{option.id}.</span>
                        <span className="font-bold">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
