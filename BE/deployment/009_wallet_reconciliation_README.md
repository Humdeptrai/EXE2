# Sửa thanh toán ví và đối soát payOS

1. Sao lưu DB. Chạy `009_wallet_reconciliation.sql` trong Neon SQL Editor của **đúng database BE Render đang dùng** (local Docker cũng cần chạy nếu còn constraint cũ). Script chạy lại được, không sửa số dư hay đánh dấu đơn đã trả tiền.
2. Deploy BE và FE cùng commit. Không cần deploy face-worker.
3. Trong kênh payOS, cấu hình webhook `https://handsfree-be.onrender.com/api/v1/payments/payos/webhook`.
4. Trên BE, PAYOS_RETURN_URL và PAYOS_CANCEL_URL đều là `https://handsfree-fe.vercel.app/wallet`; lưu env và deploy. Link thanh toán đã tạo trước khi đổi env vẫn có thể giữ URL cũ. Với đơn đã trả, vào ví production cùng tài khoản và bấm **Kiểm tra**, không chuyển thêm.
5. Chọn đơn pending đã chuyển tiền, bấm **Kiểm tra**. Khi payOS xác nhận PAID đủ số tiền và đúng link, BE cộng ví trong transaction, chống cộng trùng bằng khóa đơn/user, creditedAt và dedupe key TOPUP:<orderCode>.

BE tự đối soát CREATED/PENDING chưa cộng tiền: tối đa 10 đơn/lượt, delay 60 giây sau mỗi lượt, lần đầu sau 30 giây. Cursor quay vòng để đơn lỗi không chặn đơn sau. Thời gian thực tế phụ thuộc số đơn và thời gian phản hồi payOS; dịch vụ ngủ/dừng thì tác vụ không chạy. Scheduler riêng không chặn tác vụ hết hạn matching. Có thể đổi app.wallet-reconcile-delay-ms nếu cần.

Log `payOS HTTP failure`, `payOS rejected request`, `payOS request failed`, `Top-up reconciled` và `Top-up reconciliation failed` giúp truy vết theo mã đơn. Không ghi API key, chữ ký hoặc toàn bộ payload ngân hàng.

Lỗi connection_payments_*_payment_method_check là lỗi schema khi trả phí matching bằng WALLET, khác lỗi nạp tiền ngân hàng. Chỉ deploy code không thay thế bước chạy migration. Debit ví và lưu thanh toán matching cùng transaction, nên lỗi constraint làm rollback cả hai. Sau migration có thể thử lại với matching còn hạn.
