import axios from "axios";
import type { ApiErrorPayload } from "../../../types/api";
import { friendlyApiMessage, friendlyText } from "../../../utils/errorMessages";
import { reportUserError } from "../../../utils/userErrors";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isCancel(error)) return "";
  let message = friendlyText(fallback);
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) message = /wallet|payment|topup/i.test(error.config?.url || "")
      ? "Chưa nhận được kết quả giao dịch do mất kết nối. Nếu đã chuyển tiền, không chuyển lại; hãy kiểm tra đơn nạp hoặc liên hệ hỗ trợ."
      : error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
      ? "Kết nối mất quá nhiều thời gian. Vui lòng kiểm tra mạng và thử lại sau."
      : "Không kết nối được với hệ thống. Vui lòng kiểm tra mạng và thử lại sau.";
    else message = friendlyApiMessage(error.response.data, fallback, error.response.status, error.config?.url);
  }
  reportUserError(message, error);
  return message;
}
