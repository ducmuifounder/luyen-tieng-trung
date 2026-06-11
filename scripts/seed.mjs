import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://arghgksrulxfyzxawmmq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZ2hna3NydWx4Znl6eGF3bW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODU0MjEsImV4cCI6MjA5Njc2MTQyMX0.Utu9NC_FoQsAmbrgrTKDntSAgjR0KUcQ_LVIVL8SaXU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const initials = [
  "b","p","t","j","q","x","z","c","s","zh","ch","k","h",
].map((name, i) => ({ name, type: "initial", display_order: i + 1 }));

const finals = [
  "ia","iao","ian","iang",
  "ie","iu","iong",
  "e","ei","en","eng","er",
  "ua","uai","uan","ueng","uo",
  "ü","üe","üan","ün",
].map((name, i) => ({ name, type: "final", display_order: i + 1 }));

const tones = [
  { name: "1", display_order: 1 },
  { name: "2", display_order: 2 },
  { name: "3", display_order: 3 },
  { name: "4", display_order: 4 },
  { name: "0", display_order: 5 },
].map((t) => ({ ...t, type: "tone" }));

const rows = [...initials, ...finals, ...tones];

const { data, error } = await supabase
  .from("pronunciation_units")
  .upsert(rows, { onConflict: "name,type" })
  .select("name, type");

if (error) {
  console.error("❌ Lỗi:", error.message);
  process.exit(1);
}

console.log(`✅ Đã nạp ${data.length} bản ghi:`);
const byType = { initial: [], final: [], tone: [] };
data.forEach((r) => byType[r.type].push(r.name));
console.log("  Thanh mẫu :", byType.initial.join(", "));
console.log("  Vận mẫu   :", byType.final.join(", "));
console.log("  Thanh điệu:", byType.tone.join(", "));
