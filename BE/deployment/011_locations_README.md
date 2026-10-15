# Địa chỉ và bản đồ HandsFree

## Triển khai

1. Sao lưu database. Chạy `011_locations.sql` trên đúng database trước khi deploy BE. Migration thêm cột và bảng, không tự gán tọa độ cho dữ liệu cũ, không ghi đè địa chỉ đang có. Có thể chạy lại.
2. Thêm key BE và FE như bên dưới. Không cần thay đổi face-worker.
3. Deploy BE rồi FE. FE sẽ vẫn cho nhập tay / chọn địa chỉ đã lưu khi dịch vụ tìm kiếm hoặc bản đồ chưa cấu hình / hết quota.

### Local PostgreSQL Docker (PowerShell, chạy tại thư mục BE)

```powershell
docker start handsfree-postgres
docker exec handsfree-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/handsfree_before_locations.dump'
docker cp handsfree-postgres:/tmp/handsfree_before_locations.dump ./handsfree_before_locations.dump
docker cp ./deployment/011_locations.sql handsfree-postgres:/tmp/011_locations.sql
docker exec handsfree-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/011_locations.sql'
```

Không commit file dump. Trên Neon: mở SQL Editor của database BE đang dùng, dán toàn bộ `011_locations.sql`, Run. Sau đó mới restart BE IntelliJ / deploy Render.

## Lấy và cấu hình Geoapify

Đăng ký https://myprojects.geoapify.com/ → tạo project HandsFree → API Keys. Tạo hai key trong cùng project: một key cho BE gọi geocoding, một key bản đồ cho FE. Key FE là public, giới hạn HTTP referrer/origin theo domain FE; không dùng key BE làm key FE. Hai key cùng project vẫn dùng chung quota project, không phải hai hạn mức miễn phí riêng.

BE/.env hoặc Render `handsfree-be` → Environment:

```dotenv
GEOAPIFY_API_KEY=your_backend_key
GEOAPIFY_DAILY_REQUEST_LIMIT=1000
```

FE/.env.local hoặc Vercel project FE → Settings → Environment Variables:

```dotenv
VITE_GEOAPIFY_MAP_KEY=your_domain_restricted_map_key
```

Cho phép các domain thực sự dùng, ví dụ `https://handsfree-fe.vercel.app` và `http://localhost:5173` theo kiểu restriction Geoapify hỗ trợ; chỉ thêm preview domain nếu cần. Key BE không dùng restriction chỉ dành cho browser vì request được gửi từ Render. Không đưa key thật vào Git. Restart local sau khi sửa env; trên Vercel cần build/deploy mới để nhúng biến VITE.

Bản đồ raster: `https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=...`. API BE chỉ gọi endpoint cố định `https://api.geoapify.com/v1/geocode/autocomplete` và `/reverse`, không nhận URL từ client. Hiển thị attribution Geoapify/OpenStreetMap trên bản đồ.

Gói Free tại thời điểm triển khai: 3.000 credits/ngày, tối đa 5 requests/s. Một geocoding request = 1 credit; một map tile = 0,25 credit. Giới hạn BE mặc định 1.000 request/ngày UTC, 3 request/s, mỗi tài khoản cách nhau ít nhất 450ms, cache kết quả theo tài khoản 30 phút. Đây là bộ đếm bảo vệ trong tiến trình, reset khi restart và không đồng bộ giữa nhiều instance. Tile FE gọi trực tiếp vẫn dùng quota nhà cung cấp; kiểm tra usage ở Geoapify, không coi giới hạn BE là giới hạn cứng toàn project. Gói không cần thẻ thanh toán; không bật nâng cấp trả phí cho phase này.

## Nghiệp vụ và quyền riêng tư

