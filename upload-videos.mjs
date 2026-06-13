import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import * as readline from "readline";

const SUPABASE_URL = "https://arghgksrulxfyzxawmmq.supabase.co";
const VIDEO_DIR = "D:\\luyen_tieng_trung\\videos_tieng_trung";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste Service Role Key: ", async (serviceKey) => {
  rl.close();
  serviceKey = serviceKey.trim();

  const sb = createClient(SUPABASE_URL, serviceKey);
  const files = readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".mp4"));

  console.log(`\nBắt đầu upload ${files.length} file...\n`);

  for (const file of files) {
    const filePath = join(VIDEO_DIR, file);
    const buffer = readFileSync(filePath);

    const { error } = await sb.storage
      .from("videos")
      .upload(file, buffer, { contentType: "video/mp4", upsert: true });

    if (error) {
      console.log(`❌ ${file}: ${error.message}`);
    } else {
      console.log(`✅ ${file}`);
    }
  }

  console.log("\nHoàn tất!");
});
