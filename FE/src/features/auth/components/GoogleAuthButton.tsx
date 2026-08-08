import { GoogleLogin } from "@react-oauth/google";
import { env } from "../../../config/env";

interface GoogleAuthButtonProps {
  onCredential: (credential: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function GoogleAuthButton({ onCredential, onError, disabled }: GoogleAuthButtonProps) {
  if (!env.GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        className="flex min-h-14 w-full items-center justify-center rounded-full border border-[#c5ced7] bg-white px-4 text-center text-sm font-bold leading-5 text-[#65717c] opacity-75 sm:min-h-[70px] sm:px-5 sm:text-[15px]"
        title="Thêm VITE_GOOGLE_CLIENT_ID vào file .env"
      >
        Google Login chưa được cấu hình trong .env
      </button>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <div className="google-button-shell flex min-h-14 w-full items-center justify-center overflow-hidden rounded-full border border-[#b7c3cd] bg-white px-2 sm:min-h-[70px] sm:px-4">
        <GoogleLogin
          onSuccess={(response) => {
            if (!response.credential) {
              onError("Google không trả về credential hợp lệ.");
              return;
            }
            void onCredential(response.credential);
          }}
          onError={() => onError("Không thể đăng nhập Google. Vui lòng thử lại.")}
          text="continue_with"
          shape="pill"
          size="large"
          theme="outline"
          width="420"
          useOneTap={false}
        />
      </div>
    </div>
  );
}
