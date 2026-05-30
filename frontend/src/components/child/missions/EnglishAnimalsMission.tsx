"use client";

import { useEffect, useRef, useState } from "react";

const ALL_WORDS = [
  { text: "RED", vi: "Màu đỏ", icon: "🍎", bg: "bg-red-50", border: "border-red-100", textColor: "text-red-600", viColor: "text-red-400" },
  { text: "BLUE", vi: "Màu xanh dương", icon: "🌊", bg: "bg-blue-50", border: "border-blue-100", textColor: "text-blue-600", viColor: "text-blue-400" },
  { text: "CAT", vi: "Con mèo", icon: "🐱", bg: "bg-yellow-50", border: "border-yellow-100", textColor: "text-yellow-600", viColor: "text-yellow-500" },
  { text: "FROG", vi: "Con ếch", icon: "🐸", bg: "bg-emerald-50", border: "border-emerald-100", textColor: "text-emerald-600", viColor: "text-emerald-400" },
  { text: "DOG", vi: "Con chó", icon: "🐶", bg: "bg-orange-50", border: "border-orange-100", textColor: "text-orange-600", viColor: "text-orange-400" },
  { text: "GREEN", vi: "Màu xanh lá", icon: "🍃", bg: "bg-lime-50", border: "border-lime-100", textColor: "text-lime-600", viColor: "text-lime-500" },
  { text: "PINK", vi: "Màu hồng", icon: "🌸", bg: "bg-pink-50", border: "border-pink-100", textColor: "text-pink-600", viColor: "text-pink-400" },
  { text: "BIRD", vi: "Con chim", icon: "🐦", bg: "bg-cyan-50", border: "border-cyan-100", textColor: "text-cyan-600", viColor: "text-cyan-400" },
  { text: "FISH", vi: "Con cá", icon: "🐟", bg: "bg-sky-50", border: "border-sky-100", textColor: "text-sky-600", viColor: "text-sky-400" },
  { text: "YELLOW", vi: "Màu vàng", icon: "☀️", bg: "bg-amber-50", border: "border-amber-100", textColor: "text-amber-600", viColor: "text-amber-500" },
  { text: "PIG", vi: "Con lợn", icon: "🐷", bg: "bg-rose-50", border: "border-rose-100", textColor: "text-rose-600", viColor: "text-rose-400" },
  { text: "BLACK", vi: "Màu đen", icon: "⬛", bg: "bg-slate-100", border: "border-slate-300", textColor: "text-slate-800", viColor: "text-slate-500" },
];

type WordCard = (typeof ALL_WORDS)[number];
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};
type SpeechRecognitionErrorEventLike = {
  error: string;
};

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function getRandomWords(count: number) {
  const shuffled = [...ALL_WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function EnglishAnimalsMission() {
  const [currentWords, setCurrentWords] = useState<WordCard[]>(() => getRandomWords(4));
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (currentWords.length === 0) return;
      const SpeechRecognition = getSpeechRecognition();
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        
        recognition.onresult = (event) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          const lowerTranscript = currentTranscript.toLowerCase();
          setTranscript(lowerTranscript);

          setCompletedWords(prev => {
            const newSet = new Set(prev);
            currentWords.forEach(w => {
              if (lowerTranscript.includes(w.text.toLowerCase())) {
                newSet.add(w.text);
              }
            });
            return newSet;
          });
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [currentWords]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const startNewSession = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setTranscript("");
    setCompletedWords(new Set());
    setCurrentWords(getRandomWords(4));
  };

  const isSessionDone = currentWords.length > 0 && completedWords.size === currentWords.length;

  return (
    <div className="space-y-6 mt-6">
      <div className="rounded-3xl bg-indigo-50 p-6 border border-indigo-100 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-indigo-800">Animals & Colors</h2>
          <p className="text-indigo-600 font-bold mt-1">Học tiếng Anh thật vui!</p>
        </div>
        <div className="text-5xl animate-wiggle">🐶</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {currentWords.map(word => {
          const isDone = completedWords.has(word.text);
          return (
            <div 
              key={word.text}
              className={`relative flex flex-col items-center justify-center p-6 rounded-3xl border text-center transition-all duration-300 ${isDone ? 'bg-green-50 border-green-200 scale-105' : `${word.bg} ${word.border}`}`}
            >
              {isDone && (
                <div className="absolute top-3 right-3 text-2xl animate-bounce">
                  ✅
                </div>
              )}
              <span className="text-5xl mb-3">{word.icon}</span>
              <span className={`text-xl font-black uppercase tracking-widest ${isDone ? 'text-green-600' : word.textColor}`}>
                {word.text}
              </span>
              <span className={`text-sm font-bold mt-1 ${isDone ? 'text-green-500' : word.viColor}`}>
                {word.vi}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="rounded-3xl bg-slate-50 p-6 text-center font-bold text-slate-600 border border-slate-200 shadow-sm flex flex-col items-center gap-4">
        {!isSessionDone ? (
          <>
            <p>Hãy bấm nút micro và đọc to các từ tiếng Anh ở trên nhé: <strong className="text-indigo-600">{currentWords.map(w => w.text).join(", ")}!</strong></p>
            
            <button
              onClick={toggleListening}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl shadow-lg transition-all duration-300 ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-200' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {isListening ? '🎙️' : '🎤'}
              {isListening && (
                <span className="absolute -inset-2 rounded-full border-4 border-rose-500 opacity-20 animate-ping"></span>
              )}
            </button>

            {transcript && (
              <div className="mt-2 text-sm text-slate-500 italic max-w-sm">
                Milo nghe thấy: &ldquo;{transcript}&rdquo;
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-6xl animate-bounce">🎉</div>
            <h3 className="text-2xl font-black text-green-700">Cậu đọc giỏi quá!</h3>
            <p className="text-green-600 font-bold">Cậu đã đọc đúng tất cả các từ.</p>
            <button
              onClick={startNewSession}
              className="mt-4 rounded-[1.5rem] bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4 text-base font-black text-white shadow-lg shadow-emerald-200 hover:scale-105 transition-transform"
            >
              🔄 Tiếp tục chơi với từ mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
