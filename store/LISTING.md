# Chrome Web Store — hồ sơ đăng ZenTab 1.3.0

Gói tải lên: chạy `./scripts/package.sh` → `dist/zentab-1.3.0.zip`.

## Thông tin cửa hàng (Store listing)

**Tên:** ZenTab: Minimalist Focus

**Mô tả ngắn** (lấy từ `manifest.json`, tối đa 132 ký tự):
Transform your new tab into a sanctuary of focus and productivity.

**Danh mục:** Productivity (Năng suất) · **Ngôn ngữ:** Tiếng Việt

**Mô tả chi tiết:**

```
ZenTab biến tab mới thành một góc tĩnh lặng giúp bạn tập trung vào điều quan trọng nhất trong ngày.

☀ Ý ĐỊNH MỖI SÁNG
Mỗi tab mới hỏi bạn một câu: "Điều gì quan trọng nhất hôm nay?" — viết một dòng (có gợi ý sẵn), rồi bắt đầu phiên tập trung. Bên dưới là một hàng lối tắt gọn gàng tới các trang bạn hay mở.

⏱ TẬP TRUNG (POMODORO)
Chọn độ dài phiên, nghỉ ngắn, nghỉ dài, toàn màn hình, phím tắt, thống kê phút tập trung 7 ngày.

📓 NHẬT KÝ
Cuốn sổ lật trang thật, hai kiểu giấy, chấm tâm trạng, câu hỏi cuối ngày, tìm kiếm, #thẻ, xuất Markdown, in theo tháng và sao lưu. Câu nói của ngày hiện ngay trong sổ.

✅ NHIỆM VỤ, GHI CHÚ, THÓI QUEN, SƠ ĐỒ Ý TƯỞNG
Xoá nhầm? Bấm hoàn tác.

💬 LỜI NHẮN & LỜI HỎI THĂM
Câu nói đổi theo thời điểm trong ngày; giữ câu bạn thích, ẩn câu không hợp, tự thêm câu của riêng mình. Mỗi ngày một lời hỏi thăm nhẹ nhàng.

🌿 GÓC THƯ GIÃN
Hít thở, bóp bóng xốp, vườn cát thiền, thả đèn hoa đăng, xếp đá cân bằng — mở rộng toàn khung khi cần. Âm thanh nền mưa, sóng, gió rừng tạo ngay trong trình duyệt, cùng một bản nhạc nền ZenTab bật trong Cài đặt.

🪷 ẢNH NỀN
Ảnh nền vẽ tay: trăng, sương, ba cảnh hồ sen (Sen sớm, Sen chiều, Sen ngọc), hoặc ảnh của riêng bạn. Chữ tự đổi độ tương phản theo ảnh.

☯ LÁ SỐ TỬ VI & GIỜ HOÀNG ĐẠO
Bát Tự, lá số Tử Vi, đại hạn, giờ hoàng đạo, âm lịch. Tính ngay trên máy.

✨ AI MENTOR (TUỲ CHỌN)
Dùng khoá Gemini API của riêng bạn để nhận lời khuyên mỗi ngày dựa trên nhiệm vụ và lá số.

🔒 RIÊNG TƯ
Không máy chủ, không tài khoản, không quảng cáo, không theo dõi. Chỉ xin một quyền: storage.
```

**Ảnh chụp màn hình** (1280×800, thư mục `store/screenshots/`): trang chủ, bảng điều khiển, tập trung, nhật ký, Tử Vi. *Chụp từ 1.2.0 — nên chụp lại trang chủ (dock nổi, ảnh nền sen, hàng lối tắt) và thêm một ảnh Góc thư giãn.*

**Ảnh quảng cáo:** `store/promo-tile-440x280.png` (nhỏ, bắt buộc) và `store/promo-marquee-1400x560.png` (marquee, tuỳ chọn). Nguồn: `store/promo/promo.html`, xuất lại bằng `store/promo/render.js`.

## Quyền riêng tư (Privacy practices)

**Mục đích duy nhất (Single purpose):**
Thay trang tab mới bằng một không gian tập trung: ý định trong ngày, đồng hồ Pomodoro, nhiệm vụ, nhật ký và các tiện ích hỗ trợ tập trung.

**Lý do xin quyền `storage`:**
Lưu cài đặt, nhiệm vụ, nhật ký, ghi chú, thói quen và trạng thái giao diện của người dùng ngay trong Chrome (storage.sync để đồng bộ giữa các máy, storage.local cho dữ liệu lớn như nhật ký và ảnh nền).

**Host permissions:** không có.

**Mã từ xa (Remote code):** Không. Mọi JavaScript đều nằm trong gói; các yêu cầu mạng chỉ lấy dữ liệu JSON (Gemini API, Open-Meteo, ipapi.co).

**Dữ liệu được xử lý** — đánh dấu trong biểu mẫu:
- [x] Thông tin nhận dạng cá nhân — ngày giờ sinh, giới tính gửi tới Gemini API khi người dùng tự nhập khoá API.
- [x] Thông tin liên lạc cá nhân — nội dung người dùng nhập vào AI Mentor / Sơ đồ ý tưởng, gửi tới Gemini API.
- [x] Vị trí — địa chỉ IP gửi tới ipapi.co để đoán thành phố xem thời tiết; tên địa phương / toạ độ gần đúng gửi tới Open-Meteo.

Xác nhận cả ba cam kết: không bán dữ liệu cho bên thứ ba; không dùng hay chuyển dữ liệu cho mục đích không liên quan tới mục đích duy nhất; không dùng để đánh giá tín dụng hay cho vay.

**URL chính sách bảo mật:** https://tinhvolab.github.io/zentab/privacy.html (GitHub Pages, phục vụ từ thư mục `docs/` trên nhánh `main`).

## Ghi chú cho người duyệt (Test instructions)

```
Không cần tài khoản. Mở một tab mới để thấy ZenTab.
Tính năng AI là tuỳ chọn và dùng khoá Gemini API của chính người dùng (Cài đặt → AI Mentor); mọi tính năng khác hoạt động không cần khoá.
```
