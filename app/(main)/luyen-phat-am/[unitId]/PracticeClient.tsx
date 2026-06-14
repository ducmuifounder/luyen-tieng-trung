"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PronunciationUnit } from "@/lib/types";

const STORAGE_URL = "https://arghgksrulxfyzxawmmq.supabase.co/storage/v1/object/public/videos";

function getVideoUrl(name: string): string {
  const map: Record<string, string> = {
    ü: "v", üe: "ve", üan: "van", ün: "vn",
    iu: "iou", ui: "uei", un: "uen",
    "ā": "a1", "á": "a2", "ǎ": "a3", "à": "a4",
  };
  const fileName = map[name] ?? name;
  return `${STORAGE_URL}/${fileName}.mp4`;
}

const TONE_DISPLAY: Record<string, string> = {
  "ā": "ˉ", "á": "ˊ", "ǎ": "ˇ", "à": "ˋ",
};

const TYPE_LABEL: Record<string, string> = {
  initial: "Thanh mẫu",
  final:   "Vận mẫu",
  tone:    "Thanh điệu",
};

const MAX_ATTEMPTS    = 10; // tạm tăng để test
const PASS_THRESHOLD  = 65;

interface ScoreDetail {
  pronunciation: number;
  accuracy:      number;
  fluency:       number;
  completeness:  number;
}

interface Props {
  unit:                  PronunciationUnit;
  studentId:             string | null;
  initialAttemptCount:   number;
  initialHighestScore:   number;
}

type RecordState = "idle" | "recording" | "processing";

const scoreColor = (s: number) =>
  s >= 90 ? "text-green-600" : s >= 65 ? "text-yellow-600" : "text-red-500";

const scoreBarColor = (s: number) =>
  s >= 90 ? "bg-green-500" : s >= 65 ? "bg-yellow-400" : "bg-red-400";

