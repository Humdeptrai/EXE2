import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { AppIcon } from "../../../components/ui/AppIcon";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
  icon?: "bookmark" | "chat" | "bell" | "list";
}

export default function PlaceholderPage({ title, description, phase, icon = "list" }: PlaceholderPageProps) {
  return (
    <section className="hf-page hf-page-placeholder grid min-h-[50dvh] place-items-center py-3 sm:min-h-[55vh]">
      <div className="w-full max-w-lg rounded-3xl border border-dashed border-[#a9d2d9] bg-white p-5 text-center shadow-sm sm:p-8"><EmptyArtwork />
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f5f7] text-[#007f95] sm:h-16 sm:w-16 sm:rounded-3xl">
          <AppIcon name={icon} className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7a949a] sm:text-xs sm:tracking-[0.16em]">{phase}</p>
        <h1 className="mt-2 break-words text-xl font-extrabold sm:text-2xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">{description}</p>
      </div>
    </section>
  );
}
