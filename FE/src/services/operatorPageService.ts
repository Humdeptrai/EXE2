import axios from "axios";
import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { PageResponse } from "../types/job";
import { tokenService } from "./tokenService";
import { readOperatorPage } from "../utils/operatorPagination";

export function getOperatorPage<T>(url: string, params: { page: number; size: number; [key: string]: string | number }, signal?: AbortSignal) {
  const session = tokenService.getSessionId();
  return readOperatorPage<T>(async (page, size) => {
    const get = (batchSize: number) => {
      if (session !== tokenService.getSessionId()) throw new axios.CanceledError("Authentication session changed");
      return api.get<ApiResponse<PageResponse<T>>>(url, { params: { ...params, page, size: batchSize }, signal });
    };
    try { return (await get(size)).data.result; }
    catch (error) {
      // The immediately previous BE release supports at most 50. All normal
      // validation/authentication/network errors still propagate to the caller.
      if (size === 100 && axios.isAxiosError(error) && error.response?.status === 400)
        return (await get(50)).data.result;
      throw error;
    }
  }, params.page, params.size);
}