export function PracticeClient({
  unit,
  studentId,
  initialAttemptCount,
  initialHighestScore,
}: Props) {
  const [recordState,  setRecordState]  = useState<RecordState>("idle");
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [highestScore, setHighestScore] = useState(initialHighestScore);
  const [score,        setScore]        = useState<number | null>(null);
  const [feedback,     setFeedback]     = useState<string | null>(null);
  const [detail,       setDetail]       = useState<ScoreDetail | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [countdown,    setCountdown]    = useState<number | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const videoRef      = useRef<HTMLVideoElement | null>(null);

  const locked = attemptCount >= MAX_ATTEMPTS;

  useEffect(() => {
    return () => mediaRecorder.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // ── Phát âm mẫu ─────────────────────────────────────────────────────────────
  const handlePlaySample = useCallback(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = 0;
      vid.play();
    }
  }, []);

  // ── Bắt đầu ghi âm ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (locked) return;
    setError(null);
    setScore(null);
    setFeedback(null);
    setDetail(null);
    audioChunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
  }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gửi chấm điểm + lưu kết quả ────────────────────────────────────────────
  const submitAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      const ext  = mimeType.includes("mp4") ? "mp4" : "webm";
      const form = new FormData();
      form.append("audio",    blob, `recording.${ext}`);
      form.append("mimeType", mimeType);
      form.append("unitName", unit.name);
      form.append("unitType", unit.type);

      try {
        // 1. Chấm điểm Azure Speech
        const scoreRes = await fetch("/api/score-pronunciation", {
          method: "POST",
          body:   form,
        });
        const scoreData: {
          score?: number; feedback?: string; detail?: ScoreDetail; error?: string;
        } = await scoreRes.json();

        if (scoreData.error || scoreData.score === undefined) {
          setError(`Lỗi chấm điểm: ${scoreData.error ?? "Không nhận được điểm"}`);
          return;
        }

        setScore(scoreData.score);
        setFeedback(scoreData.feedback ?? "");
        setDetail(scoreData.detail ?? null);

        // 2. Lưu vào Supabase qua API route
        if (studentId) {
          const attemptRes = await fetch("/api/practice/attempt", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              itemId: unit.name,
              level:  1,
              score:  scoreData.score,
            }),
          });

          if (attemptRes.ok) {
            const attemptData = await attemptRes.json();
            setAttemptCount(attemptData.attemptCount);
            setHighestScore(attemptData.highestScore);
          }
        }
      } catch {
        setError("Có lỗi khi chấm điểm. Vui lòng thử lại.");
      } finally {
        setRecordState("idle");
      }
    },
    [unit, studentId]
  );

  // ── Hiển thị badge lượt thử ─────────────────────────────────────────────────
  const renderAttemptBadge = () => {
    const dots = Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
      <span
        key={i}
        className={`inline-block h-2.5 w-2.5 rounded-full transition-colors ${
          i < attemptCount ? "bg-red-500" : "bg-gray-200"
        }`}
      />
    ));
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">
          Lượt thử: {attemptCount}/{MAX_ATTEMPTS}
        </span>
        <div className="flex gap-1">{dots}</div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Thẻ tên âm */}
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-8 py-5 shadow-md border border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {TYPE_LABEL[unit.type]}
        </span>
        <span className="text-6xl font-bold text-gray-900 lowercase">
          {TONE_DISPLAY[unit.name] ?? unit.name}
        </span>

        {/* Badge trạng thái */}
        {highestScore >= PASS_THRESHOLD && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            ✓ Đã đạt
          </span>
        )}

        {/* Lượt thử */}
        {renderAttemptBadge()}

        {/* Điểm cao nhất hôm nay */}
        {highestScore > 0 && (
          <div className="w-full">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Điểm cao nhất hôm nay</span>
              <span className={`font-semibold ${scoreColor(highestScore)}`}>
                {highestScore.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${scoreBarColor(highestScore)}`}
                style={{ width: `${highestScore}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Video hướng dẫn phát âm */}
      <div className="rounded-3xl overflow-hidden bg-black shadow-md">
        <video
          key={unit.name}
          ref={videoRef}
          src={getVideoUrl(unit.name)}
          controls
          playsInline
          className="w-full"
          onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
        />
      </div>

      {/* Hướng dẫn phát âm */}
      {unit.description && (
        <div className="rounded-2xl bg-amber-50 p-4 leading-relaxed">
          <p className="mb-2 font-bold text-amber-700 text-base">Hướng dẫn phát âm</p>
          <p className="text-base font-semibold text-gray-800">{unit.description}</p>
        </div>
      )}

      {/* Nút hành động */}
      <div className="flex flex-col gap-3">
        {/* Nghe mẫu */}
        <button
          onClick={handlePlaySample}
          disabled={false}
          className="flex items-center justify-center gap-2 rounded-2xl border-2
                     border-red-200 bg-white py-4 text-base font-semibold text-red-600
                     transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Nghe mẫu
        </button>

        {/* Ghi âm / Khóa */}
        {locked ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-gray-100 py-4 text-sm font-medium text-gray-500">
            🔒 Đã dùng hết 3 lượt hôm nay · Quay lại ngày mai nhé!
          </div>
        ) : (
          <button
            onClick={startRecording}
            disabled={recordState !== "idle"}
            className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-base
                        font-semibold text-white transition
                        ${recordState === "recording"
                          ? "bg-red-500 animate-pulse"
                          : recordState === "processing"
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700"}`}
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
        )}
      </div>

      {/* Kết quả chấm điểm */}
      {score !== null && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Điểm lần này</span>
            <span className={`text-4xl font-bold ${scoreColor(score)}`}>
              {score.toFixed(0)}<span className="text-lg">%</span>
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>Ngưỡng đạt: {PASS_THRESHOLD}%</span>
            {score >= PASS_THRESHOLD
              ? <span className="text-green-600 font-medium">✓ Đạt!</span>
              : <span className="text-red-500">Chưa đạt</span>}
          </div>

          {feedback && (
            <p className="text-sm text-gray-600 border-t pt-3">{feedback}</p>
          )}

          {detail && (
            <div className="grid grid-cols-3 gap-2 border-t pt-3">
              {[
                { label: "Chính xác",  value: detail.accuracy },
                { label: "Lưu loát",   value: detail.fluency },
                { label: "Đầy đủ",     value: detail.completeness },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center rounded-xl bg-gray-50 py-2">
                  <span className="text-lg font-bold text-gray-800">{item.value}</span>
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gợi ý sửa lỗi */}
      {unit.correction_guide && score !== null && score < PASS_THRESHOLD && (
        <div className="rounded-2xl bg-blue-50 p-4 text-sm text-gray-700">
          <p className="mb-1 font-semibold text-blue-700">Gợi ý sửa lỗi:</p>
          <p>{unit.correction_guide}</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
    </div>
  );
}
