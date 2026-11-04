# Quy Hoạch TP.HCM AI — GIS MVP

MVP website GIS **độc lập**, xem bản đồ nền, tìm theo tọa độ, chuyển giữa ba vùng đại diện (TP.HCM, Bình Dương cũ, Bà Rịa–Vũng Tàu cũ), nạp lớp quy hoạch GeoJSON được phép sử dụng, xem thuộc tính polygon, đo diện tích tham khảo, lưu điểm trên trình duyệt và in/lưu PDF bằng chức năng in của trình duyệt.

> ⚠ Không phải website chính thức. **KHÔNG** có dữ liệu quy hoạch/thửa địa chính chính thức đi kèm. Chưa hỗ trợ tra cứu số tờ/số thửa. Không dùng kết quả MVP để kết luận khả năng xây dựng, chuyển mục đích sử dụng đất, hay giao dịch.

## Chạy ngay (không cần npm)

Trong thư mục chứa `index.html`, mở terminal:

```bash
python -m http.server 8080
```

Mở `http://localhost:8080`. Cần Internet để tải MapLibre và các ô bản đồ OSM. Không mở bằng `file://`.

## Đưa lên GitHub Pages (miễn phí trong giới hạn GitHub)

1. Tạo repository mới, ví dụ `quy-hoach-tphcm-ai` (nên dùng **public** nếu định xuất bản GitHub Pages với gói miễn phí).
2. Upload toàn bộ nội dung thư mục này vào nhánh `main` của repository mới.
3. Vào **Settings → Pages → Build and deployment**, chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`, lưu lại.
4. Chờ GitHub Pages xuất bản, rồi mở URL mà GitHub cung cấp.

## Nhập dữ liệu GIS

- Chỉ dùng **GeoJSON FeatureCollection** gồm `Polygon` hoặc `MultiPolygon`, tọa độ **WGS84 EPSG:4326**, thứ tự `[kinh độ, vĩ độ]`.
- Mỗi lần nạp phải nhập **tên**, **URL nguồn**, **mô tả quyền sử dụng**. Form này là khai báo nguồn, **không tự động chứng thực** tính hợp pháp.
- Tối đa 12 MB, 20.000 đối tượng, 500.000 đỉnh cho thử nghiệm. Có thể đổi ngưỡng sau khi triển khai backend.
- GeoJSON được đọc **ngay trong trình duyệt**, không được gửi lên máy chủ. Điểm lưu dùng `localStorage`, không đồng bộ.
- Nếu bản đồ gốc là hệ VN-2000 hoặc một hệ tọa độ khác, cần chuyển đổi **đúng múi chiếu/tham số** trước khi nạp. Không tự đổi tên EPSG để giả vờ chuyển hệ.
- Nội dung popup là thuộc tính nguyên văn trong file, không có AI hay kiểm chứng quy hoạch.

## Nguyên tắc nguồn dữ liệu

- Nền đường phố: OpenStreetMap, ghi công và liên kết bản quyền ngay trên bản đồ. Dịch vụ `tile.openstreetmap.org` chỉ thích hợp truy cập tương tác vừa phải, **không** tải hàng loạt / offline / dùng vượt hạn mức. Với lượng truy cập lớn, sử dụng nhà cung cấp tile có điều khoản phù hợp hoặc tự host.
- Quy hoạch: chỉ nạp tài liệu GIS công khai có giấy phép phù hợp hoặc được chủ dữ liệu cấp quyền. Không scraping API GIS TP.HCM, không sao chép dữ liệu cấm tái sử dụng.
- File do người dùng nạp **chưa xác minh** và không mang giá trị chứng thực. Khi xây hệ thống production cần metadata về quyết định, ngày hiệu lực, phiên bản, CRS, đơn vị cung cấp và xác nhận nguồn.

## Phần đã hoạt động

- MapLibre GL JS 6.16.0 + bản đồ nền OSM
- 3 vùng xem nhanh trong phạm vi TP.HCM sau sáp nhập
- Nhập `vĩ độ, kinh độ`, click lấy tọa độ
- Nạp/ẩn/xóa/điều chỉnh độ đậm lớp polygon GeoJSON
- Click polygon để đọc metadata và các trường thuộc tính
- Đo diện tích xấp xỉ dạng đa giác, không thay thế đo địa chính
- Lưu/xóa tối đa 50 điểm bằng localStorage
- In trình duyệt hoặc dùng "Save as PDF"

## Chưa có trong MVP

Dữ liệu quy hoạch chính thức; tìm số tờ/số thửa; dịch vụ chuyển VN-2000; geocoder địa chỉ; AI phân tích; xác thực hồ sơ; lịch sử điều chỉnh quy hoạch; PostGIS/API; đồng bộ tài khoản. Các tính năng này phải phát triển sau khi có dữ liệu được cấp quyền và kiểm định.

## Roadmap production

1. **Data governance**: danh mục nguồn + bản quyền + quyết định pháp lý + ngày hiệu lực + chuẩn CRS.
2. **Backend**: Python/FastAPI + PostGIS, kiểm tra topology, spatial query, tile/vector data, phân quyền dataset.
3. **Tra cứu**: thửa đất có nguồn dữ liệu xác thực, tra cứu theo tờ/thửa, địa chỉ; ghi rõ mức tin cậy.
4. **AI**: RAG chỉ trả lời dựa trên dữ liệu và hồ sơ có căn cứ; trích dẫn quyết định, từ chối suy đoán khi không đủ dữ liệu.
5. **Vận hành**: kiểm thử, nhật ký thay đổi, versioning, quan trắc cập nhật, phản hồi người dùng.

## Giấy phép

Mã nguồn ví dụ do dự án phát triển: MIT (`LICENSE`). Không bao gồm quyền tái phân phối dữ liệu quy hoạch hoặc tiles của bên thứ ba.
