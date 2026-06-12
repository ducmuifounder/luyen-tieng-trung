"use client";

import { useState } from "react";

interface Syllable {
  text:  string;
  score: number;
}

interface Props {
  itemId:        string;
  level:         number;
  highestScore:  number;
  attemptCount:  number;
  breakdown?:    Syllable[];
}

const scoreColor = (s: number) =>
  s >= 90 ? "text-green-600" : s >= 65 ? "text-yellow-600" : "text-red-500";

const scoreBg = (s: number) =>
  s >= 90 ? "bg-green-50 border-green-200" : s >= 65 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

export function PracticeCard({ itemId, level, highestScore, attemptCount, breakdown }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border p-3 ${scoreBg(highestScore)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Badge cấp độ */}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold
            ${level === 1 ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
            C{level}
          </span>
          <span className="text-base font-semibold text-gray-800">{itemId}</span>
          <span className="text-xs text-gray-400">{attemptCount}/3 lần</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${scoreColor(highestScore)}`}>
            {highestScore.toFixed(0)}
            <span className="text-xs font-normal">đ</span>
          </span>
          {/* Nút mở breakdown cho Cấp 2 */}
          {level === 2 && breakdown && breakdown.length > 0 && (
            <button
              onClick={() => setOpen(!open)}
              className="rounded-full bg-white p-1 text-gray-400 shadow-sm hover:text-gray-600"
            >
              <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Breakdown Cấp 2 */}
      {open && breakdown && breakdown.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
          {breakdown.map((syl, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{syl.text}</span>
              <span className={`font-semibold ${scoreColor(syl.score)}`}>
                {syl.score.toFixed(0)}đ
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
