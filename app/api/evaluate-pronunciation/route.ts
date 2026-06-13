import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tencentcloud = require("tencentcloud-sdk-nodejs-soe");
const SoeClient = tencentcloud.soe.v20180724.Client;

const SECRET_ID  = process.env.TENCENT_SECRET_ID  ?? "";
const SECRET_KEY = process.env.TENCENT_SECRET_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const audio    = form.get("audio") as File | null;
    const unitName = (form.get("unitName") as string | null) ?? "";

    if (!audio || !unitName) {
      return NextResponse.json({ error: "Thiếu audio hoặc unitName." }, { status: 400 });
    }

    if (!SECRET_ID || !SECRET_KEY) {
      return NextResponse.json({ error: "Chưa cấu hình TENCENT_SECRET_ID / TENCENT_SECRET_KEY." }, { status: 500 });
    }

    // Chuyển file sang Base64
    const arrayBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // Khởi tạo client Tencent SOE
    const client = new SoeClient({
      credential: { secretId: SECRET_ID, secretKey: SECRET_KEY },
      region: "ap-guangzhou",
      profile: {
        httpProfile: { endpoint: "soe.tencentcloudapi.com" },
      },
    });

    const result = await client.TransmitOralProcessWithInit({
      SeqId:      1,
      SessionId:  `ltc-${Date.now()}`,
      RefText:    unitName,
      WorkMode:   1,          // 1 = âm tiết/từ đơn lẻ
      EvalMode:   0,          // 0 = chấm từ đơn
      ScoreCoeff: 1.0,
      ServerType: 1,          // 1 = tiếng Trung phổ thông
      TextMode:   0,          // 0 = text thường
      UserVoiceData:   base64Audio,
      VoiceFileType:   audio.type.includes("mp4") ? 3 : 1, // 1=wav/webm, 3=mp4
      VoiceEncodeType: 1, // 1 = base64
      IsEnd:           1,
    });

    const pronScore  = result?.PronAccuracy  ?? result?.SuggestedScore ?? 0;
    const toneScore  = result?.PronFluency   ?? 0;

    // Lấy điểm chi tiết từ Words nếu có
    const words = result?.Words ?? [];
    let detailPron  = pronScore;
    let detailTone  = toneScore;

    if (words.length > 0) {
      detailPron = words[0]?.PronAccuracy ?? pronScore;
      detailTone = words[0]?.PronFluency  ?? toneScore;
    }

    // Feedback theo điểm
    let feedback = "";
    if (detailPron >= 90)      feedback = "Xuất sắc! Phát âm rất chuẩn.";
    else if (detailPron >= 75) feedback = "Tốt! Tiếp tục luyện tập thêm.";
    else if (detailPron >= 65) feedback = "Đạt yêu cầu. Cần luyện thêm.";
    else                       feedback = "Chưa đạt. Hãy nghe mẫu và thử lại.";

    return NextResponse.json({
      score:     Math.round(detailPron),
      toneScore: Math.round(detailTone),
      feedback,
      raw: result,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[evaluate-pronunciation]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
