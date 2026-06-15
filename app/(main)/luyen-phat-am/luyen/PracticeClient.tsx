"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { displayFinalName, finalVideoFile, toneVideoFile, TONE_MARKS_DISPLAY } from "@/lib/pinyin-data";
import { blobToWav16k } from "@/lib/wav";
import { getHanzi } from "@/lib/hanzi-map";

const STORAGE_URL  = "https://arghgksrulxfyzxawmmq.supabase.co/storage/v1/object/public/videos";
const MAX_ATTEMPTS = 10;

function vidUrl(file: string) { return `${STORAGE_URL}/${file}.mp4`; }

type CardKey     = "initial" | "final" | "tone";
type RecordState = "idle" | "recording" | "processing";

interface ScoreDetail { pronunciation: number; accuracy: number; fluency: number; completeness: number; }
interface Props {
  initial: string; final: string; toneNum: number; pinyin: string;
  itemId: string; studentId: string | null;
  initialAttemptCount: number; initialHighestScore: number;
  vietnameseMeaning: string | null;
}

// ── Màu theo thang điểm ──────────────────────────────────────────────────────
// 0–30: đỏ | 31–65: vàng | 66–100: xanh
function scoreColor(v: number): string {
  if (v > 65) return "#10B981";
  if (v > 30) return "#F59E0B";
  return "#EF4444";
}

// ── Hook: đếm từ 0 → target với easing ──────────────────────────────────────
function useCountUp(target: number | null, duration = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === null) { setVal(0); return; }
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ── Thanh tiến trình ngang ───────────────────────────────────────────────────
function AnimatedBar({ value }: { value: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 60);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: scoreColor(value),
          transition: "width 1.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </div>
  );
}

// ── Một dòng chỉ số (label + counter + bar) ─────────────────────────────────
function MetricRow({ label, value }: { label: string; value: number }) {
  const displayed = useCountUp(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold text-gray-500 tracking-wide">{label}</span>
        <span className="text-sm font-black tabular-nums" style={{ color: scoreColor(value) }}>
          {displayed}
        </span>
      </div>
      <AnimatedBar value={value} />
    </div>
  );
}