- Bộ chọn chung: tìm địa chỉ (650ms sau khi ngừng gõ), vị trí hiện tại (chỉ xin quyền khi bấm), ghim kéo/thả/chạm, nhập tay, địa chỉ đã lưu.
- Người dùng xác nhận ghim và sửa số nhà/tầng/căn hộ trước khi dùng. Sai số thiết bị được hiển thị; không xem GPS hay kết quả tìm kiếm là xác minh nơi cư trú.
- Địa chỉ đã lưu tối đa 10, chỉ chủ tài khoản đọc/sửa/xóa; khóa user row để tránh vượt giới hạn/đặt nhiều mặc định đồng thời. Xóa địa chỉ không làm đổi bài đăng cũ. Địa chỉ mặc định hiện tại được giữ nếu chưa chọn một địa chỉ khác làm mặc định.
- Khu vực hoạt động lưu riêng với địa chỉ nhà riêng. Profile chỉ ghi tên khu vực; tọa độ tâm và bán kính chỉ trả qua API riêng của chủ tài khoản. Lưu cùng transaction với thông tin profile, đổi vị trí tìm kiếm không tự sửa profile.
- Bài đăng giữ snapshot địa chỉ cụ thể, khu vực, tọa độ. Khi đăng lại bài giữ snapshot. Không cho đổi tọa độ/khu vực để vượt khóa chỉnh sửa bài đã có matching.
- Feed/saved/interested/skipped/discovery chỉ trả tên khu vực, không trả lat/lon cụ thể của bài. Bài cũ chưa có khu vực hiện “Chưa cập nhật khu vực”; không suy đoán khu vực từ địa chỉ cụ thể.
- Trước khi trả đủ phí, matching/payment chỉ trả khu vực. API chi tiết kết nối kiểm tra cả participant và thanh toán đủ trước khi trả địa chỉ và tọa độ. Không mở ảnh bài đăng/CCCD ở trang chi tiết kết nối.
- Bán kính 1/3/5/10/20km và sắp xếp gần nhất thực hiện ở DB trước pagination. Khoảng cách là đường thẳng, công khai làm tròn theo bước 0,5km (dưới 0,5km hiện khoảng 0,5km). Không phải đường chạy xe.
- Bài chưa có tọa độ vẫn ở danh sách thường/tìm tên khu vực; không tham gia bán kính hoặc gần nhất. Không tự geocode hàng loạt bài cũ.
- Không tự lấy vị trí khi mở trang. Mặc định tìm việc dùng khu vực hoạt động đã lưu; người dùng có thể xóa bộ lọc.
- Bộ lọc radius dựa trên tọa độ để lọc đúng, khoảng cách hiển thị chỉ gần đúng. Đây không phải cơ chế chống suy luận vị trí từ nhiều truy vấn không gian.

## API

- GET/POST `/api/v1/locations/addresses`, PUT/DELETE `/api/v1/locations/addresses/{id}`.
- GET/PUT `/api/v1/locations/activity` (riêng tài khoản hiện tại).
- GET `/api/v1/locations/search?text=...&latitude=...&longitude=...`.
- GET `/api/v1/locations/reverse?latitude=...&longitude=...`.
- PATCH `/api/v1/users/me` nhận `activityLocation: {place:{address,area,latitude,longitude},radiusKm}` cùng các trường profile cũ; `location` phải trùng `place.area`. Chỉ trường area được ghi vào hồ sơ công khai.
- POST/PATCH job nhận `place:{address,area,latitude,longitude}`; `location` phải trùng `place.address`. null lat/lon cho nhập tay.
- GET `/api/v1/jobs/feed` thêm `latitude`, `longitude`, `radiusKm`, `sort=NEWEST|NEAREST`; các filter cũ giữ nguyên. Khi chỉ nhập tên khu vực, không yêu cầu tọa độ.

Chưa kiểm chứng độ phủ địa chỉ Việt Nam bằng key thật trong phiên triển khai vì chưa có key. Sau khi cấu hình cần thử địa chỉ chung cư/hẻm/phường mới trên thiết bị thật; không đảm bảo dịch vụ miễn phí luôn tìm đúng mọi địa chỉ. Không đổi nhà cung cấp và không tự tạo tài khoản ngoài thay bạn.
