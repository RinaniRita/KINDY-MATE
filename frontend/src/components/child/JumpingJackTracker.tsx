"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { YouTubeEmbed } from "@/components/common/YouTubeEmbed";

interface JumpingJackTrackerProps {
  onCountUpdate?: (count: number) => void;
  targetCount?: number;
}

export function JumpingJackTracker({ onCountUpdate, targetCount = 10 }: JumpingJackTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [showInstruction, setShowInstruction] = useState(false);
  
  const requestRef = useRef<number | null>(null);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsModelLoading(false); // Model is now server-side, camera is ready
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError("Không thể bật camera. Bạn vui lòng cấp quyền nhé!");
    }
  };

  const processPoseState = (landmarks: any[]) => {
    if (landmarks.length === 0) return;
    
    // MediaPipe Pose Indices
    // 11: ls, 12: rs, 15: lw, 16: rw, 27: la, 28: ra
    const ls = landmarks.find(l => l.id === 11);
    const rs = landmarks.find(l => l.id === 12);
    const lw = landmarks.find(l => l.id === 15);
    const rw = landmarks.find(l => l.id === 16);
    const la = landmarks.find(l => l.id === 27);
    const ra = landmarks.find(l => l.id === 28);
    
    if (
      !ls || !rs || !lw || !rw || !la || !ra ||
      (ls.visibility || 0) < 0.5 || (rs.visibility || 0) < 0.5 ||
      (la.visibility || 0) < 0.5 || (ra.visibility || 0) < 0.5 ||
      (lw.visibility || 0) < 0.5 || (rw.visibility || 0) < 0.5
    ) {
      return;
    }
    
    const shoulderWidth = Math.abs(ls.x - rs.x);
    const ankleWidth = Math.abs(la.x - ra.x);
    
    const legsApart = ankleWidth > shoulderWidth * 1.5;
    const legsTogether = ankleWidth < shoulderWidth * 1.2;
    const armsUp = lw.y < ls.y && rw.y < rs.y;
    const armsDown = lw.y > ls.y && rw.y > rs.y;
    
    const currentState = jumpStateRef.current;
    
    if (currentState === "IDLE") {
      if (legsApart && armsUp) {
        jumpStateRef.current = "JUMPING";
      }
    } else if (currentState === "JUMPING") {
      if (legsTogether && armsDown) {
        jumpStateRef.current = "IDLE";
        setCount(prev => {
          const newCount = prev + 1;
          if (onCountUpdate) onCountUpdate(newCount);
          return newCount;
        });
      }
    }
  };

  const sendFrameLoop = useCallback(async () => {
    if (!videoRef.current || cameraError) {
      requestRef.current = requestAnimationFrame(sendFrameLoop);
      return;
    }
    
    // Check if video is ready
    if (videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const offscreenCanvas = document.createElement("canvas");
      // Downscale slightly for faster network transmission
      offscreenCanvas.width = 480;
      offscreenCanvas.height = 360;
      const ctx = offscreenCanvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const base64Data = offscreenCanvas.toDataURL("image/jpeg", 0.5);
        
        try {
          const res = await fetch("/api/ai/pose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Data })
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.landmarks) {
              drawCanvas(data.landmarks);
              processPoseState(data.landmarks);
            }
          }
        } catch (e) {
          // Ignore fetch errors to keep loop going
        }
      }
    }

    // Throttle to ~10 FPS to reduce backend load since HTTP adds overhead
    setTimeout(() => {
      requestRef.current = requestAnimationFrame(sendFrameLoop);
    }, 100);
  }, [cameraError, onCountUpdate]);

  const drawCanvas = (landmarks: any[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (landmarks.length > 0) {
      // MediaPipe landmarks are normalized [0, 1]. Scale to canvas.
      const scaledLandmarks = landmarks.map(lm => ({
        ...lm,
        x: lm.x * canvas.width,
        y: lm.y * canvas.height
      }));

      // Draw points
      scaledLandmarks.forEach((lm) => {
        if ((lm.visibility || 0) > 0.5) {
          ctx.beginPath();
          ctx.arc(lm.x, lm.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#10B981"; // Emerald
          ctx.fill();
        }
      });
      
      // Draw lines for limbs
      const drawLine = (idx1: number, idx2: number) => {
        const p1 = scaledLandmarks.find(l => l.id === idx1);
        const p2 = scaledLandmarks.find(l => l.id === idx2);
        
        if (p1 && p2 && (p1.visibility || 0) > 0.5 && (p2.visibility || 0) > 0.5) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = "#10B981";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      };

      // MediaPipe Pose Indices
      drawLine(11, 12); // Shoulders
      drawLine(23, 24); // Hips
      drawLine(11, 23); // Left torso
      drawLine(12, 24); // Right torso
      
      drawLine(11, 13); // Left upper arm
      drawLine(13, 15); // Left lower arm
      drawLine(12, 14); // Right upper arm
      drawLine(14, 16); // Right lower arm
      
      drawLine(23, 25); // Left upper leg
      drawLine(25, 27); // Left lower leg
      drawLine(24, 26); // Right upper leg
      drawLine(26, 28); // Right lower leg
    }
  };

  useEffect(() => {
    initCamera();

    return () => {
      // Cleanup
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isModelLoading && !cameraError) {
      requestRef.current = requestAnimationFrame(sendFrameLoop);
    }
  }, [isModelLoading, cameraError, sendFrameLoop]);

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center gap-6">
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800">Thử Thách Jumping Jacks!</h2>
        <p className="text-slate-600 font-bold">Hãy để điện thoại ra xa, đứng vào khung hình và nhảy nhé!</p>
        <button
          onClick={() => setShowInstruction(!showInstruction)}
          className="inline-flex items-center gap-1 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors bg-orange-50 px-4 py-2 rounded-full"
        >
          {showInstruction ? "Đóng hướng dẫn ✕" : "Xem video hướng dẫn cách nhảy ▶️"}
        </button>
      </div>

      {showInstruction && (
        <div className="w-full max-w-lg rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-md animate-in slide-in-from-top-4">
          <YouTubeEmbed urlOrId="uLVt6u15L98" />
        </div>
      )}

      <div className="relative w-full aspect-video bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-emerald-400">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-white p-6 text-center font-bold">
            {cameraError}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover -scale-x-100" // Mirror the video
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover -scale-x-100" // Mirror the canvas to match video
            />
            
            {isModelLoading && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white font-bold animate-pulse">Đang nạp AI theo dõi chuyển động (Python)...</p>
              </div>
            )}
            
            {/* Overlay Count */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl px-6 py-3 shadow-lg border-2 border-emerald-100 text-center z-20">
              <span className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Số Lần Nhảy</span>
              <span className="text-4xl font-black text-emerald-500">{count}</span>
              <span className="text-lg font-bold text-slate-400">/{targetCount}</span>
            </div>
          </>
        )}
      </div>

      {count >= targetCount && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 child-island-card w-full max-w-md p-6 text-center border-emerald-200 bg-emerald-50">
          <div className="text-4xl mb-3">🎉🏆🎉</div>
          <h3 className="text-2xl font-black text-emerald-600 mb-2">Hoàn thành xuất sắc!</h3>
          <p className="text-emerald-700 font-bold">Cậu đã làm được {count} lần Jumping Jacks!</p>
        </div>
      )}
    </div>
  );
}