// ── Vòng tròn điểm (bắt đầu tại 12 giờ) ─────────────────────────────────────
function ScoreRing({ value }: { value: number }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  const color = scoreColor(value);
  const [dash, setDash] = useState(0);
  const displayed = useCountUp(value);

  useEffect(() => {
    const t = setTimeout(() => setDash((value / 100) * C), 60);
    return () => clearTimeout(t);
  }, [value, C]);

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-label={`Điểm: ${value}`}>
      {/* Track */}
      <circle cx="44" cy="44" r={R} fill="none" stroke="#F3F4F6" strokeWidth="7" />
      {/* Progress — bắt đầu tại 12 giờ nhờ rotate(-90) */}
      <circle
        cx="44" cy="44" r={R}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${C}`}
        transform="rotate(-90 44 44)"
        style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
      <text x="44" y="40" textAnchor="middle" fontSize="19" fontWeight="800" fill={color}>{displayed}</text>
      <text x="44" y="57" textAnchor="middle" fontSize="10" fill="#9CA3AF">điểm</text>
    </svg>
  );
}

// ── Component chính ───────────────────────────────────────────────────────────
export function PracticeClient({
  initial, final, toneNum, pinyin, itemId,
  studentId, initialAttemptCount, initialHighestScore,
  vietnameseMeaning,
}: Props) {
  const [activeCard,   setActiveCard]   = useState<CardKey | null>(null);
  const [recordState,  setRecordState]  = useState<RecordState>("idle");
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [highestScore, setHighestScore] = useState(initialHighestScore);
  const [score,        setScore]        = useState<number | null>(null);
  const [detail,       setDetail]       = useState<ScoreDetail | null>(null);
  const [tips,         setTips]         = useState<string[]>([]);
  const [error,        setError]        = useState<string | null>(null);

  const initialVidRef = useRef<HTMLVideoElement>(null);
  const finalVidRef   = useRef<HTMLVideoElement>(null);
  const toneVidRef    = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);
  const pressingRef   = useRef(false);   // đang giữ nút mic hay không
  const startedAtRef  = useRef(0);       // mốc thời gian bắt đầu thu

  const locked = attemptCount >= MAX_ATTEMPTS;
  const hanzi  = getHanzi(initial, final, toneNum);

  const cards: {
    key: CardKey; label: string; name: string;
    videoFile: string; ref: React.RefObject<HTMLVideoElement | null>;
  }[] = [
    { key: "initial", label: "Thanh mẫu",  name: initial,                     videoFile: initial,                ref: initialVidRef },
    { key: "final",   label: "Vận mẫu",    name: displayFinalName(final),     videoFile: finalVideoFile(final),  ref: finalVidRef   },
    { key: "tone",    label: "Thanh điệu", name: TONE_MARKS_DISPLAY[toneNum], videoFile: toneVideoFile(toneNum), ref: toneVidRef    },
  ];

  // Preload cả 3 video & vẽ sẵn khung hình đầu để tránh trắng khung
  useEffect(() => {
    [initialVidRef, finalVidRef, toneVidRef].forEach(r => {
      const v = r.current;
      if (!v) return;
      v.load();
      const paintFirstFrame = () => { try { v.currentTime = 0.05; } catch { /* noop */ } };
      v.addEventListener("loadedmetadata", paintFirstFrame, { once: true });
    });
  }, []);

  const handleCardClick = (key: CardKey) =>
    setActiveCard(prev => prev === key ? null : key);

  const handlePlaySample = useCallback(() => {
    if (!activeCard) return;
    const vid = cards.find(c => c.key === activeCard)?.ref.current;
    if (vid) { vid.currentTime = 0; vid.play(); }
  }, [activeCard, cards]); // eslint-disable-line

  // ── NHẤN GIỮ ĐỂ NÓI (hold-to-talk) ────────────────────────────────────────
  // Nhấn giữ → bắt đầu thu. Thả ra → dừng & gửi API.
  const startHoldRecording = useCallback(async () => {
    if (locked || !hanzi || recordState !== "idle") return;
    pressingRef.current = true;
    setError(null); setScore(null); setDetail(null); setTips([]);
    audioChunks.current = [];

    // Rung báo hiệu bắt đầu thu (chỉ hoạt động trên thiết bị hỗ trợ)
    if (typeof navigator.vibrate === "function") navigator.vibrate(40);

    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const heldMs = Date.now() - startedAtRef.current;
        const blob   = new Blob(audioChunks.current, { type: mimeType });
        // Bấm hụt / quá ngắn → bỏ qua, không gửi API
        if (heldMs < 400 || blob.size < 1200) {
          setError("Hãy nhấn giữ lâu hơn rồi đọc to âm tiết.");
          setRecordState("idle");
          return;
        }
        setRecordState("processing");
        await submitAudio(blob, mimeType);
      };

      // Nếu user đã thả tay trong lúc xin quyền mic → dừng ngay
      if (!pressingRef.current) {
        stream.getTracks().forEach(t => t.stop());
        setRecordState("idle");
        return;
      }
      startedAtRef.current = Date.now();
      recorder.start();
      setRecordState("recording");
    } catch {
      pressingRef.current = false;
      setError("Không thể truy cập microphone.");
      setRecordState("idle");
    }
  }, [locked, hanzi, recordState]); // eslint-disable-line

  const stopHoldRecording = useCallback(() => {
    if (!pressingRef.current) return;
    pressingRef.current = false;
    if (typeof navigator.vibrate === "function") navigator.vibrate(15);
    const rec = mediaRecorder.current;
    if (rec && rec.state === "recording") rec.stop();
  }, []);

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
      const data = await res.json() as { score?: number; feedback?: string; tips?: string[]; detail?: ScoreDetail; error?: string };
      if (data.error || data.score === undefined) {
        setError(`Lỗi: ${data.error ?? "Không nhận được điểm"}`); return;
      }
      setScore(data.score); setDetail(data.detail ?? null); setTips(data.tips ?? []);
      if (studentId) {
        const r = await fetch("/api/practice/attempt", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, level: 1, score: data.score }),
        });
        if (r.ok) {
          const d = await r.json();
          setAttemptCount(d.attemptCount); setHighestScore(d.highestScore);
        }
      }
    } catch { setError("Có lỗi khi chấm điểm."); }
    finally { setRecordState("idle"); }
  }, [hanzi, pinyin, itemId, studentId]);

  const backUrl = `/luyen-phat-am/thanh-dieu?initial=${encodeURIComponent(initial)}&final=${encodeURIComponent(final)}`;

  // Dòng thông tin: ghép Hán / Pinyin / Việt — tự bỏ qua phần thiếu dữ liệu
  const infoParts: { text: string; isPinyin?: boolean; isVietnamese?: boolean }[] = [];
  if (hanzi) infoParts.push({ text: hanzi });
  infoParts.push({ text: pinyin, isPinyin: true });
  if (vietnameseMeaning) infoParts.push({ text: vietnameseMeaning, isVietnamese: true });

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">

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

      <div className="mx-auto w-full max-w-lg px-4 py-4 flex flex-col gap-4">

        {/* ── 1. THÔNG TIN TỪ ─────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between gap-3">

            {/* Dòng: Hán / Pinyin / Việt — phần nào thiếu thì tự ẩn cùng dấu "/" */}
            <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0">
              {infoParts.map((part, i) => (
                <span key={i} className="flex items-baseline gap-x-1.5">
                  {i > 0 && <span className="text-gray-300 font-light select-none">/</span>}
                  {part.isPinyin ? (
                    <span className="text-[3.4rem] font-black text-red-600 lowercase leading-none">
                      {part.text}
                    </span>
                  ) : part.isVietnamese ? (
                    <span className="text-[1.55rem] font-medium text-gray-500 leading-tight">
                      {part.text}
                    </span>
                  ) : (
                    <span className="text-[2.25rem] font-bold text-gray-800 leading-none">
                      {part.text}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Lượt thử */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[10px] text-gray-400 tabular-nums">{attemptCount}/{MAX_ATTEMPTS}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i < attemptCount ? "bg-red-400" : "bg-gray-200"}`}
                  />
                ))}
              </div>
              {highestScore > 0 && (
                <span className="text-[10px] font-semibold text-gray-400">
                  Cao nhất:{" "}
                  <span style={{ color: scoreColor(Math.round(highestScore)) }}>
                    {Math.round(highestScore)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. ĐIỂM SỐ — LUÔN HIỂN THỊ (mốc 0 khi chưa có dữ liệu) ───────── */}
        {/* Khối cố định, không bao giờ ẩn → màn hình không nhảy khi nhấn giữ */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center gap-5">

            {/* Bên trái: 3 dòng chỉ số (mặc định 0) */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <MetricRow label="Chính xác" value={detail?.accuracy ?? 0} />
              <MetricRow label="Lưu loát"  value={detail?.fluency  ?? 0} />
              <MetricRow label="Tổng hợp"  value={score ?? 0}           />
            </div>

            {/* Bên phải: vòng tròn (spinner cùng kích thước khi đang chấm) */}
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 88, height: 88 }}>
              {recordState === "processing" ? (
                <svg className="h-10 w-10 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <ScoreRing value={score ?? 0} />
              )}
            </div>
          </div>

          {/* Phân tích lỗi & lời khuyên từ AI */}
          {tips.length > 0 && recordState !== "processing" && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Nhận xét &amp; cần khắc phục</p>
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: scoreColor(score ?? 0) }}
                  />
                  <span className="text-sm text-gray-600 leading-snug">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. VIDEO CARDS ───────────────────────────────────────────────── */}
        <p className="text-center text-xs text-gray-400 -mb-1">
          Ấn vào video để xem hướng dẫn chi tiết
        </p>
        <div className="flex gap-2 h-40">
          {cards.map(card => {
            const isActive   = activeCard === card.key;
            const isInactive = activeCard !== null && !isActive;
            return (
              <div
                key={card.key}
                onClick={() => handleCardClick(card.key)}
                className={[
                  "relative rounded-2xl overflow-hidden cursor-pointer bg-gray-900 transition-all duration-300",
                  isActive ? "ring-2 ring-red-500 shadow-lg" : "",
                  activeCard === null ? "flex-1" : isActive ? "flex-[3]" : "flex-[0.7]",
                ].join(" ")}
                style={{
                  filter:  isInactive ? "blur(1.5px)" : "none",
                  opacity: isInactive ? 0.45 : 1,
                }}
              >
                <video
                  ref={card.ref}
                  src={vidUrl(card.videoFile)}
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLVideoElement).style.display = "none"; }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 flex flex-col items-center">
                  <span className="text-white font-bold text-sm leading-tight lowercase">{card.name}</span>
                  <span className="text-white/60 text-[10px]">({card.label})</span>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Cấu trúc [ ] + [ ] + [ ] ─────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2">
          {cards.map((card, idx) => (
            <div key={card.key} className="flex items-center gap-2">
              {idx > 0 && <span className="text-gray-300 font-bold text-lg select-none">+</span>}
              <button
                onClick={() => handleCardClick(card.key)}
                className={[
                  "rounded-xl border-2 px-3 py-2 min-w-[58px] text-center transition-all duration-200",
                  activeCard === card.key
                    ? "border-red-500 bg-red-50 scale-105 shadow"
                    : "border-gray-200 bg-white hover:border-red-300",
                ].join(" ")}
              >
                <span className="text-gray-400 text-xs select-none">[</span>
                <span className="text-base font-bold text-gray-800 mx-0.5 lowercase">{card.name}</span>
                <span className="text-gray-400 text-xs select-none">]</span>
              </button>
            </div>
          ))}
        </div>

        {/* ── 2 NÚT HÀNH ĐỘNG ─────────────────────────────────────────────── */}
        <div className="flex gap-3">
          {/* Nghe mẫu */}
          <button
            onClick={handlePlaySample}
            disabled={!activeCard}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl
                       bg-red-600 py-4 text-sm font-bold text-white
                       hover:bg-red-700 active:scale-95 transition
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            Nghe mẫu
          </button>

          {/* Nhấn giữ để nói — nút Micro */}
          {!hanzi ? (
            <div className="flex-1 flex items-center justify-center text-center rounded-2xl bg-gray-100 py-4 px-2 text-xs font-medium text-gray-500">
              Âm tiết này không tồn tại, chưa chấm được
            </div>
          ) : locked ? (
            <div className="flex-1 flex items-center justify-center rounded-2xl bg-gray-100 py-4 text-xs font-medium text-gray-500">
              🔒 Hết lượt hôm nay
            </div>
          ) : (
            <button
              type="button"
              onContextMenu={e => e.preventDefault()}
              onTouchStart={e => { e.preventDefault(); startHoldRecording(); }}
              onTouchEnd={e => { e.preventDefault(); stopHoldRecording(); }}
              onTouchCancel={stopHoldRecording}
              onMouseDown={startHoldRecording}
              onMouseUp={stopHoldRecording}
              onMouseLeave={stopHoldRecording}
              disabled={recordState === "processing"}
              style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl py-3 font-bold text-white select-none",
                "transition-transform",
                recordState === "recording"  ? "bg-red-500 animate-pulse scale-105 ring-4 ring-red-200" : "",
                recordState === "processing" ? "bg-gray-400 cursor-not-allowed"                          : "",
                recordState === "idle"       ? "bg-orange-500 hover:bg-orange-600 active:scale-95"        : "",
              ].join(" ")}
            >
              {recordState === "processing" ? (
                <>
                  <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span className="text-xs">Đang chấm...</span>
                </>
              ) : recordState === "recording" ? (
                <>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                    <path d="M19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V23h2v-3.06A9 9 0 0 0 21 11h-2z" />
                  </svg>
                  <span className="text-xs">Đang thu... thả ra để chấm</span>
                </>
              ) : (
                <>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                    <path d="M19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V23h2v-3.06A9 9 0 0 0 21 11h-2z" />
                  </svg>
                  <span className="text-xs">Nhấn giữ để nói</span>
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
