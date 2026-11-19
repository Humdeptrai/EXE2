import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { authService } from "../../../services/authService";
import { TextField } from "../../../components/ui/TextField";
import { FormIcon } from "../../../components/ui/FormIcon";
import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";

type Field = "currentPassword" | "newPassword" | "confirmPassword";
const labels: Record<Field, string> = {
  currentPassword: "Mật khẩu hiện tại", newPassword: "Mật khẩu mới", confirmPassword: "Xác nhận mật khẩu mới",
};

export default function ChangePasswordForm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<Field, string>>({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const nextErrors: Partial<Record<Field, string>> = {};
    if (!form.currentPassword) nextErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(form.newPassword) || new TextEncoder().encode(form.newPassword).length > 72)
      nextErrors.newPassword = "Mật khẩu cần 8–72 ký tự, gồm chữ và số; tối đa 72 byte.";
    else if (form.newPassword === form.currentPassword) nextErrors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại.";
    if (form.newPassword !== form.confirmPassword) nextErrors.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
    setErrors(nextErrors);
    setError("");
    if (Object.keys(nextErrors).length) return;
    submitting.current = true;
    setBusy(true);
    try {
      await authService.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      // logout clears local credentials synchronously, even if its server call fails.
      void logout().catch(() => undefined);
      navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch (e) {
      setError(getApiErrorMessage(e, "Chưa đổi được mật khẩu. Vui lòng thử lại."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="font-extrabold">Bảo mật tài khoản</h2>
    {user?.authProvider === "GOOGLE" ? <p className="mt-2 text-sm leading-6 text-slate-500">Bạn đang đăng nhập bằng Google. Hãy quản lý mật khẩu trong tài khoản Google của bạn.</p> : <>
      <p className="mt-2 text-sm leading-6 text-slate-500">Đổi mật khẩu sẽ yêu cầu đăng nhập lại trên các thiết bị.</p>
      {!open ? <button type="button" className="mt-3 min-h-11 rounded-xl border border-[#007f95] px-4 font-bold text-[#007f95]" onClick={() => setOpen(true)}>Đổi mật khẩu</button> :
        <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            {(Object.keys(labels) as Field[]).map(field => <TextField key={field} id={`change-${field}`} label={labels[field]} icon={<FormIcon name="lock" />}
              type={visible ? "text" : "password"} autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
              required maxLength={72} value={form[field]} error={errors[field]} onChange={e => {
                setForm(previous => ({ ...previous, [field]: e.target.value }));
                setErrors(previous => ({ ...previous, [field]: undefined })); setError("");
              }} />)}
            <p className="text-xs leading-5 text-slate-500">Mật khẩu mới cần 8–72 ký tự, gồm chữ và số; tối đa 72 byte.</p>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />Hiện mật khẩu</label>
            {error && <UserNotice error message={error} />}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="min-h-12 rounded-xl bg-[#007f95] px-4 font-bold text-white disabled:opacity-50">{busy ? "Đang đổi…" : "Lưu mật khẩu mới"}</button>
              <button type="button" className="min-h-12 rounded-xl border border-slate-300 px-4 font-bold" onClick={() => {
                setOpen(false); setVisible(false); setErrors({}); setError("");
                setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }}>Hủy</button>
            </div>
          </fieldset>
        </form>}
    </>}
  </section>;
}
