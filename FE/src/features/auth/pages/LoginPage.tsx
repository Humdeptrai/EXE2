import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { FormIcon } from "../../../components/ui/FormIcon";
import { TextField } from "../../../components/ui/TextField";
import { useAuth } from "../../../context/AuthContext";
import { AuthDivider } from "../components/AuthDivider";
import { FormMessage } from "../components/FormMessage";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { getAuthError } from "../utils/authError";

type LoginForm = { identifier: string; password: string };
type LoginErrors = Partial<Record<keyof LoginForm, string>>;

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<LoginForm>({ identifier: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const destination = (location.state as { from?: string } | null)?.from || "/home";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: LoginErrors = {};
    if (!form.identifier.trim()) nextErrors.identifier = "Vui lòng nhập email hoặc số điện thoại.";
    if (!form.password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      await login({ identifier: form.identifier.trim(), password: form.password });
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage({ kind: "error", text: getAuthError(error, "Không thể đăng nhập. Vui lòng thử lại.").message || "Không thể đăng nhập." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      await loginWithGoogle({ credential });
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage({ kind: "error", text: getAuthError(error, "Không thể đăng nhập Google.").message || "Không thể đăng nhập Google." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="login">
        <header className="hf-auth-heading">
          <h1 className="text-[32px] font-extrabold tracking-[-1.2px] sm:text-[38px] sm:tracking-[-1.5px]">Đăng nhập</h1>
          <p className="mt-2 text-base leading-7 text-[#4d5660] sm:text-[20px] sm:leading-8">Chào mừng bạn quay lại với Hands-free</p>
        </header>

        <form className="hf-auth-form" onSubmit={handleSubmit} noValidate>
          <TextField
            id="identifier"
            label="Email hoặc Số điện thoại"
            icon={<FormIcon name="at" />}
            placeholder="yourname@email.com"
            autoComplete="username"
            value={form.identifier}
            error={errors.identifier}
            onChange={(event) => {
              setForm((current) => ({ ...current, identifier: event.target.value }));
              setErrors((current) => ({ ...current, identifier: undefined }));
              setMessage(null);
            }}
          />
          <TextField
            id="password"
            label="Mật khẩu"
            icon={<FormIcon name="lock" />}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            value={form.password}
            error={errors.password}
            onChange={(event) => {
              setForm((current) => ({ ...current, password: event.target.value }));
              setErrors((current) => ({ ...current, password: undefined }));
              setMessage(null);
            }}
            trailing={(
              <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="ml-2 grid min-h-11 min-w-11 place-items-center text-[#65717c] sm:ml-3" onClick={() => setShowPassword((value) => !value)}>
                <FormIcon name={showPassword ? "eye-off" : "eye"} />
              </button>
            )}
          />

          <div className="flex justify-end">
            <button type="button" className="font-bold text-[#006b82] hover:underline" onClick={() => setMessage({ kind: "info", text: "Khôi phục mật khẩu sẽ được bổ sung sau luồng MVP chính." })}>Quên mật khẩu?</button>
          </div>

          {message && <FormMessage {...message} />}

          <button type="submit" disabled={isSubmitting} className="hf-auth-submit">
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            {!isSubmitting && <FormIcon name="arrow" className="h-7 w-7" />}
          </button>
        </form>

        <AuthDivider />
        <GoogleAuthButton onCredential={handleGoogle} onError={(text) => setMessage({ kind: "error", text })} disabled={isSubmitting} />

        <p className="hf-auth-switch">Bạn chưa có tài khoản? <Link className="font-bold text-[#006b82] hover:underline" to="/register">Đăng ký ngay</Link></p>
    </AuthLayout>
  );
}
