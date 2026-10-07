import UserNotice from "../../../components/feedback/UserNotice";

interface FormMessageProps {
  kind: "success" | "error" | "info";
  text: string;
}

export function FormMessage({ kind, text }: FormMessageProps) {
  return <UserNotice message={text} tone={kind} />;
}
