import api from "../../config/axios";
import type { ApiResponse } from "../../types/api";
export interface Place { address: string; area: string; latitude: number | null; longitude: number | null }
export interface SavedAddress { id: string; label: string; place: Place; defaultAddress: boolean }
export interface Activity { place: Place; radiusKm: number | null }
export const locationService = {
  async addresses(signal?: AbortSignal) { return (await api.get<ApiResponse<SavedAddress[]>>("/locations/addresses", { signal })).data.result; },
  async saveAddress(data: Omit<SavedAddress, "id">, id?: string) { return (await api.request<ApiResponse<SavedAddress>>({ url: `/locations/addresses${id ? `/${id}` : ""}`, method: id ? "PUT" : "POST", data })).data.result; },
  async deleteAddress(id: string) { await api.delete(`/locations/addresses/${id}`); },
  async activity(signal?: AbortSignal) { return (await api.get<ApiResponse<Activity | null>>("/locations/activity", { signal })).data.result; },
  async search(text: string, point: Place, signal: AbortSignal) { return (await api.get<ApiResponse<Place[]>>("/locations/search", { params: { text, latitude: point.latitude ?? undefined, longitude: point.longitude ?? undefined }, signal })).data.result; },
  async reverse(latitude: number, longitude: number, signal: AbortSignal) { return (await api.get<ApiResponse<Place[]>>("/locations/reverse", { params: { latitude, longitude }, signal })).data.result; },
};
export const emptyPlace: Place = { address: "", area: "", latitude: null, longitude: null };
export const hasPoint = (place: Place | null | undefined) => place?.latitude != null && place?.longitude != null;
