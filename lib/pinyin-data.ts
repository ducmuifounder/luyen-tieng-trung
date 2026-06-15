// ─── Danh sách thanh mẫu ────────────────────────────────────────────────────

export const INITIAL_GROUPS: { label: string; items: string[] }[] = [
  { label: "Âm môi",             items: ["b","p","m","f"] },
  { label: "Âm đầu lưỡi",        items: ["d","t","n","l"] },
  { label: "Âm gốc lưỡi",        items: ["g","k","h"] },
  { label: "Âm mặt lưỡi",        items: ["j","q","x"] },
  { label: "Âm cuộn lưỡi",       items: ["zh","ch","sh","r"] },
  { label: "Âm đầu lưỡi trước",  items: ["z","c","s"] },
];

// ─── Vận mẫu hợp lệ cho từng thanh mẫu ─────────────────────────────────────
// Tên vận mẫu theo quy ước DB: iu=iou, ui=uei, un=uen, v=ü, ve=üe, van=üan, vn=ün

export const VALID_FINALS_FOR_INITIAL: Record<string, string[]> = {
  b:  ["a","o","ai","ei","ao","an","en","ang","eng","i","ie","iao","in","ing","u"],
  p:  ["a","o","ai","ei","ao","ou","an","en","ang","eng","i","ie","iao","in","ing","u"],
  m:  ["a","o","e","ai","ei","ao","ou","an","en","ang","eng","i","ie","iao","iu","in","ing","u"],
  f:  ["a","o","ei","ou","an","en","ang","eng","u"],
  d:  ["a","e","ai","ei","ao","ou","an","en","ang","eng","i","ie","iao","iu","ian","in","ing","u","uan","un"],
  t:  ["a","e","ai","ei","ao","ou","an","ang","eng","i","ie","iao","in","ing","u","uan","un"],
  n:  ["a","e","ai","ei","ao","ou","an","en","ang","eng","i","ie","iao","iu","ian","in","iang","ing","u","uan","un","v","ve"],
  l:  ["a","e","ai","ei","ao","ou","an","en","ang","eng","i","ia","ie","iao","iu","ian","in","iang","ing","u","uan","un","v","ve","van","vn"],
  g:  ["a","e","ai","ei","ao","ou","an","en","ang","eng","u","ua","uo","uai","ui","uan","un","uang"],
  k:  ["a","e","ai","ei","ao","ou","an","en","ang","eng","u","ua","uo","uai","ui","uan","un","uang"],
  h:  ["a","e","ai","ei","ao","ou","an","en","ang","eng","u","ua","uo","uai","ui","uan","un","uang"],
  j:  ["i","ia","ie","iao","iu","ian","in","iang","ing","iong","v","ve","van","vn"],
  q:  ["i","ia","ie","iao","iu","ian","in","iang","ing","iong","v","ve","van","vn"],
  x:  ["i","ia","ie","iao","iu","ian","in","iang","ing","iong","v","ve","van","vn"],
  zh: ["a","e","ai","ei","ao","ou","an","en","ang","eng","i","u","ua","uo","uai","ui","uan","un","uang"],
  ch: ["a","e","ai","ao","ou","an","en","ang","eng","i","u","ua","uo","uai","ui","uan","un","uang"],
  sh: ["a","e","ai","ei","ao","ou","an","en","ang","eng","i","u","ua","uo","uai","ui","uan","un","uang"],
  r:  ["e","ao","ou","an","en","ang","eng","i","u","uo","ui","uan","un"],
  z:  ["a","e","ai","ei","ao","ou","an","en","ang","eng","i","u","uo","ui","uan","un"],
  c:  ["a","e","ai","ao","ou","an","en","ang","eng","i","u","uo","ui","uan","un"],
  s:  ["a","e","ai","ao","ou","an","en","ang","eng","i","u","uo","ui","uan","un"],
};

// Thứ tự hiển thị vận mẫu
export const ALL_FINALS = [
  "a","o","e",
  "ai","ei","ao","ou",
  "an","en","ang","eng",
  "i","ia","ie","iao","iu","ian","in","iang","ing","iong",
  "u","ua","uo","uai","ui","uan","un","uang",
  "v","ve","van","vn",
];

