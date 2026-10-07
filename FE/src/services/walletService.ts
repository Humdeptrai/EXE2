import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { PageResponse } from "../types/job";
export interface WalletSummary {
  balance: number;
  minTopUp: number;
  maxTopUp: number;
  topUpEnabled: boolean;
}
export interface WalletEntry {
  id: string;
  ownerId: string;
  amount: number;
  balanceAfter: number;
  kind: string;
  description: string;
  occurredAt: string;
}
export interface TopUp {
  orderCode: number;
  ownerId: string;
  amount: number;
  status: string;
  checkoutUrl?: string;
  createdAt: string;
  creditedAt?: string;
}
export const walletService = {
  async summary() {
    return (await api.get<ApiResponse<WalletSummary>>("/wallet")).data.result;
  },
  async entries(page = 0) {
    return (
      await api.get<ApiResponse<PageResponse<WalletEntry>>>("/wallet/entries", {
        params: { page },
      })
    ).data.result;
  },
  async orders(page = 0) {
    return (
      await api.get<ApiResponse<PageResponse<TopUp>>>("/wallet/topups", {
        params: { page },
      })
    ).data.result;
  },
  async create(amount: number, requestId: string) {
    return (
      await api.post<ApiResponse<TopUp>>("/wallet/topups", {
        amount,
        requestId,
      })
    ).data.result;
  },
  async refresh(code: number) {
    return (
      await api.post<ApiResponse<TopUp>>(`/wallet/topups/${code}/refresh`)
    ).data.result;
  },
};
