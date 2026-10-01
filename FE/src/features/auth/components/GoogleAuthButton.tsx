import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { env } from "../../../config/env";

interface GoogleAuthButtonProps {
  onCredential: (credential: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function GoogleAuthButton({ onCredential, onError, disabled }: GoogleAuthButtonProps) {
  const shell = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(300);
  useEffect(() => {
    const element = shell.current;
    if (!element) return;
    const resize = () => setButtonWidth(Math.max(200, Math.min(400, Math.floor(element.clientWidth - 32))));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!env.GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        className="flex min-h-14 w-full items-center justify-center rounded-full border border-[#c5ced7] bg-white px-4 text-center text-sm font-bold leading-5 text-[#65717c] opacity-75 sm:min-h-[70px] sm:px-5 sm:text-[15px]"
        title="Đăng nhập Google hiện chưa khả dụng"
      >
        Đăng nhập Google hiện chưa khả dụng
      </button>
    );
  }

  return (
    <div inert={disabled} aria-disabled={disabled} className={disabled ? "pointer-events-none opacity-60" : ""}>
      <div ref={shell} className="google-button-shell flex min-h-14 w-full items-center justify-center overflow-hidden rounded-full border border-[#b7c3cd] bg-white px-2 sm:min-h-[70px] sm:px-4">
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
          width={String(buttonWidth)}
          useOneTap={false}
        />
      </div>
    </div>
  );
}
