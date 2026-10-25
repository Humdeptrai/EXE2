import { useEffect, useState } from "react";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import PrivateIdentityImage from "./PrivateIdentityImage";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export default function RelatedIdentityEvidence({userId}:{userId:string}) {
 const [data,setData]=useState<{accountName:string;status:string;fullName:string;documentNumber:string}|null>(null);const [error,setError]=useState("");
 useEffect(()=>{const c=new AbortController();void api.get<ApiResponse<NonNullable<typeof data>>>(`/admin/identity-registry/${userId}/evidence`,{signal:c.signal}).then(r=>{if(!c.signal.aborted)setData(r.data.result);}).catch(e=>{if(!c.signal.aborted)setError(getApiErrorMessage(e,"Không xem được bằng chứng liên quan."));});return()=>c.abort();},[userId]);
 return <section>{error?<p className="op-notice" role="alert">{error}</p>:data?<><p><strong>{data.accountName}</strong> · {data.status}</p><p>Họ tên CCCD: {data.fullName} · Số CCCD: {data.documentNumber}</p><p className="op-muted">Bằng chứng đã lưu trong hồ sơ chính, không phải bản cập nhật đang chờ duyệt.</p><div className="op-identity-images">{["face","selfie","front","back"].map(kind=><figure key={kind}><figcaption>{({face:"Ảnh quét mặt",selfie:"Selfie",front:"CCCD mặt trước",back:"CCCD mặt sau"})[kind]}</figcaption><PrivateIdentityImage path={`/admin/identity-registry/${userId}/images/${kind}`} alt={kind}/></figure>)}</div></>:<p role="status">Đang tải bằng chứng đã xác minh…</p>}</section>;
}