// ─── Hiển thị vận mẫu ───────────────────────────────────────────────────────

export function displayFinalName(f: string): string {
  const map: Record<string, string> = { v: "ü", ve: "üe", van: "üan", vn: "ün" };
  return map[f] ?? f;
}

// Tên file video cho vận mẫu (tên trong Supabase Storage)
export function finalVideoFile(f: string): string {
  const map: Record<string, string> = { iu: "iou", ui: "uei", un: "uen" };
  return map[f] ?? f;
}

// Tên file video cho thanh điệu
export function toneVideoFile(n: number): string {
  return `a${n}`;
}

// ─── Thanh điệu ─────────────────────────────────────────────────────────────

export const TONE_MARKS_DISPLAY: Record<number, string> = {
  0: "·", 1: "ˉ", 2: "ˊ", 3: "ˇ", 4: "ˋ",
};

export const TONE_NAMES: Record<number, string> = {
  0: "Thanh nhẹ", 1: "Thanh ngang", 2: "Thanh sắc", 3: "Thanh hỏi", 4: "Thanh nặng",
};

export const TONE_DB_TO_NUM: Record<string, number> = {
  "ā": 1, "á": 2, "ǎ": 3, "à": 4,
};

export const TONE_NUM_TO_DB: Record<number, string> = {
  1: "ā", 2: "á", 3: "ǎ", 4: "à",
};

// ─── Xây dựng pinyin hoàn chỉnh có dấu thanh ────────────────────────────────

const TONE_M: Record<string, string[]> = {
  a: ["ā","á","ǎ","à"],
  e: ["ē","é","ě","è"],
  i: ["ī","í","ǐ","ì"],
  o: ["ō","ó","ǒ","ò"],
  u: ["ū","ú","ǔ","ù"],
  ü: ["ǖ","ǘ","ǚ","ǜ"],
};

export function buildPinyin(initial: string, final: string, toneNum: number): string {
  const idx = toneNum - 1;

  // Chuyển đổi vận mẫu sang dạng hiển thị
  let f: string;
  if (["j","q","x"].includes(initial)) {
    // j/q/x + ü → viết là u (quy tắc pinyin chuẩn)
    f = final.replace(/^v$/, "u").replace(/^ve$/, "ue").replace(/^van$/, "uan").replace(/^vn$/, "un");
  } else {
    f = final.replace(/^v$/, "ü").replace(/^ve$/, "üe").replace(/^van$/, "üan").replace(/^vn$/, "ün");
  }

  // Thanh nhẹ (轻声) → không có dấu thanh
  if (toneNum === 0) return initial + f;

  // Quy tắc đặt dấu thanh:
  // 1. a hoặc e → đặt dấu ở đó
  // 2. ou → đặt dấu ở o
  // 3. iu (cuối) → đặt dấu ở u
  // 4. ui (cuối) → đặt dấu ở i
  // 5. còn lại → nguyên âm cuối cùng
  let toned: string;
  if (f.includes("a")) {
    toned = f.replace("a", TONE_M.a[idx]);
  } else if (f.includes("e")) {
    toned = f.replace("e", TONE_M.e[idx]);
  } else if (f === "ou") {
    toned = TONE_M.o[idx] + "u";
  } else if (f.endsWith("iu")) {
    toned = f.slice(0, -1) + TONE_M.u[idx];
  } else if (f.endsWith("ui")) {
    toned = f.slice(0, -1) + TONE_M.i[idx];
  } else if (f.includes("ü")) {
    toned = f.replace("ü", TONE_M["ü"][idx]);
  } else if (f.includes("o")) {
    toned = f.replace("o", TONE_M.o[idx]);
  } else if (f.includes("i")) {
    toned = f.replace("i", TONE_M.i[idx]);
  } else if (f.includes("u")) {
    toned = f.replace("u", TONE_M.u[idx]);
  } else {
    toned = f;
  }

  return initial + toned;
}
