import { useAuth } from "../../../context/AuthContext";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { FormIcon } from "../../../components/ui/FormIcon";
import { TextField } from "../../../components/ui/TextField";
import UserNotice from "../../../components/feedback/UserNotice";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import { getApiErrorMessage } from "../utils/apiError";
export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
 const {logout}=useAuth();
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get("token")||"");
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function submit(e:FormEvent){e.preventDefault();if(busy||done)return;setError("");setMessage("");
  if(reset&&(!token||!password.match(/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/)||new TextEncoder().encode(password).length>72||password!==confirm)){setError(!token?"Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới.":password!==confirm?"Hai mật khẩu chưa khớp.":"Mật khẩu cần 8–72 ký tự, gồm chữ và số; tối đa 72 byte.");return;}
  if(!reset&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError("Vui lòng nhập email hợp lệ.");return;}
  setBusy(true);try{const r=await api.post<ApiResponse<null>>(`/auth/password/${reset?"reset":"forgot"}`,reset?{token,password}:{email:email.trim()});setMessage(r.data.message);if(reset){await logout().catch(()=>undefined);setDone(true);setPassword("");setConfirm("");window.history.replaceState(window.history.state,"",window.location.pathname);}}catch(e){setError(getApiErrorMessage(e,"Chưa thực hiện được yêu cầu."));}finally{setBusy(false);}
 }
 return <AuthLayout variant="login"><header className="hf-auth-heading"><h1 className="text-3xl font-extrabold">{reset?"Đặt lại mật khẩu":"Quên mật khẩu"}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{reset?"Liên kết chỉ dùng một lần, có hiệu lực 15 phút. Đổi thành công sẽ yêu cầu đăng nhập lại trên các thiết bị.":"Nhập email của tài khoản đăng nhập bằng mật khẩu. Tài khoản Google tiếp tục dùng Đăng nhập Google. Nếu chỉ đăng ký bằng số điện thoại, hãy liên hệ bộ phận hỗ trợ để kiểm tra danh tính."}</p></header><form onSubmit={submit} className="hf-auth-form space-y-4">{!done&&(reset?<><TextField icon={<FormIcon name="lock" />} id="new-password" label="Mật khẩu mới" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><TextField icon={<FormIcon name="lock" />} id="confirm-password" label="Nhập lại mật khẩu" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy}/></>:<TextField icon={<FormIcon name="at" />} id="recovery-email" label="Email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/>)}{error&&<UserNotice error message={error}/ >}{message&&<UserNotice message={message}/ >}{!done&&<button disabled={busy} className="min-h-12 w-full rounded-xl bg-[#007f95] px-5 font-bold text-white disabled:opacity-50">{busy?"Đang xử lý…":reset?"Lưu mật khẩu mới":"Gửi liên kết đặt lại"}</button>}<div className="flex flex-wrap justify-between gap-3 text-sm font-bold text-[#007f95]"><Link className="inline-flex min-h-11 items-center" to="/login">Về đăng nhập</Link>{reset&&<Link className="inline-flex min-h-11 items-center" to="/forgot-password">Yêu cầu liên kết mới</Link>}</div></form></AuthLayout>;
}
