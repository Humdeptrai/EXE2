import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { FormIcon } from "../../../components/ui/FormIcon";
import { TextField } from "../../../components/ui/TextField";
import { useAuth } from "../../../context/AuthContext";
import { AuthDivider } from "../components/AuthDivider";
import { FormMessage } from "../components/FormMessage";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { getAuthError } from "../utils/authError";

type FormState = {
  fullName: string;
  identifier: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  fullName: "",
  identifier: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
};

const identifierPattern = /(^[^\s@]+@[^\s@]+\.[^\s@]+$)|(^0\d{9}$)/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Vui lòng nhập họ tên hợp lệ.";
  if (!identifierPattern.test(form.identifier.trim())) errors.identifier = "Nhập email hợp lệ hoặc số điện thoại Việt Nam gồm 10 số.";
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = "Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.";
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
  if (!form.termsAccepted) errors.termsAccepted = "Bạn cần đồng ý với Điều khoản & Chính sách.";
  return errors;
}

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      await register({
        fullName: form.fullName.trim(),
        identifier: form.identifier.trim(),
        password: form.password,
        termsAccepted: form.termsAccepted,
      });
      navigate("/home", { replace: true });
    } catch (error) {
      const payload = getAuthError(error, "Không thể đăng ký. Vui lòng thử lại.");
      if (payload.errors) setErrors((current) => ({ ...current, ...payload.errors }));
      setMessage({ kind: "error", text: payload.message || "Không thể đăng ký." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      await loginWithGoogle({ credential });
      navigate("/home", { replace: true });
    } catch (error) {
      setMessage({ kind: "error", text: getAuthError(error, "Không thể đăng nhập Google.").message || "Không thể đăng nhập Google." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="register">
        <header className="hf-auth-heading">
          <h1 className="text-[30px] font-extrabold tracking-[-1.1px] sm:text-[36px] sm:tracking-[-1.4px]">Đăng ký tài khoản</h1>
          <p className="mx-auto mt-3 max-w-[350px] text-base leading-7 text-[#4d5660] sm:text-[20px] sm:leading-8">Tham gia cộng đồng hỗ trợ ngay hôm nay</p>
        </header>

        <form className="hf-auth-form" onSubmit={handleSubmit} noValidate>
          <TextField id="fullName" label="Họ và tên" icon={<FormIcon name="user" />} placeholder="Nguyễn Văn A" autoComplete="name" value={form.fullName} error={errors.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
          <TextField id="identifier" label="Email hoặc Số điện thoại" icon={<FormIcon name="at" />} placeholder="example@gmail.com" autoComplete="username" value={form.identifier} error={errors.identifier} onChange={(event) => updateField("identifier", event.target.value)} />
          <TextField id="password" label="Mật khẩu" icon={<FormIcon name="lock" />} type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" value={form.password} error={errors.password} onChange={(event) => updateField("password", event.target.value)} trailing={<button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="ml-2 grid min-h-11 min-w-11 place-items-center text-[#7f8b91] sm:ml-3" onClick={() => setShowPassword((value) => !value)}><FormIcon name={showPassword ? "eye-off" : "eye"} /></button>} />
          <TextField id="confirmPassword" label="Xác nhận mật khẩu" icon={<FormIcon name="lock-clock" />} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" value={form.confirmPassword} error={errors.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} trailing={<button type="button" aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"} className="ml-2 grid min-h-11 min-w-11 place-items-center text-[#7f8b91] sm:ml-3" onClick={() => setShowConfirmPassword((value) => !value)}><FormIcon name={showConfirmPassword ? "eye-off" : "eye"} /></button>} />

          <div>
            <label className="flex items-start gap-3 px-1 pt-1 text-sm sm:gap-4 sm:text-[16px] font-semibold leading-6 text-[#48515c]">
              <input type="checkbox" checked={form.termsAccepted} onChange={(event) => updateField("termsAccepted", event.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 appearance-none rounded-[5px] border border-[#aebbc5] bg-white checked:border-[#007087] checked:bg-[#007087] checked:bg-[linear-gradient(135deg,transparent_44%,white_44%,white_53%,transparent_53%),linear-gradient(45deg,transparent_42%,white_42%,white_52%,transparent_52%)]" />
              <span>Tôi đồng ý với <a className="text-[#006b82] hover:underline" href="#terms">Điều khoản &amp; Chính sách</a></span>
            </label>
            {errors.termsAccepted && <p className="mt-2 pl-1 text-sm font-medium text-red-600">{errors.termsAccepted}</p>}
          </div>

          {message && <FormMessage {...message} />}

          <button type="submit" disabled={isSubmitting} className="hf-auth-submit">
            {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
            {!isSubmitting && <FormIcon name="arrow" className="h-7 w-7" />}
          </button>
        </form>

        <AuthDivider />
        <GoogleAuthButton onCredential={handleGoogle} onError={(text) => setMessage({ kind: "error", text })} disabled={isSubmitting} />

        <p className="hf-auth-switch">Bạn đã có tài khoản? <Link className="font-bold text-[#006b82] hover:underline" to="/login">Đăng nhập</Link></p>
    </AuthLayout>
  );
}
