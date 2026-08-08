import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { chatService } from "../../../services/chatService";
import { getApiErrorMessage } from "../../auth/utils/apiError";

export default function OpenMatchConversationPage() {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function open() {
      if (!matchId) {
        setError("Matching không hợp lệ.");
        return;
      }
      try {
        const conversation = await chatService.openMatchConversation(matchId);
        if (active) navigate(`/messages/${conversation.id}`, { replace: true });
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, "Không thể mở phòng trò chuyện."));
      }
    }
    void open();
    return () => { active = false; };
  }, [matchId, navigate]);

  if (error) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500"><AppIcon name="info" className="h-7 w-7" /></div>
        <h1 className="mt-4 text-xl font-black">Không thể mở chat</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
        <Link to="/messages" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white"><AppIcon name="arrow-left" className="h-4 w-4" /> Về Tin nhắn</Link>
      </section>
    );
  }

  return <div className="grid min-h-[50dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang mở phòng trò chuyện...</div>;
}
