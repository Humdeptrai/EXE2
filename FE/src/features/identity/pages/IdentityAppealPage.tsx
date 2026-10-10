import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { identityAppealService, type IdentityAppeal } from "../../../services/identityAppealService";
import IdentityAppealDetail from "../components/IdentityAppealDetail";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import "./FaceComparisonPage.css";
export default function IdentityAppealPage() {
  const { requestId } = useParams(); const [appeal, setAppeal] = useState<IdentityAppeal | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [refresh, setRefresh] = useState(0);
  useEffect(() => { const c = new AbortController(); setLoading(true); setError("");
    void identityAppealService.get(requestId || "", c.signal).then(a => { if (!c.signal.aborted) setAppeal(a); }).catch(e => { if (!c.signal.aborted) setError(getApiErrorMessage(e, "Không xem được yêu cầu xét duyệt.")); }).finally(() => { if (!c.signal.aborted) setLoading(false); }); return () => c.abort();
  }, [requestId, refresh]);
  return <main className="hf-face"><Link to="/face-comparison">← Xác minh tài khoản</Link><h1>Yêu cầu xét duyệt hồ sơ</h1><button disabled={loading} onClick={() => setRefresh(x => x + 1)}>Làm mới trạng thái</button>{error && <p className="hf-face-error" role="alert">{error}</p>}{loading && <p>Đang tải…</p>}{appeal && <div className="hf-face-result hf-match"><IdentityAppealDetail appeal={appeal} /></div>}</main>;
}
