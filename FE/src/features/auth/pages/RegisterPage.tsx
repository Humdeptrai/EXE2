import { onboardingUrl } from "../../../services/identityService";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { FormIcon } from "../../../components/ui/FormIcon";
import { TextField } from "../../../components/ui/TextField";
import { useAuth } from "../../../context/AuthContext";
import { AuthDivider } from "../components/AuthDivider";
import { FormMessage } from "../components/FormMessage";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { getAuthError } from "../utils/authError";
import TermsDialog from "../components/TermsDialog";

import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";

type RegistrationPolicy = { emailOtpRequired: boolean };

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

const identifierPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Vui lòng nhập họ tên hợp lệ.";
  if (!identifierPattern.test(form.identifier.trim())) errors.identifier = "Vui lòng nhập email hợp lệ.";
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
  const [showTerms, setShowTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const [policy, setPolicy] = useState<RegistrationPolicy | null>(null);
  const [policyError, setPolicyError] = useState("");
  const [policyRevision, setPolicyRevision] = useState(0);
  const [otp, setOtp] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const submitLock = useRef(false);
  const sendLock = useRef(false);
  const email = form.identifier.trim().toLowerCase();
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  useEffect(() => {
    const controller = new AbortController();
    void api.get<ApiResponse<RegistrationPolicy>>("/auth/register/policy", { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) { setPolicy(response.data.result); setPolicyError(""); }
    }).catch(e => { if (!controller.signal.aborted) setPolicyError(getAuthError(e, "Không tải được điều kiện đăng ký. Vui lòng thử lại.").message || "Không tải được cấu hình."); });
    return () => controller.abort();
  }, [policyRevision]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  async function sendOtp() {
    if (sendLock.current || submitLock.current || cooldown > 0) return;
    if (!identifierPattern.test(email) || email.length > 254) {
      setErrors(current => ({ ...current, identifier: "Vui lòng nhập email hợp lệ." })); return;
    }
    sendLock.current = true; setSendingOtp(true); setMessage(null);
    try {
      const response = await api.post<ApiResponse<{ resendAfterSeconds: number }>>("/auth/register/email-otp", { email });
      setSentEmail(email); setOtp(""); setRetryAt(Date.now() + response.data.result.resendAfterSeconds * 1000); setNow(Date.now());
      setMessage({ kind: "info", text: "Đã gửi OTP tới email. Mã có hiệu lực 10 phút; kiểm tra cả thư rác nếu chưa thấy." });
    } catch (error) {
      const payload = getAuthError(error, "Không gửi được OTP. Vui lòng thử lại.");
      if (payload.code === 40981) setPolicy({ emailOtpRequired: false });
      setMessage({ kind: "error", text: payload.message || "Không gửi được OTP." });
    } finally { sendLock.current = false; setSendingOtp(false); }
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "identifier") { setOtp(""); setSentEmail(""); setRetryAt(0); }
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current || sendLock.current || !policy) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitLock.current = true; setIsSubmitting(true);
    setMessage(null);
    try {
      const latest = await api.get<ApiResponse<RegistrationPolicy>>("/auth/register/policy");
      setPolicy(latest.data.result);
      if (latest.data.result.emailOtpRequired && (sentEmail !== email || !/^[0-9]{6}$/.test(otp))) {
        setMessage({ kind: "info", text: "Vui lòng bấm Gửi mã OTP và nhập mã 6 số gửi tới email trước khi đăng ký." });
        return;
      }
      await register({
        fullName: form.fullName.trim(),
        identifier: email,
        emailOtp: latest.data.result.emailOtpRequired ? otp : undefined,
        password: form.password,
        termsAccepted: form.termsAccepted,
      });
      navigate(onboardingUrl("/home"), { replace: true });
    } catch (error) {
      const payload = getAuthError(error, "Không thể đăng ký. Vui lòng thử lại.");
      if (payload.code === 40381) setPolicy({ emailOtpRequired: true });
      if (payload.errors) setErrors((current) => ({ ...current, ...payload.errors }));
      setMessage({ kind: "error", text: payload.message || "Không thể đăng ký." });
    } finally {
      submitLock.current = false; setIsSubmitting(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    if (submitLock.current || sendLock.current) return;
    submitLock.current = true; setIsSubmitting(true);
    setMessage(null);
    try {
      await loginWithGoogle({ credential });
      navigate(onboardingUrl("/home"), { replace: true });
    } catch (error) {
      setMessage({ kind: "error", text: getAuthError(error, "Không thể đăng nhập Google.").message || "Không thể đăng nhập Google." });
    } finally {
      submitLock.current = false; setIsSubmitting(false);
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
          <TextField id="identifier" label="Email" type="email" maxLength={254} icon={<FormIcon name="at" />} placeholder="example@gmail.com" autoComplete="email" disabled={sendingOtp || isSubmitting} value={form.identifier} error={errors.identifier} onChange={(event) => updateField("identifier", event.target.value)} />
          {policy?.emailOtpRequired && <div className="space-y-3">
            <p className="text-sm leading-6">Cần xác thực email bằng OTP để tạo tài khoản.</p>
            <button type="button" className="hf-auth-submit" disabled={sendingOtp || isSubmitting || cooldown > 0 || !email} onClick={() => void sendOtp()}>{sendingOtp ? "Đang gửi mã…" : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : sentEmail === email ? "Gửi lại OTP" : "Gửi mã OTP"}</button>
            <TextField id="emailOtp" label="Mã OTP email" icon={<FormIcon name="lock" />} placeholder="Nhập mã 6 số" autoComplete="one-time-code" inputMode="numeric" maxLength={6} disabled={sendingOtp || isSubmitting} value={otp} onChange={event => setOtp(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))} />
          </div>}
          <TextField id="password" label="Mật khẩu" icon={<FormIcon name="lock" />} type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" value={form.password} error={errors.password} onChange={(event) => updateField("password", event.target.value)} trailing={<button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="ml-2 grid min-h-11 min-w-11 place-items-center text-[#7f8b91] sm:ml-3" onClick={() => setShowPassword((value) => !value)}><FormIcon name={showPassword ? "eye-off" : "eye"} /></button>} />
          <TextField id="confirmPassword" label="Xác nhận mật khẩu" icon={<FormIcon name="lock-clock" />} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" value={form.confirmPassword} error={errors.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} trailing={<button type="button" aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"} className="ml-2 grid min-h-11 min-w-11 place-items-center text-[#7f8b91] sm:ml-3" onClick={() => setShowConfirmPassword((value) => !value)}><FormIcon name={showConfirmPassword ? "eye-off" : "eye"} /></button>} />

          <div>
            <label className="flex items-start gap-3 px-1 pt-1 text-sm sm:gap-4 sm:text-[16px] font-semibold leading-6 text-[#48515c]">
              <input type="checkbox" checked={form.termsAccepted} onChange={(event) => updateField("termsAccepted", event.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 appearance-none rounded-[5px] border border-[#aebbc5] bg-white checked:border-[#007087] checked:bg-[#007087] checked:bg-[linear-gradient(135deg,transparent_44%,white_44%,white_53%,transparent_53%),linear-gradient(45deg,transparent_42%,white_42%,white_52%,transparent_52%)]" />
              <span>Tôi đồng ý với <button type="button" className="text-[#006b82] hover:underline" onClick={(event) => { event.preventDefault(); setShowTerms(true); }}>Điều khoản &amp; Chính sách</button></span>
            </label>
            {errors.termsAccepted && <p role="alert" className="mt-2 pl-1 text-sm font-medium text-red-600">{errors.termsAccepted}</p>}
          </div>

          {policyError && <div><FormMessage kind="error" text={policyError} /><button type="button" className="font-bold underline" onClick={() => { setPolicyError(""); setPolicyRevision(value => value + 1); }}>Tải lại điều kiện đăng ký</button></div>}
          {!policy && !policyError && <p role="status">Đang tải điều kiện đăng ký…</p>}
          {message && <FormMessage {...message} />}

          <button type="submit" disabled={isSubmitting || sendingOtp || !policy} className="hf-auth-submit">
            {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
            {!isSubmitting && <FormIcon name="arrow" className="h-7 w-7" />}
          </button>
        </form>

        <AuthDivider />
        <GoogleAuthButton onCredential={handleGoogle} onError={(text) => setMessage({ kind: "error", text })} disabled={isSubmitting || sendingOtp} />

        <p className="hf-auth-switch">Bạn đã có tài khoản? <Link className="font-bold text-[#006b82] hover:underline" to="/login">Đăng nhập</Link></p>
        {showTerms && <TermsDialog onClose={() => setShowTerms(false)} />}
    </AuthLayout>
  );
}
