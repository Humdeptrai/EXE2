import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { ConnectionPayment, PaymentMethod } from "../types/payment";

export const paymentService = {
  async getConnectionPayment(matchId: string): Promise<ConnectionPayment> {
    const response = await api.get<ApiResponse<ConnectionPayment>>(`/matches/${matchId}/payment`);
    return response.data.result;
  },

  async payConnectionFee(matchId: string, paymentMethod: PaymentMethod): Promise<ConnectionPayment> {
    const response = await api.post<ApiResponse<ConnectionPayment>>(`/matches/${matchId}/payment/pay`, {
      paymentMethod,
    });
    return response.data.result;
  },
};
