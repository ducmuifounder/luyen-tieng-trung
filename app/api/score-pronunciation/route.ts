import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// ─── Cấu hình SpeechSuper ────────────────────────────────────────────────────
const APP_KEY    = process.env.SPEECHSUPER_APP_KEY    ?? "";
const SECRET_KEY = process.env.SPEECHSUPER_SECRET_KEY ?? "";

// SpeechSuper endpoint
// word.eval  → chấm điểm 1 từ / 1 âm tiết  (phù hợp cho Thanh mẫu, Vận mẫu)
// sent.eval  → chấm điểm cả câu / cụm từ
const CORE_TYPE = "word.eval";
const API_URL   = `https://api.speechsuper.com/${CORE_TYPE}`;

// ─── Kiểu dữ liệu ────────────────────────────────────────────────────────────
interface ScoreResult {
  score:    number;
  feedback: string;
  detail?: {
    pronunciation: number;
    fluency:       number;
    integrity:     number;
  };
}

interface SpeechSuperResponse {
  code:   number;
  msg:    string;
  result?: {
    overall?:      number;
    pronunciation?: number;
    fluency?:       number;
    integrity?:     number;
    // word.eval trả thêm:
    wordScore?:    number;
  };
}

// ─── Tạo token xác thực SHA1 ─────────────────────────────────────────────────
// Công thức: SHA1(appKey + secretKey + timestamp)
function buildToken(timestamp: number): string {
  return createHash("sha1")
    .update(`${APP_KEY}${SECRET_KEY}${timestamp}`)
    .digest("hex");
}

// ─── Nhận xét theo điểm ──────────────────────────────────────────────────────
function buildFeedback(score: number, unitName: string): string {
  if (score >= 90) return `Xuất sắc! Phát âm "${unitName}" của bạn rất chuẩn.`;
  if (score >= 75) return `Khá tốt! Cần luyện thêm độ tự nhiên cho "${unitName}".`;
  if (score >= 65) return `Đạt yêu cầu. Chú ý kiểm soát hơi thở khi phát âm "${unitName}".`;
  if (score >= 45) return `Cần cải thiện. Hãy xem lại khẩu hình miệng cho "${unitName}".`;
  return `Chưa đạt. Hãy nghe lại âm mẫu và thử lại "${unitName}".`;
}

// ─── Gọi SpeechSuper API ─────────────────────────────────────────────────────
async function assessWithSpeechSuper(
  audioBuffer: Buffer,
  referenceText: string
): Promise<ScoreResult> {
  const timestamp  = Math.floor(Date.now() / 1000);
  const token      = buildToken(timestamp);
  const audioBase64 = audioBuffer.toString("base64");

  const body = {
    appkey:    APP_KEY,
    token,
    timestamp,
    query: {
      coreType:        CORE_TYPE,
      refText:         referenceText,  // văn bản tham chiếu (âm cần chấm)
      audioType:       "webm",         // trình duyệt ghi ra webm/opus
      audioSampleRate: 16000,
      audioEncoding:   "opus",
      audio:           audioBase64,
      language:        "zh-CN",        // Phổ thông tiếng Trung
    },
  };

  const res = await fetch(API_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SpeechSuper HTTP ${res.status}: ${text}`);
  }

  const data: SpeechSuperResponse = await res.json();

  // code 0 = thành công
  if (data.code !== 0) {
    throw new Error(`SpeechSuper lỗi ${data.code}: ${data.msg}`);
  }

  const r = data.result ?? {};

  // overall → điểm tổng; nếu không có thì dùng wordScore / pronunciation
  const score = Math.round(
    r.overall ?? r.wordScore ?? r.pronunciation ?? 0
  );

  return {
    score,
    feedback: buildFeedback(score, referenceText),
    detail: {
      pronunciation: Math.round(r.pronunciation ?? 0),
      fluency:       Math.round(r.fluency       ?? 0),
      integrity:     Math.round(r.integrity     ?? 0),
    },
  };
}

// ─── Fallback mock (khi chưa cấu hình key) ───────────────────────────────────
function mockScore(unitName: string): ScoreResult {
  const score = Math.round(55 + Math.random() * 35);
  return {
    score,
    feedback: `[Giả lập] ${buildFeedback(score, unitName)}`,
  };
}

// ─── POST /api/score-pronunciation ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form      = await req.formData();
    const unitName  = (form.get("unitName")  as string) ?? "";
    const audioFile = form.get("audio") as File | null;

    // Chưa có key → dùng mock, dev không bị crash
    if (!APP_KEY || !SECRET_KEY) {
      await new Promise((r) => setTimeout(r, 700));
      return NextResponse.json(mockScore(unitName));
    }

    if (!audioFile) {
      return NextResponse.json({ error: "Thiếu file audio." }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const result = await assessWithSpeechSuper(audioBuffer, unitName);
    return NextResponse.json(result);

  } catch (err) {
    console.error("[score-pronunciation]", err);
    return NextResponse.json(
      { error: "Không thể chấm điểm. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
