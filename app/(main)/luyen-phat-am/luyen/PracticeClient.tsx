"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { displayFinalName, finalVideoFile, toneVideoFile, TONE_MARKS_DISPLAY } from "@/lib/pinyin-data";
import { blobToWav16k } from "@/lib/wav";
import { getHanzi } from "@/lib/hanzi-map";

const STORAGE_URL    = "https://arghgksrulxfyzxawmmq.supabase.co/storage/v1/object/public/videos";
const MAX_ATTEMPTS   = 10;
const PASS_THRESHOLD = 65;

function vidUrl(file: string) { return `${STORAGE_URL}/${file}.mp4`; }

type CardKey     = "initial" | "final" | "tone";
type RecordState = "idle" | "recording" | "processing";

interface ScoreDetail { pronunciation: number; accuracy: number; fluency: number; completeness: number; }
interface Props {
  initial: string; final: string; toneNum: number; pinyin: string;
  itemId: string; studentId: string | null;
  initialAttemptCount: number; initialHighestScore: number;
}

// Vòng tròn điểm
function ScoreRing({ value }: { value: number }) {
  const r = 28; const c = 2 * Math.PI * r;
  const color = value >= 90 ? "#16a34a" : value >= 65 ? "#ca8a04" : "#dc2626";
  const dash  = (value / 100) * c;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${c}`} strokeDashoffset={c / 4}
        strokeLinecap="round" style={{ transition: "stroke-dasharray .6s ease" }} />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{value}%</text>
    </svg>
  );
}

// Badge nhận xét
function Badge({ score }: { score: number }) {
  if (score >= 90) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">TUYỆT VỜI</span>;
  if (score >= 75) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">XUẤT SẮC</span>;
  if (score >= 65) return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">ĐÃ ĐẠT</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">CẦN CỐ GẮNG</span>;
}

export function PracticeClient({
  initial, final, toneNum, pinyin, itemId,
  studentId, initialAttemptCount, initialHighestScore,
}: Props) {
  const [activeCard,   setActiveCard]   = useState<CardKey | null>(null);
  const [recordState,  setRecordState]  = useState<RecordState>("idle");
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [highestScore, setHighestScore] = useState(initialHighestScore);
  const [score,        setScore]        = useState<number | null>(null);
  const [detail,       setDetail]       = useState<ScoreDetail | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [countdown,    setCountdown]    = useState<number | null>(null);

  const initialVidRef = useRef<HTMLVideoElement>(null);
  const finalVidRef   = useRef<HTMLVideoElement>(null);
  const toneVidRef    = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);

  const locked = attemptCount >= MAX_ATTEMPTS;
  const hanzi  = getHanzi(initial, final, toneNum);

  const cards: { key: CardKey; label: string; name: string; videoFile: string; ref: React.RefObject<HTMLVideoElement | null> }[] = [
    { key: "initial", label: "Thanh mẫu",  name: initial,                     videoFile: initial,                ref: initialVidRef },
    { key: "final",   label: "Vận mẫu",    name: displayFinalName(final),     videoFile: finalVideoFile(final),  ref: finalVidRef   },
    { key: "tone",    label: "Thanh điệu", name: TONE_MARKS_DISPLAY[toneNum], videoFile: toneVideoFile(toneNum), ref: toneVidRef    },
  ];

  const handleCardClick = (key: CardKey) =>
    setActiveCard((prev) => (prev === key ? null : key));

  const handlePlaySample = useCallback(() => {
    if (!activeCard) return;
    const vid = cards.find((c) => c.key === activeCard)?.ref.current;
    if (vid) { vid.currentTime = 0; vid.play(); }
  }, [activeCard, cards]); // eslint-disable-line

  const startRecording = useCallback(async () => {
    if (locked) return;
    setError(null); setScore(null); setDetail(null);
    audioChunks.current = [];
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await submitAudio(new Blob(audioChunks.current, { type: mimeType }), mimeType);
      };
      recorder.start(); setRecordState("recording");
      let secs = 3; setCountdown(secs);
      const iv = setInterval(() => {
        secs -= 1;
        if (secs <= 0) { clearInterval(iv); setCountdown(null); recorder.stop(); setRecordState("processing"); }
        else setCountdown(secs);
      }, 1000);
    } catch {
      setError("Không thể truy cập microphone."); setRecordState("idle");
    }
  }, [locked]); // eslint-disable-line

  const submitAudio = useCallback(async (blob: Blob, mimeType: string) => {
    const form = new FormData();
    try {
      const wav = await blobToWav16k(blob);
      form.append("audio", wav, "rec.wav");
      form.append("mimeType", "audio/wav");
    } catch {
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      form.append("audio", blob, `rec.${ext}`);
      form.append("mimeType", mimeType);
    }
    form.append("unitName", hanzi ?? pinyin);
    form.append("unitType", hanzi ? "hanzi" : "combined");
    try {
      const res  = await fetch("/api/score-pronunciation", { method: "POST", body: form });
      const data = await res.json() as { score?: number; feedback?: string; detail?: ScoreDetail; error?: string };
      if (data.error || data.score === undefined) { setError(`Lỗi: ${data.error ?? "Không nhận được điểm"}`); return; }
      setScore(data.score); setDetail(data.detail ?? null);
      if (studentId) {
        const r = await fetch("/api/practice/attempt", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, level: 1, score: data.score }),
        });
        if (r.ok) { const d = await r.json(); setAttemptCount(d.attemptCount); setHighestScore(d.highestScore); }
      }
    } catch { setError("Có lỗi khi chấm điểm."); }
    finally { setRecordState("idle"); }
  }, [hanzi, pinyin, itemId, studentId]);

  const backUrl = `/luyen-phat-am/thanh-dieu?initial=${encodeURIComponent(initial)}&final=${encodeURIComponent(final)}`;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center">
        <Link href={backUrl} className="text-gray-500 hover:text-gray-700 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold tracking-widest uppercase text-gray-800">
          Phòng Luyện
        </h1>
        <div className="w-5" />
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">

        {/* ── Thẻ Hán / Pinyin ───────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              {hanzi && (
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">Hán:</span>{" "}
                  <span className="text-xl font-bold text-gray-900">{hanzi}</span>
                </p>
              )}
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">Pinyin:</span>{" "}
                <span className="text-xl font-bold text-red-600">{pinyin}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Lượt: {attemptCount}/{MAX_ATTEMPTS}</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                  <span key={i} className={`h-2 w-2 rounded-full ${i < attemptCount ? "bg-red-400" : "bg-gray-200"}`} />
                ))}
              </div>
              {highestScore > 0 && (
                <span className="text-xs font-semibold text-gray-500">
                  Cao nhất: <span className="text-red-600">{Math.round(highestScore)}%</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Kết quả chấm điểm ──────────────────────────────────────────── */}
        {score !== null && detail && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-5 py-4">
            <div className="flex items-center gap-4">
              {/* Vòng tròn điểm */}
              <div className="flex flex-col items-center gap-0.5">
                <ScoreRing value={score} />
                <span className="text-[10px] font-semibold text-gray-500">
                  {score >= 90 ? "Tuyệt vời" : score >= 65 ? "Đã đạt" : "Cần cố gắng"}
                </span>
              </div>
              {/* Chi tiết điểm */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                {[
                  { label: "Chính xác", value: detail.accuracy },
                  { label: "Lưu loát",  value: detail.fluency  },
                  { label: "Đầy đủ",    value: detail.completeness },
                  { label: "Tổng hợp",  value: score },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{item.label}</span>
                      <span className="text-xs font-bold text-gray-800">{item.value}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.value >= 90 ? "bg-green-500" : item.value >= 65 ? "bg-yellow-400" : "bg-red-400"
                        }`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                    <Badge score={item.value} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 3 Video cards ──────────────────────────────────────────────── */}
        <div className="flex gap-2 h-40">
          {cards.map((card) => {
            const isActive   = activeCard === card.key;
            const isInactive = activeCard !== null && !isActive;
            return (
              <div
                key={card.key}
                onClick={() => handleCardClick(card.key)}
                className={[
                  "relative rounded-2xl overflow-hidden cursor-pointer bg-gray-900 transition-all duration-300",
                  isActive   ? "ring-2 ring-red-500 shadow-lg" : "",
                  isInactive ? "opacity-40"                    : "",
                  activeCard === null ? "flex-1" : isActive ? "flex-[3]" : "flex-[0.7]",
                ].join(" ")}
                style={{ filter: isInactive ? "blur(1.5px)" : "none" }}
              >
                <video
                  ref={card.ref}
                  src={vidUrl(card.videoFile)}
                  playsInline
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 flex flex-col items-center">
                  <span className="text-white font-bold text-sm leading-tight">{card.name}</span>
                  <span className="text-white/60 text-[10px]">({card.label})</span>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Cấu trúc từ ghép [ ] + [ ] + [ ] ──────────────────────────── */}
        <div className="flex items-center justify-center gap-2">
          {cards.map((card, idx) => (
            <div key={card.key} className="flex items-center gap-2">
              {idx > 0 && <span className="text-gray-300 font-bold text-lg">+</span>}
              <button
                onClick={() => handleCardClick(card.key)}
                className={[
                  "rounded-xl border-2 px-3 py-2 text-center transition-all duration-200 min-w-[60px]",
                  activeCard === card.key
                    ? "border-red-500 bg-red-50 scale-105 shadow"
                    : "border-gray-300 bg-white hover:border-red-300",
                ].join(" ")}
              >
                <span className="text-gray-400 text-xs">[</span>
                <span className="text-base font-bold text-gray-800 mx-0.5">{card.name}</span>
                <span className="text-gray-400 text-xs">]</span>
              </button>
            </div>
          ))}
        </div>

        {/* ── 2 Nút nằm ngang ────────────────────────────────────────────── */}
        <div className="flex gap-3">
          {/* Nghe mẫu */}
          <button
            onClick={handlePlaySample}
            disabled={!activeCard}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl
                       bg-red-600 py-4 text-sm font-bold text-white
                       hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            Nghe mẫu
          </button>

          {/* Đọc & chấm điểm */}
          {locked ? (
            <div className="flex-1 flex items-center justify-center rounded-2xl bg-gray-100 py-4 text-xs font-medium text-gray-500">
              🔒 Hết lượt hôm nay
            </div>
          ) : (
            <button
              onClick={startRecording}
              disabled={recordState !== "idle"}
              className={[
                "flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition",
                recordState === "recording"  ? "bg-red-500 animate-pulse"       : "",
                recordState === "processing" ? "bg-gray-400 cursor-not-allowed" : "",
                recordState === "idle"       ? "bg-orange-500 hover:bg-orange-600" : "",
              ].join(" ")}
            >
              {recordState === "recording" ? (
                <><span className="h-2.5 w-2.5 rounded-full bg-white" /> {countdown}s</>
              ) : recordState === "processing" ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang chấm...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 18.5A6.5 6.5 0 0 0 18.5 12V10m-13 2a6.5 6.5 0 0 0 6.5 6.5M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                  </svg>
                  Đọc và chấm điểm
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
      </div>
    </main>
  );
}
