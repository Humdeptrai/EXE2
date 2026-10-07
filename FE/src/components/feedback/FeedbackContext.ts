import { createContext, useContext } from "react";
import type { ConfirmOptions } from "./confirmation";

export interface FeedbackValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (message: string) => void;
}
export const FeedbackContext = createContext<FeedbackValue | null>(null);
export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error("useFeedback requires FeedbackProvider");
  return value;
}
