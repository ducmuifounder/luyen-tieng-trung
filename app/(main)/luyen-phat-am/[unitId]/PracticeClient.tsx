"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PronunciationUnit, UserProgress } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

const TYPE_LABEL: Record<string, string> = {
  initial: "Thanh mẫu",
  final: "Vận mẫu",
  tone: "Thanh điệu",
};

const PASS_THRESHOLD = 65;

interface Props {
  unit: PronunciationUnit;
  initialProgress: UserProgress | null;
  userId: string | null;
}

type RecordState = "idle" | "recording" | "processing";

interface ScoreDetail {
  pronunciation: number;
  fluency: number;
  integrity: number;
}

export function PracticeClient({ unit, initialProgress, userId }: Props) {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [score, setScore] = useState<number | null>(
    initialProgress?.best_score ?? null
  );
  const [bestScore, setBestScore] = useState<number>(
    initialProgress?.best_score ?? 0
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScoreDetail | null>(null);
  const [passed, setPassed] = useState(initialProgress?.status === "passed");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      mediaRecorder.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // --- Phát âm mẫu ---
  const handlePlaySample = useCallback(() => {
    if (!unit.audio_url) return;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      const audio = new Audio(unit.audio_url);
      audioRef.current = audio;
      audio.play();
    }
  }, [unit.audio_url]);

  // --- Ghi âm ---
  const startRecording = useCallback(async () => {
    setError(null);
    setScore(null);
    setFeedback(null);
    setDetail(null);
    audioChunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Tự động chọn format: iOS Safari chỉ hỗ trợ mp4, Android/Chrome hỗ trợ webm
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunks.current, { type: mimeType });
        await submitAudio(blob, mimeType);
      };

      recorder.start();
      setRecordState("recording");

      // Đếm ngược 3 giây rồi tự dừng
      let secs = 3;
      setCountdown(secs);
      const interval = setInterval(() => {
        secs -= 1;
        if (secs <= 0) {
          clearInterval(interval);
          setCountdown(null);
          recorder.stop();
          setRecordState("processing");
        } else {
          setCountdown(secs);
        }
      }, 1000);
    } catch {
      setError("Không thể truy cập microphone. Vui lòng cấp quyền và thử lại.");
      setRecordState("idle");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Gửi API chấm điểm ---
  const submitAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      // Đặt tên file đúng extension để server nhận diện format
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const form = new FormData();
      form.append("audio", blob, `recording.${ext}`);
      form.append("mimeType", mimeType);
      form.append("unitName", unit.name);
      form.append("unitType", unit.type);

      try {
        const res = await fetch("/api/score-pronunciation", {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error();
        const data: { score: number; feedback: string; detail?: ScoreDetail } = await res.json();

        setScore(data.score);
        setFeedback(data.feedback);
        setDetail(data.detail ?? null);

        const newBest = Math.max(bestScore, data.score);
        setBestScore(newBest);

        const nowPassed = newBest >= PASS_THRESHOLD;
        setPassed(nowPassed);

        // Lưu tiến trình nếu đã đăng nhập
        if (userId) {
          await supabase.from("user_progress").upsert(
            {
              user_id: userId,
              unit_id: unit.id,
              best_score: newBest,
              attempt_count: (initialProgress?.attempt_count ?? 0) + 1,
              status: nowPassed ? "passed" : "in_progress",
              first_attempt_at: initialProgress?.status === "not_started"
                ? new Date().toISOString()
                : undefined,
              last_attempt_at: new Date().toISOString(),
              passed_at: nowPassed && !passed ? new Date().toISOString() : undefined,
            },
            { onConflict: "user_id,unit_id" }
          );
        }
      } catch {
        setError("Có lỗi khi chấm điểm. Vui lòng thử lại.");
      } finally {
        setRecordState("idle");
      }
    },
    [unit, userId, bestScore, passed, initialProgress]
  );

  // --- Màu điểm số ---
  const scoreColor =
    score === null
      ? ""
      : score >= 90
      ? "text-green-600"
      : score >= 65
      ? "text-yellow-600"
      : "text-red-500";

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* Thẻ tên âm */}
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-8 py-10 shadow-md border border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {TYPE_LABEL[unit.type]}
        </span>
        <span className="text-8xl font-bold text-gray-900">{unit.name}</span>

        {passed && (
          <span className="mt-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            ✓ Đã đạt
          </span>
        )}
      </div>

      {/* Thông tin hướng dẫn */}
      {(unit.overview || unit.lip_tip || unit.tongue_tip) && (
        <div className="space-y-3 rounded-2xl bg-amber-50 p-5 text-sm text-gray-700">
          {unit.overview && (
            <p><span className="font-semibold">Tổng quan:</span> {unit.overview}</p>
          )}
          {unit.lip_tip && (
            <p><span className="font-semibold">Khẩu hình môi:</span> {unit.lip_tip}</p>
          )}
          {unit.tongue_tip && (
            <p><span className="font-semibold">Vị trí lưỡi:</span> {unit.tongue_tip}</p>
          )}
        </div>
      )}

      {/* Nút hành động */}
      <div className="flex flex-col gap-3">
        {/* Nghe mẫu */}
        <button
          onClick={handlePlaySample}
          disabled={!unit.audio_url}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-red-200
                     bg-white py-4 text-base font-semibold text-red-600 transition
                     hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {unit.audio_url ? "Nghe mẫu" : "Nghe mẫu (chưa có audio)"}
        </button>

        {/* Ghi âm */}
        <button
          onClick={startRecording}
          disabled={recordState !== "idle"}
          className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-base
                      font-semibold text-white transition
                      ${
                        recordState === "recording"
                          ? "bg-red-500 animate-pulse"
                          : recordState === "processing"
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
        >
          {recordState === "recording" ? (
            <>
              <span className="h-3 w-3 rounded-full bg-white" />
              Đang ghi âm... ({countdown}s)
            </>
          ) : recordState === "processing" ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              AI đang chấm điểm...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18.5A6.5 6.5 0 0 0 18.5 12V10m-13 2a6.5 6.5 0 0 0 6.5 6.5M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              </svg>
              Bấm để ghi âm (3 giây)
            </>
          )}
        </button>
      </div>

      {/* Kết quả chấm điểm */}
      {score !== null && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Điểm lần này</span>
            <span className={`text-4xl font-bold ${scoreColor}`}>
              {score.toFixed(0)}
              <span className="text-lg">%</span>
            </span>
          </div>

          {/* Thanh điểm */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-700
                ${score >= 90 ? "bg-green-500" : score >= 65 ? "bg-yellow-400" : "bg-red-400"}`}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Ngưỡng đạt */}
          <div className="flex justify-end text-xs text-gray-400">
            Ngưỡng đạt: {PASS_THRESHOLD}%
          </div>

          {feedback && (
            <p className="text-sm text-gray-600 border-t pt-3">{feedback}</p>
          )}

          {/* Chi tiết điểm từ SpeechSuper */}
          {detail && (
            <div className="grid grid-cols-3 gap-2 border-t pt-3">
              {[
                { label: "Phát âm", value: detail.pronunciation },
                { label: "Lưu loát", value: detail.fluency },
                { label: "Đầy đủ",  value: detail.integrity },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center rounded-xl bg-gray-50 py-2">
                  <span className="text-lg font-bold text-gray-800">{item.value}</span>
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {bestScore > 0 && (
            <p className="text-xs text-gray-400">
              Điểm cao nhất của bạn: <strong>{bestScore.toFixed(0)}%</strong>
            </p>
          )}
        </div>
      )}

      {/* Lỗi */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Gợi ý sửa lỗi */}
      {unit.correction_guide && score !== null && score < PASS_THRESHOLD && (
        <div className="rounded-2xl bg-blue-50 p-5 text-sm text-gray-700">
          <p className="mb-1 font-semibold text-blue-700">Gợi ý sửa lỗi:</p>
          <p>{unit.correction_guide}</p>
        </div>
      )}
    </div>
  );
}
