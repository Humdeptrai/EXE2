import { useEffect, useState } from "react";
import RelatedIdentityEvidence from "./RelatedIdentityEvidence";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export type IdentityClaimVersion = { documentOwner: string | null; claimVersion: number | null };
type Assessment = IdentityClaimVersion & { allowed: boolean; message: string; conflicts: { userId: string; kind: string; similarity: number | null }[] };
export default function IdentityConflictCheck({ userId, transfer, onTransfer, onClaim }: { userId: string; transfer?: boolean; onTransfer?: (value: boolean) => void; onClaim?:(value:IdentityClaimVersion|null)=>void }) {
 const [opened,setOpened]=useState<Record<string,boolean>>({});
 const [data,setData]=useState<Assessment|null>(null);const [error,setError]=useState("");
 useEffect(()=>{const c=new AbortController();setData(null);setError("");onTransfer?.(false);onClaim?.(null);void api.get<ApiResponse<Assessment>>(`/admin/identity-registry/${userId}`,{signal:c.signal}).then(r=>{if(!c.signal.aborted){setData(r.data.result);onClaim?.(r.data.result);}}).catch(e=>{if(!c.signal.aborted)setError(getApiErrorMessage(e,"Chưa kiểm tra được trùng danh tính."));});return()=>c.abort();},[userId]);
 return <section className="op-card" style={{padding:16,marginBlock:16}}><h3>Kiểm tra trùng danh tính</h3>{error?<p className="op-notice" role="alert">{error}</p>:!data?<p role="status">Đang đối chiếu…</p>:<><p>{data.allowed?"Chưa phát hiện xung đột trong chỉ mục hiện tại.":data.message}</p>{data.conflicts.map((c,i)=><details key={`${c.userId}-${i}`} onToggle={e=>{if(e.currentTarget.open)setOpened(v=>({...v,[c.userId]:true}));}}><summary style={{paddingBlock:12,cursor:"pointer"}}>{c.kind==="DOCUMENT"?"Trùng số CCCD":c.kind==="IMAGE"?"Trùng ảnh giấy tờ":c.kind==="IDENTITY_CHANGE"?"Khuôn mặt thay đổi so với hồ sơ cũ":"Nghi trùng khuôn mặt"}{c.similarity!=null?` · Điểm ${c.similarity.toFixed(3)}`:""} · Xem bằng chứng liên quan</summary>{opened[c.userId]&&<RelatedIdentityEvidence userId={c.userId}/>}</details>)}{onTransfer&&data.conflicts.some(c=>c.kind==="DOCUMENT")&&<label style={{display:"flex",gap:10,alignItems:"start",marginTop:16}}><input type="checkbox" checked={transfer} onChange={e=>onTransfer(e.target.checked)} /><span>Tôi đã đối chiếu hồ sơ liên quan, xác định người yêu cầu là chủ giấy tờ và đồng ý thu hồi quyền định danh của tài khoản cũ. Không chuyển tiền, ví hoặc lịch sử matching.</span></label>}</>}</section>;
}
