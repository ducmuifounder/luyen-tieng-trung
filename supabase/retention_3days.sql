-- ============================================================
-- DỌN DỮ LIỆU LỊCH SỬ LUYỆN TẬP CŨ HƠN 3 NGÀY
-- Chạy trong Supabase SQL Editor (hoặc đặt lịch tự động bên dưới)
-- ============================================================

-- Lưu ý: trong dự án này lịch sử luyện tập nằm ở 2 bảng:
--   • practice_logs   (nhật ký từng lần đọc)
--   • daily_progress  (tổng hợp theo ngày)
-- Nếu bạn có bảng tên 'training_history' riêng, dùng đoạn (C) ở cuối.

-- (A) Xóa nhật ký cũ hơn 3 ngày
DELETE FROM practice_logs
WHERE practice_date < (CURRENT_DATE - INTERVAL '3 days');

-- (B) Xóa tổng hợp theo ngày cũ hơn 3 ngày
DELETE FROM daily_progress
WHERE practice_date < (CURRENT_DATE - INTERVAL '3 days');

-- ============================================================
-- (C) Nếu có bảng training_history (cột ngày tên 'created_at' hoặc 'practice_date')
-- Bỏ ghi chú để dùng:
-- DELETE FROM training_history
-- WHERE created_at < (NOW() - INTERVAL '3 days');
-- ============================================================

-- ============================================================
-- TỰ ĐỘNG DỌN HÀNG NGÀY bằng pg_cron (chạy 03:00 mỗi ngày)
-- Cần bật extension pg_cron trong Database > Extensions trước.
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'don-lich-su-3-ngay',
--   '0 3 * * *',
--   $$
--     DELETE FROM practice_logs  WHERE practice_date < (CURRENT_DATE - INTERVAL '3 days');
--     DELETE FROM daily_progress WHERE practice_date < (CURRENT_DATE - INTERVAL '3 days');
--   $$
-- );
