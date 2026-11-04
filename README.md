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

## Nâng cấp v0.2 (04/11/2026)

- Tìm địa danh/địa chỉ **khi nhấn Tìm** qua Nominatim (OpenStreetMap), không gợi ý tự động; tìm kiếm phụ thuộc kết nối Internet và chính sách dịch vụ công cộng. Không tra được số tờ/số thửa từ Nominatim. Kết quả chỉ là vị trí địa lý, không phải căn cứ quy hoạch.
- Nhấn Enter để tìm; chọn một kết quả để định vị và xem tọa độ.
- **Xuất GeoJSON** các điểm lưu cục bộ. **Chia sẻ điểm** qua URL có tham số vĩ độ/kinh độ; người nhận thấy vị trí nhưng không nhận dữ liệu người dùng đã nạp.
- Khi đo diện tích có thể **Lùi 1 đỉnh** trước khi hoàn tất.
- Trên điện thoại, dùng nút **☰ Công cụ GIS** để mở/đóng bảng điều khiển.

> Bảo mật và dữ liệu: Khi dùng tìm kiếm địa chỉ, nội dung truy vấn được gửi tới dịch vụ Nominatim bên thứ ba. Không tìm địa chỉ riêng tư nếu không muốn tiết lộ dữ liệu tìm kiếm. Chỉ dùng mức truy vấn thủ công vừa phải; khi nhiều người truy cập, cần dịch vụ geocoding được cấp phép riêng.

## Nâng cấp v0.5 (04/11/2026)
- Chọn bản đồ đường phố hoặc hiển thị đơn sắc (cùng một nguồn OpenStreetMap, không phải ảnh vệ tinh). Không yêu cầu WebGL.
- Công cụ đo diện tích hoặc đo chiều dài đường gấp khúc, với nút lùi đỉnh. Khoảng cách dùng Leaflet map.distance dựa trên WGS84; diện tích vẫn chỉ là ước tính.
- Thêm thước tỷ lệ bản đồ và chú giải lớp GIS do người dùng nạp.
- Tạm thời không nhúng ảnh vệ tinh từ Esri hoặc các bên khác khi chưa xác định quyền sử dụng phù hợp cho website công khai. Không tích hợp dữ liệu quy hoạch chính thức.
- Tuân thủ chính sách OSM tile: hiển thị ghi công, không tải hàng loạt/không offline; bản web demo chỉ dùng mức truy cập tương tác nhỏ.

## Phạm vi dữ liệu được khóa — v0.6 (04/11/2026)
- **CHỈ** đồ án Điều chỉnh quy hoạch chung Thành phố Hồ Chí Minh đến năm 2040, tầm nhìn 2060, Quyết định **1125/QĐ-TTg ngày 11/06/2025**.
- Phạm vi pháp lý được phê duyệt là TP.HCM trước sáp nhập (theo nội dung văn bản); không mở rộng giả định sang Bình Dương cũ và Bà Rịa – Vũng Tàu cũ, dù bản đồ nền vẫn cho phép xem toàn thành phố sau sáp nhập.
- Nguồn đối chiếu: https://chinhphu.vn/?docid=213900&pageid=27160 và https://qhkt.hochiminhcity.gov.vn/tai-lieu-hop/ban-ve-do-an-dieu-chinh-quy-hoach-chung-tphcm-den-nam-2040-tam-nhin-den-nam-2060-3623.html
- `data/sources.json` ghi danh mục nguồn, không phải dữ liệu tọa độ hay lớp quy hoạch. Công bố bản vẽ **không tự động cấp quyền tái sử dụng/đăng lại**.
- Chỉ cho phép nạp GeoJSON tự khai thuộc đồ án này, đánh dấu **chưa xác minh**; nguồn và quyền do người dùng khai báo không chứng minh tính pháp lý. Không tự tải lại dữ liệu từ cổng GIS nhà nước.
- Có truy vấn điểm trong Polygon/MultiPolygon của **file đã nạp**; không tìm thấy polygon không chứng minh địa điểm nằm ngoài quy hoạch. Không có dữ liệu thửa địa chính chính thức hoặc AI đưa ra kết luận pháp lý.
- Để xuất bản dữ liệu chính thức trên GitHub Pages cần xác minh bằng văn bản về nguồn, giấy phép tái sử dụng, quy chiếu đúng bản vẽ có hiệu lực, hệ tọa độ và chất lượng không gian.
