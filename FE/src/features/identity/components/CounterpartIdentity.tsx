import type { MatchUser } from "../../../types/matching";
import PrivateIdentityImage from "./PrivateIdentityImage";
export default function CounterpartIdentity({ person }: { person: MatchUser }) {
  return <div className="my-3 flex flex-wrap gap-5 rounded-2xl border border-slate-200 bg-white p-3">
    <figure><figcaption className="mb-2 text-xs font-bold text-slate-500">Ảnh đại diện</figcaption>{person.avatarUrl ? <img src={person.avatarUrl} alt={`Avatar ${person.fullName}`} className="h-28 w-24 rounded-xl object-cover" /> : <div className="grid h-28 w-24 place-items-center rounded-xl bg-slate-100 text-2xl">{person.fullName.charAt(0)}</div>}</figure>
    <figure><figcaption className="mb-2 text-xs font-bold text-[#007f95]">Selfie đã xác minh</figcaption>{person.verifiedFaceUrl ? <PrivateIdentityImage key={person.verifiedFaceUrl} path={person.verifiedFaceUrl} alt={`Selfie đã xác minh của ${person.fullName}`} /> : <p className="max-w-40 text-xs text-slate-500">Đối tác chưa bổ sung selfie theo quy trình mới.</p>}</figure>
  </div>;
}
