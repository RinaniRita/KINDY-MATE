"use client";

import { useEffect, useState } from "react";

const EMOJIS = ["🍎", "🚗", "🐸", "🐱", "🐻", "🍭", "⚽", "🍦", "🦖", "🍩"];

interface Question {
  num1: number;
  num2: number;
  operator: "+" | "-";
  emoji: string;
  correctAnswer: number;
  options: { label: string; value: number }[];
}

function generateRandomQuestion(): Question {
  const operator = Math.random() > 0.5 ? "+" : "-";
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  let num1 = 0;
  let num2 = 0;
  let correctAnswer = 0;

  if (operator === "+") {
    num1 = Math.floor(Math.random() * 4) + 1; // 1-4
    num2 = Math.floor(Math.random() * 4) + 1; // 1-4
    correctAnswer = num1 + num2;
  } else {
    num1 = Math.floor(Math.random() * 4) + 3; // 3-6
    num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // 1 to num1-1
    correctAnswer = num1 - num2;
  }

  // Generate options (A, B, C, D)
  const optionValues = new Set<number>([correctAnswer]);
  while (optionValues.size < 4) {
    const distractor = Math.max(1, correctAnswer + (Math.floor(Math.random() * 5) - 2)); // answer +/- 2, min 1
    optionValues.add(distractor);
  }

  const sortedValues = Array.from(optionValues).sort((a, b) => a - b);
  const labels = ["A", "B", "C", "D"];
  const options = sortedValues.map((val, idx) => ({
    label: labels[idx],
    value: val,
  }));

  return { num1, num2, operator, emoji, correctAnswer, options };
}

export function MathPicturesMission() {
  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedVal, setSelectedVal] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [shake, setShake] = useState(false);

  const startNewQuiz = () => {
    const list = [generateRandomQuestion(), generateRandomQuestion(), generateRandomQuestion()];
    setQuestions(list);
    setCurrentIdx(0);
    setSelectedVal(null);
    setIsCorrect(null);
    setQuizFinished(false);
  };

  useEffect(() => {
    setMounted(true);
    startNewQuiz();
  }, []);

  if (!mounted || questions.length === 0) {
    return (
      <div className="text-center py-10 font-bold text-slate-500">
        Milo đang chuẩn bị các câu đố phép tính...
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  const handleSelectOption = (value: number) => {
    if (selectedVal !== null) return; // Prevent double clicking

    setSelectedVal(value);
    const correct = value === currentQuestion.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx(prev => prev + 1);
          setSelectedVal(null);
          setIsCorrect(null);
        } else {
          setQuizFinished(true);
        }
      }, 1200);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setSelectedVal(null);
        setIsCorrect(null);
      }, 1000);
    }
  };

  const renderVisuals = (count: number, emoji: string) => {
    return Array.from({ length: count })
      .map((_, i) => emoji)
      .join("");
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="rounded-3xl bg-indigo-50 p-6 border border-indigo-100 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-indigo-800">Cộng trừ hình ảnh</h2>
          <p className="text-indigo-600 font-bold mt-1">
            {quizFinished ? "Tất cả đã hoàn thành!" : `Giải câu hỏi toán học vui nhộn: Câu ${currentIdx + 1}/3`}
          </p>
        </div>
        <div className="text-5xl animate-bounce">🧮</div>
      </div>

      {!quizFinished ? (
        <div className={`rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-8 ${shake ? 'animate-shake' : ''}`}>
          {/* Visual Equation Card */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-4 md:gap-6 text-3xl md:text-4xl lg:text-5xl font-black text-slate-700 select-none">
              <span className="tracking-wider">{renderVisuals(currentQuestion.num1, currentQuestion.emoji)}</span>
              <span className="text-indigo-600">{currentQuestion.operator}</span>
              <span className="tracking-wider">{renderVisuals(currentQuestion.num2, currentQuestion.emoji)}</span>
              <span className="text-indigo-600">=</span>
              <span className="text-5xl font-black text-indigo-500 animate-pulse">?</span>
            </div>
            <div className="mt-4 text-sm text-slate-500 font-bold">
              Hãy đếm số lượng vật phẩm ở trên và làm phép tính nhé!
            </div>
          </div>

          {/* Option Buttons A, B, C, D */}
          <div className="grid grid-cols-2 gap-4">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedVal === opt.value;
              let btnClass = "bg-white text-slate-700 hover:bg-slate-50 border-slate-200";

              if (isSelected) {
                btnClass = isCorrect
                  ? "bg-green-500 text-white border-green-600 scale-105"
                  : "bg-rose-500 text-white border-rose-600 scale-95";
              }

              return (
                <button
                  key={opt.label}
                  onClick={() => handleSelectOption(opt.value)}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 text-left font-black transition-all duration-200 shadow-sm ${btnClass}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-black text-lg mr-4">
                    {opt.label}
                  </span>
                  <span className="text-3xl pr-4">{opt.value}</span>
                </button>
              );
            })}
          </div>

          {/* Live response message */}
          {selectedVal !== null && (
            <div className="text-center font-black text-lg animate-pulse">
              {isCorrect ? (
                <span className="text-green-600">🎉 Đúng rồi! Đang chuyển sang câu tiếp theo...</span>
              ) : (
                <span className="text-rose-600">❌ Chưa chính xác rồi, đếm kỹ lại xem nào!</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-slate-50 p-6 text-center font-bold text-slate-600 border border-slate-200 shadow-sm flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounce">🏆</div>
          <h3 className="text-2xl font-black text-green-700">Cậu tính siêu quá!</h3>
          <p className="text-green-600 font-bold">Cậu đã giải đúng hết 3 câu đố toán bằng hình ảnh.</p>
          <button
            onClick={startNewQuiz}
            className="mt-4 rounded-[1.5rem] bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4 text-base font-black text-white shadow-lg shadow-emerald-200 hover:scale-105 transition-transform"
          >
            🔄 Tiếp tục luyện tập thêm
          </button>
        </div>
      )}
    </div>
  );
}
