"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { displayFinalName, finalVideoFile, toneVideoFile, TONE_MARKS_DISPLAY, TONE_NAMES } from "@/lib/pinyin-data";
import { blobToWav16k } from "@/lib/wav";

const STORAGE_URL   = "https://arghgksrulxfyzxawmmq.supabase.co/storage/v1/object/public/videos";
const MAX_ATTEMPTS  = 10;
const PASS_THRESHOLD = 65;

function vidUrl(file: string) {
  return `${STORAGE_URL}/${file}.mp4`;
}

type CardKey    = "initial" | "final" | "tone";
type RecordState = "idle" | "recording" | "processing";

interface ScoreDetail {
  pronunciation: number;
  accuracy:      number;
  fluency:       number;
  completeness:  number;
}

interface Props {
  initial:             string;
  final:               string;
  toneNum:             number;
  pinyin:              string;
  itemId:              string;
  studentId:           string | null;
  initialAttemptCount: number;
  initialHighestScore: number;
}

const scoreColor    = (s: number) => s >= 90 ? "text-green-600" : s >= 65 ? "text-yellow-600" : "text-red-500";
const scoreBarColor = (s: number) => s >= 90 ? "bg-green-500"  : s >= 65 ? "bg-yellow-400"   : "bg-red-400";

