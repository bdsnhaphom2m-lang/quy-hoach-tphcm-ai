# Pipeline CAD → GIS — đồ án 1125/QĐ-TTg

Đã nhận file do chủ dự án cung cấp: `bdlogioi-p16x--1(1).dwg`, định dạng DWG AC1021 (AutoCAD 2007–2009), khoảng 3,2 MB. Chủ dự án xác nhận đây là bản chính thức, nhưng chưa giải mã được các CAD entities và **chưa kiểm tra tọa độ/đối chiếu với phụ lục đồ án**. Không công bố DWG hoặc giả định hệ tọa độ trên website công khai.

## Quy trình import bắt buộc

1. Dùng ODA File Converter / AutoCAD có giấy phép để chuyển DWG thành DXF (không dùng chuyển đổi web không rõ chính sách riêng tư).
2. Kiểm tra layer, khung tên, ranh giới, kiểu đối tượng, block, text, hatch, xref và metadata trong DXF. Bản vẽ "bđ lộ giới P16" có thể chỉ là một bản chuyên đề nhỏ, không đại diện cho toàn bộ đồ án 2040–2060.
3. Xác minh hệ tọa độ: VN-2000 cần đúng kinh tuyến trục, múi chiếu, tham số; nếu là tọa độ CAD cục bộ cần mốc khống chế. Dùng QGIS/GDAL **reproject** về EPSG:4326, không thay nhãn CRS.
4. Có thể chạy `python tools/dxf_to_geojson.py verified_wgs84.dxf data/private-preview.geojson --source-crs EPSG:4326`. Script sẽ từ chối tọa độ không hợp lệ; output chỉ là dữ liệu chưa kiểm định.
5. Kiểm tra địa vật với mốc bản đồ đáng tin và đối chiếu quyết định/phụ lục pháp lý, sai số, tên layer, legend; chỉ sau đó mới phát hành lớp tra cứu.

Không thể chuyển trực tiếp DWG trong runtime hiện tại: thiếu ứng dụng DWG decoder/ODA; ezdxf đọc DXF chứ không giải mã được DWG AC1021. Những thay đổi này không có nghĩa dữ liệu đã được tích hợp.

**Không lưu bản vẽ gốc hoặc dữ liệu CAD nhạy cảm lên GitHub public trước khi xác nhận quyền phân phối**; quyền sử dụng phục vụ dự án có thể không bao gồm quyền phát tán bản vẽ.
