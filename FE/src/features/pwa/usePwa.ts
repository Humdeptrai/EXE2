import { useSyncExternalStore } from "react";
import { getPwaState, subscribePwa } from "./pwaRuntime";
export function usePwa() { return useSyncExternalStore(subscribePwa, getPwaState); }
