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

    // Cấu hình Pronunciation Assessment (Base64)
    const assessmentConfig = {
      ReferenceText:      unitName,
      GradingSystem:      "HundredMark",
      Dimension:          "Comprehensive",
      EnableMiscue:       false,
      ScenarioId:         "",
      EnableProsodyAssessment: false,
    };
    const assessmentBase64 = Buffer.from(JSON.stringify(assessmentConfig)).toString("base64");

    // Xác định Content-Type gửi lên Azure
    let contentType = "audio/webm;codecs=opus";
    if (mimeType.includes("mp4") || mimeType.includes("aac")) {
      contentType = "audio/mp4";
    } else if (mimeType.includes("ogg")) {
      contentType = "audio/ogg;codecs=opus";
    }

    const audioBuffer = await audio.arrayBuffer();

    // Gọi Azure Speech API
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

    // Lấy điểm từ kết quả Azure
    const pa          = result?.NBest?.[0]?.PronunciationAssessment;
    const pronScore   = pa?.PronScore        ?? pa?.AccuracyScore ?? 0;
    const accurScore  = pa?.AccuracyScore    ?? 0;
    const fluScore    = pa?.FluencyScore     ?? 0;
    const compScore   = pa?.CompletenessScore ?? 0;

    // Feedback theo điểm
    let feedback = "";
    if (pronScore >= 90)      feedback = "Xuất sắc! Phát âm rất chuẩn.";
    else if (pronScore >= 75) feedback = "Tốt! Tiếp tục luyện tập thêm.";
    else if (pronScore >= 65) feedback = "Đạt yêu cầu. Cần luyện thêm.";
    else                      feedback = "Chưa đạt. Hãy nghe mẫu và thử lại.";

    return NextResponse.json({
      score:    Math.round(pronScore),
      feedback,
      detail: {
        pronunciation:  Math.round(pronScore),
        accuracy:       Math.round(accurScore),
        fluency:        Math.round(fluScore),
        completeness:   Math.round(compScore),
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[score-pronunciation]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
