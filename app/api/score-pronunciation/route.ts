import { NextRequest, NextResponse } from "next/server";

const AZURE_KEY    = process.env.AZURE_SPEECH_KEY ?? "";
const AZURE_REGION = "southeastasia";
const AZURE_URL    = `https://${AZURE_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN&format=detailed`;

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const audio    = form.get("audio") as File | null;
    const unitName = (form.get("unitName") as string | null) ?? "";
    const mimeType = (form.get("mimeType") as string | null) ?? "audio/webm";

    if (!audio || !unitName) {
      return NextResponse.json({ error: "Thiếu audio hoặc unitName." }, { status: 400 });
    }

    if (!AZURE_KEY) {
      return NextResponse.json({ error: "Chưa cấu hình AZURE_SPEECH_KEY." }, { status: 500 });
    }

    const unitType    = (form.get("unitType") as string | null) ?? "";
    const audioBuffer = await audio.arrayBuffer();

    // hanzi    = chữ Hán → Azure chấm chuẩn nhất, dùng trực tiếp
    // combined = pinyin đầy đủ (fallback khi không có Hán tự)
    // initial  = thanh mẫu đơn → ghép "a" để tạo âm tiết hợp lệ
    const referenceText = unitType === "initial" ? unitName + "a" : unitName;

    // Chọn Content-Type đúng theo định dạng thiết bị
    let contentType = "audio/webm; codecs=opus";
    if (mimeType.includes("wav")) {
      contentType = "audio/wav; codecs=audio/pcm; samplerate=16000";
    } else if (mimeType.includes("mp4") || mimeType.includes("aac")) {
      contentType = "audio/mp4";
    } else if (mimeType.includes("ogg")) {
      contentType = "audio/ogg; codecs=opus";
    }

    console.log("[score-pronunciation] gửi Azure:", JSON.stringify({
      contentType, referenceText, mimeType, audioBytes: audioBuffer.byteLength,
    }));

    // Cấu hình Pronunciation Assessment
    const assessmentBase64 = Buffer.from(JSON.stringify({
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Dimension:     "Comprehensive",
      EnableMiscue:  false,
    })).toString("base64");

    const azureRes = await fetch(AZURE_URL, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type":              contentType,
        "Pronunciation-Assessment":  assessmentBase64,
      },
      body: audioBuffer,
    });

    if (!azureRes.ok) {
      const errText = await azureRes.text();
      console.error("[score-pronunciation] Azure error:", azureRes.status, errText);
      return NextResponse.json(
        { error: `Azure Speech lỗi ${azureRes.status}: ${errText}` },
        { status: 500 }
      );
    }

    const result = await azureRes.json();
    console.log("[score-pronunciation] Azure result:", JSON.stringify(result));

    // Scores nằm thẳng trong NBest[0], KHÔNG phải NBest[0].PronunciationAssessment
    const nb         = result?.NBest?.[0];
    const accurScore = nb?.AccuracyScore     ?? 0;
    const fluScore   = nb?.FluencyScore      ?? 0;
    const compScore  = nb?.CompletenessScore ?? 0;
    const rawPron    = nb?.PronScore         ?? 0;

    // Với âm tiết đơn lẻ, Fluency & Completeness thường = 0 (không có câu để đo)
    // → dùng AccuracyScore làm điểm chính, đây mới phản ánh độ chuẩn phát âm.
    const score = Math.round(accurScore || rawPron);

    let feedback = "";
    if (score >= 90)      feedback = "Xuất sắc! Phát âm rất chuẩn.";
    else if (score >= 75) feedback = "Tốt! Tiếp tục luyện tập thêm.";
    else if (score >= 65) feedback = "Đạt yêu cầu. Cần luyện thêm.";
    else                  feedback = "Chưa đạt. Hãy nghe mẫu và thử lại.";

    return NextResponse.json({
      score,
      feedback,
      detail: {
        pronunciation: Math.round(accurScore),
        accuracy:      Math.round(accurScore),
        fluency:       Math.round(fluScore),
        completeness:  Math.round(compScore),
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[score-pronunciation]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