export function PracticeClient({
  initial, final, toneNum, pinyin, itemId,
  studentId, initialAttemptCount, initialHighestScore,
}: Props) {
  const [activeCard,   setActiveCard]   = useState<CardKey | null>(null);
  const [recordState,  setRecordState]  = useState<RecordState>("idle");
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [highestScore, setHighestScore] = useState(initialHighestScore);
  const [score,        setScore]        = useState<number | null>(null);
  const [feedback,     setFeedback]     = useState<string | null>(null);
  const [detail,       setDetail]       = useState<ScoreDetail | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [countdown,    setCountdown]    = useState<number | null>(null);

  const initialVidRef = useRef<HTMLVideoElement>(null);
  const finalVidRef   = useRef<HTMLVideoElement>(null);
  const toneVidRef    = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);

  const locked = attemptCount >= MAX_ATTEMPTS;

  const cards: { key: CardKey; label: string; name: string; videoFile: string; ref: React.RefObject<HTMLVideoElement | null> }[] = [
    { key: "initial", label: "Thanh mẫu",  name: initial,                   videoFile: initial,                ref: initialVidRef },
    { key: "final",   label: "Vận mẫu",    name: displayFinalName(final),   videoFile: finalVideoFile(final),  ref: finalVidRef   },
    { key: "tone",    label: "Thanh điệu", name: TONE_MARKS_DISPLAY[toneNum], videoFile: toneVideoFile(toneNum), ref: toneVidRef  },
  ];

  const handleCardClick = (key: CardKey) => {
    setActiveCard((prev) => (prev === key ? null : key));
  };

  const handlePlaySample = useCallback(() => {
    if (!activeCard) return;
    const card = cards.find((c) => c.key === activeCard);
    const vid  = card?.ref.current;
    if (vid) { vid.currentTime = 0; vid.play(); }
  }, [activeCard, cards]); // eslint-disable-line

  const startRecording = useCallback(async () => {
    if (locked) return;
    setError(null); setScore(null); setFeedback(null); setDetail(null);
    audioChunks.current = [];

    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await submitAudio(new Blob(audioChunks.current, { type: mimeType }), mimeType);
      };
      recorder.start();
      setRecordState("recording");

      let secs = 3;
      setCountdown(secs);
      const iv = setInterval(() => {
        secs -= 1;
        if (secs <= 0) { clearInterval(iv); setCountdown(null); recorder.stop(); setRecordState("processing"); }
        else setCountdown(secs);
      }, 1000);
    } catch {
      setError("Không thể truy cập microphone. Vui lòng cấp quyền và thử lại.");
      setRecordState("idle");
    }
  }, [locked]); // eslint-disable-line

  const submitAudio = useCallback(async (blob: Blob, mimeType: string) => {
    const form = new FormData();
    try {
      // Chuyển sang WAV 16kHz mono để Azure đọc chuẩn (tránh lỗi webm thiếu duration)
      const wav = await blobToWav16k(blob);
      form.append("audio",    wav, "rec.wav");
      form.append("mimeType", "audio/wav");
    } catch {
      // Nếu không decode được, gửi nguyên bản
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      form.append("audio",    blob, `rec.${ext}`);
      form.append("mimeType", mimeType);
    }
    form.append("unitName", pinyin);
    form.append("unitType", "combined");

    try {
      const res  = await fetch("/api/score-pronunciation", { method: "POST", body: form });
      const data = await res.json() as { score?: number; feedback?: string; detail?: ScoreDetail; error?: string };

      if (data.error || data.score === undefined) {
        setError(`Lỗi chấm điểm: ${data.error ?? "Không nhận được điểm"}`);
        return;
      }
      setScore(data.score);
      setFeedback(data.feedback ?? "");
      setDetail(data.detail ?? null);

      if (studentId) {
        const r = await fetch("/api/practice/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, level: 1, score: data.score }),
        });
        if (r.ok) {
          const d = await r.json();
          setAttemptCount(d.attemptCount);
          setHighestScore(d.highestScore);
        }
      }
    } catch {
      setError("Có lỗi khi chấm điểm. Vui lòng thử lại.");
    } finally {
      setRecordState("idle");
    }
  }, [pinyin, itemId, studentId]);

  const backUrl = `/luyen-phat-am/thanh-dieu?initial=${encodeURIComponent(initial)}&final=${encodeURIComponent(final)}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">

      {/* ── Phần 1: Pinyin hoàn chỉnh ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href={backUrl} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Phòng luyện</span>
      </div>

      <div className="flex flex-col items-center rounded-3xl bg-white shadow-md border border-gray-100 px-8 py-5 gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Pinyin</span>
        <span className="text-6xl font-bold text-gray-900">{pinyin}</span>

        {highestScore > 0 && (
          <div className="w-full mt-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Điểm cao nhất hôm nay</span>
              <span className={`font-semibold ${scoreColor(highestScore)}`}>{Math.round(highestScore)}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${scoreBarColor(highestScore)}`} style={{ width: `${highestScore}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <span>Lượt: {attemptCount}/{MAX_ATTEMPTS}</span>
          <div className="flex gap-1">
            {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i < attemptCount ? "bg-red-400" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Phần 2: 3 thẻ video xếp ngang ─────────────────────────────────── */}
      <div className="flex gap-2 h-36">
        {cards.map((card) => {
          const isActive   = activeCard === card.key;
          const isInactive = activeCard !== null && !isActive;
          return (
            <div
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              className={[
                "relative rounded-2xl overflow-hidden cursor-pointer bg-gray-900",
                "transition-all duration-300",
                isActive   ? "ring-2 ring-red-400 shadow-xl"       : "",
                isInactive ? "opacity-40"                           : "",
                activeCard === null  ? "flex-1"  : "",
                isActive             ? "flex-[3]" : "",
                isInactive           ? "flex-[0.7]" : "",
              ].join(" ")}
              style={{ filter: isInactive ? "blur(2px)" : "none" }}
            >
              <video
                ref={card.ref}
                src={vidUrl(card.videoFile)}
                playsInline
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1.5 flex flex-col items-center">
                <span className="text-white font-bold text-sm leading-tight">{card.name}</span>
                <span className="text-white/60 text-[10px]">{card.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Phần 3: Cấu trúc từ ghép ──────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2">
        {cards.map((card, idx) => (
          <div key={card.key} className="flex items-center gap-2">
            {idx > 0 && <span className="text-gray-300 font-bold text-xl">+</span>}
            <button
              onClick={() => handleCardClick(card.key)}
              className={[
                "rounded-2xl px-4 py-3 text-center border-2 min-w-[72px] transition-all duration-200",
                activeCard === card.key
                  ? "border-red-400 bg-red-50 shadow-md scale-105"
                  : "border-gray-200 bg-white hover:border-red-200",
              ].join(" ")}
            >
              <div className="text-[10px] text-gray-400 mb-0.5">{card.label}</div>
              <div className="text-xl font-bold text-gray-800">{card.name}</div>
            </button>
          </div>
        ))}
      </div>

      {/* ── Nút hành động ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Nghe mẫu */}
        <button
          onClick={handlePlaySample}
          disabled={!activeCard}
          className="flex items-center justify-center gap-2 rounded-2xl border-2
                     border-red-200 bg-white py-4 text-base font-semibold text-red-600
                     transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {activeCard
            ? `Nghe mẫu — ${cards.find((c) => c.key === activeCard)?.label}`
            : "Chọn thành phần để nghe mẫu"}
        </button>

        {/* Ghi âm */}
        {locked ? (
          <div className="flex items-center justify-center rounded-2xl bg-gray-100 py-4 text-sm font-medium text-gray-500">
            🔒 Đã hết lượt hôm nay · Quay lại ngày mai!
          </div>
        ) : (
          <button
            onClick={startRecording}
            disabled={recordState !== "idle"}
            className={[
              "flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white transition",
              recordState === "recording"  ? "bg-red-500 animate-pulse"          : "",
              recordState === "processing" ? "bg-gray-400 cursor-not-allowed"    : "",
              recordState === "idle"       ? "bg-red-600 hover:bg-red-700"       : "",
            ].join(" ")}
          >
            {recordState === "recording" ? (
              <><span className="h-3 w-3 rounded-full bg-white" /> Đang ghi âm... ({countdown}s)</>
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
                Đọc chấm điểm — <span className="font-bold">{pinyin}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Kết quả ───────────────────────────────────────────────────────── */}
      {score !== null && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Điểm lần này</span>
            <span className={`text-4xl font-bold ${scoreColor(score)}`}>
              {Math.round(score)}<span className="text-lg">%</span>
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(score)}`}
              style={{ width: `${score}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Ngưỡng đạt: {PASS_THRESHOLD}%</span>
            {score >= PASS_THRESHOLD
              ? <span className="text-green-600 font-medium">✓ Đạt!</span>
              : <span className="text-red-500">Chưa đạt</span>}
          </div>
          {feedback && <p className="text-sm text-gray-600 border-t pt-3">{feedback}</p>}
          {detail && (
            <div className="grid grid-cols-3 gap-2 border-t pt-3">
              {[
                { label: "Chính xác", value: detail.accuracy },
                { label: "Lưu loát",  value: detail.fluency },
                { label: "Đầy đủ",    value: detail.completeness },
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

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
    </main>
  );
}
