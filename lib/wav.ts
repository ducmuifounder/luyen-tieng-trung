// Chuyển Blob âm thanh (webm/opus, mp4/aac...) → WAV PCM 16kHz mono 16-bit
// Azure Speech đọc WAV chuẩn nhất, tránh lỗi webm-from-MediaRecorder thiếu duration.

const TARGET_RATE = 16000;

export async function blobToWav16k(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  // decodeAudioData giải mã mọi định dạng trình duyệt hỗ trợ
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx      = new AudioCtx();
  const decoded  = await ctx.decodeAudioData(arrayBuffer);
  await ctx.close();

  // Trộn về mono
  const channels = decoded.numberOfChannels;
  const length   = decoded.length;
  const mono     = new Float32Array(length);
  for (let ch = 0; ch < channels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }

  // Resample tuyến tính về 16kHz
  const ratio       = decoded.sampleRate / TARGET_RATE;
  const outLength   = Math.floor(length / ratio);
  const resampled   = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const idx   = i * ratio;
    const i0    = Math.floor(idx);
    const i1    = Math.min(i0 + 1, length - 1);
    const frac  = idx - i0;
    resampled[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }

  return encodeWav(resampled, TARGET_RATE);
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view   = new DataView(buffer);

  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);          // subchunk1 size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Float32 → Int16 PCM
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}
