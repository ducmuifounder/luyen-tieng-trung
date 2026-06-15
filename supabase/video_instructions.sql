-- ============================================================
-- BẢNG CHÚ THÍCH VIDEO HƯỚNG DẪN PHÁT ÂM
-- video_type: 'initial' (thanh mẫu) | 'final' (vận mẫu) | 'tone' (thanh điệu)
-- unit_key:  initial → chữ cái thanh mẫu (b, p, zh...)
--            final   → mã vận mẫu (a, ai, iao, van...)
--            tone    → số thanh điệu (1,2,3,4)
-- Chạy trong Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS video_instructions (
  id           SERIAL PRIMARY KEY,
  video_type   TEXT NOT NULL CHECK (video_type IN ('initial','final','tone')),
  unit_key     TEXT NOT NULL,
  instruction  TEXT NOT NULL,
  UNIQUE (video_type, unit_key)
);

CREATE INDEX IF NOT EXISTS idx_video_instr ON video_instructions (video_type, unit_key);

-- Chạy lại không bị trùng
DELETE FROM video_instructions;

-- ── THANH ĐIỆU (tone) ───────────────────────────────────────
INSERT INTO video_instructions (video_type, unit_key, instruction) VALUES
('tone','1','Thanh 1 (ngang): giữ cao và đều, kéo dài giọng, không lên không xuống.'),
('tone','2','Thanh 2 (sắc): giọng đi lên từ trung bình tới cao, như khi hỏi "hả?".'),
('tone','3','Thanh 3 (hỏi): giọng xuống thấp rồi vòng lên, giống dấu hỏi tiếng Việt.'),
('tone','4','Thanh 4 (nặng): giọng dằn mạnh từ cao xuống thấp dứt khoát.');

-- ── THANH MẪU (initial) ─────────────────────────────────────
INSERT INTO video_instructions (video_type, unit_key, instruction) VALUES
('initial','b','Khép hai môi rồi bật nhẹ, không bật hơi. Gần âm "p" tiếng Việt.'),
('initial','p','Khép hai môi rồi bật mạnh kèm luồng hơi rõ.'),
('initial','m','Khép hai môi, cho hơi thoát qua mũi, ngân nhẹ.'),
('initial','f','Răng trên chạm môi dưới, đẩy hơi ra như âm "ph".'),
('initial','d','Đầu lưỡi chạm lợi trên rồi bật nhẹ, không bật hơi.'),
('initial','t','Đầu lưỡi chạm lợi trên rồi bật mạnh kèm hơi.'),
('initial','n','Đầu lưỡi chạm lợi trên, cho hơi thoát qua mũi.'),
('initial','l','Đầu lưỡi chạm lợi trên, hơi thoát hai bên lưỡi.'),
('initial','g','Cuống lưỡi nâng chạm ngạc mềm rồi bật nhẹ, không bật hơi.'),
('initial','k','Cuống lưỡi nâng chạm ngạc mềm rồi bật mạnh kèm hơi.'),
('initial','h','Hơi cọ xát nhẹ ở cuống họng, như âm "h" nặng.'),
('initial','j','Mặt lưỡi áp ngạc cứng, môi dẹt, bật nhẹ, không bật hơi.'),
('initial','q','Giống "j" nhưng bật mạnh kèm luồng hơi rõ.'),
('initial','x','Mặt lưỡi gần ngạc cứng, môi dẹt, cọ xát nhẹ như "x".'),
('initial','zh','Cong đầu lưỡi chạm ngạc cứng rồi bật, không bật hơi.'),
('initial','ch','Giống "zh" nhưng bật mạnh kèm hơi.'),
('initial','sh','Cong đầu lưỡi gần ngạc cứng, cọ xát như "s" cong lưỡi.'),
('initial','r','Cong đầu lưỡi như "sh" nhưng rung nhẹ, có thanh.'),
('initial','z','Đầu lưỡi chạm sau răng trên rồi bật, không bật hơi.'),
('initial','c','Giống "z" nhưng bật mạnh kèm hơi.'),
('initial','s','Đầu lưỡi gần răng trên, cọ xát như "x" tiếng Việt.');

-- ── VẬN MẪU (final) — các vần thường gặp ────────────────────
INSERT INTO video_instructions (video_type, unit_key, instruction) VALUES
('final','a','Mở rộng miệng, phát âm "a" to và rõ.'),
('final','o','Tròn môi vừa, phát âm "ô" hơi mở.'),
('final','e','Miệng dẹt, lưỡi giữa, phát âm "ưa" ngắn.'),
('final','i','Môi dẹt căng, phát âm "i" dài.'),
('final','u','Tròn môi nhỏ, đẩy ra trước, phát âm "u".'),
('final','v','Tròn môi như "u" nhưng lưỡi ở vị trí "i" (ü).'),
('final','ai','Đi từ "a" lướt sang "i".'),
('final','ei','Đi từ "ê" lướt sang "i".'),
('final','ao','Đi từ "a" lướt sang "o".'),
('final','ou','Đi từ "ô" lướt sang "u".'),
('final','an','"a" rồi khép lưỡi tạo âm mũi "n".'),
('final','en','"ơ" ngắn rồi khép âm mũi "n".'),
('final','ang','"a" rồi nâng cuống lưỡi tạo âm mũi "ng".'),
('final','eng','"ơ" ngắn rồi tạo âm mũi "ng".'),
('final','ong','Tròn môi "ô" rồi tạo âm mũi "ng".'),
('final','ia','Lướt nhanh từ "i" sang "a".'),
('final','iao','Lướt từ "i" qua "a" tới "o".'),
('final','ie','Lướt từ "i" sang "ê".'),
('final','iu','Lướt từ "i" sang "ou" (iou).'),
('final','ian','Lướt "i" sang "an", âm mũi "n".'),
('final','in','"i" rồi khép âm mũi "n".'),
('final','iang','Lướt "i" sang "ang".'),
('final','ing','"i" rồi tạo âm mũi "ng".'),
('final','iong','Lướt "i" sang "ong".'),
('final','ua','Lướt từ "u" sang "a".'),
('final','uo','Lướt từ "u" sang "o".'),
('final','uai','Lướt "u" qua "a" tới "i".'),
('final','ui','Lướt từ "u" sang "ei" (uei).'),
('final','uan','Lướt "u" sang "an".'),
('final','un','Lướt "u" sang "en" (uen).'),
('final','uang','Lướt "u" sang "ang".'),
('final','ueng','Lướt "u" sang "eng".'),
('final','ve','Khẩu hình "ü" rồi lướt sang "ê" (üe).'),
('final','van','Khẩu hình "ü" rồi lướt sang "an" (üan).'),
('final','vn','Khẩu hình "ü" rồi khép âm mũi "n" (ün).'),
('final','er','Lưỡi cong nhẹ, phát âm "ơ" có độ cong (er).');
