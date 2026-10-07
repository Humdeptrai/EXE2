import type { MatchUser } from "./matching";

export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED";
export type PaymentMethod = "WALLET" | "MOMO" | "ZALOPAY" | "BANK_TRANSFER";

export interface ConnectionPayment {
  id: string;
  matchId: string;
  jobId: string;
  jobTitle: string;
  scheduledDate: string;
  startTime: string;
  location: string;
  consumerFee: number;
  providerFee: number;
  platformFee: number;
  status: PaymentStatus;
  consumerPaymentStatus: PaymentStatus;
  providerPaymentStatus: PaymentStatus;
  consumerPaymentMethod: PaymentMethod | null;
  providerPaymentMethod: PaymentMethod | null;
  consumerPaidAt: string | null;
  providerPaidAt: string | null;
  currentUserIsConsumer: boolean;
  currentUserFee: number;
  currentUserPaymentStatus: PaymentStatus;
  currentUserPaymentMethod: PaymentMethod | null;
  currentUserPaidAt: string | null;
  counterpartPaid: boolean;
  connectionSucceeded: boolean;
  connectionSucceededAt: string | null;
  chatUnlocked: boolean;
  paidAt: string | null;
  counterpart: MatchUser;
}
