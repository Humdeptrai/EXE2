import type { PageResponse } from "../types/job";

export const OPERATOR_PAGE_SIZES = [5, 10, 15, 30, 50, 100] as const;

/** Re-page a legacy server response without dropping records between pages.
 * A native server needs one request. During rolling deploys an older server can
 * still return batches of 20; fetch only the batches covering the requested range.
 */
export async function readOperatorPage<T>(
  fetchPage: (page: number, size: number) => Promise<PageResponse<T>>,
  page: number,
  size: number,
): Promise<PageResponse<T>> {
  if (!Number.isSafeInteger(page) || page < 0 || !OPERATOR_PAGE_SIZES.some(n => n === size))
    throw new Error("Thông số phân trang không hợp lệ.");
  const first = await fetchPage(page, size);
  const total = first.totalElements;
  const stride = first.size;
  if (!Array.isArray(first.content) || !Number.isSafeInteger(total) || total < 0
      || !Number.isSafeInteger(stride) || stride < 1 || !Number.isSafeInteger(first.page))
    throw new Error("Dữ liệu phân trang chưa hợp lệ. Vui lòng tải lại danh sách.");
  const offset = page * size;
  if (!Number.isSafeInteger(offset)) throw new Error("Số trang vượt giới hạn.");
  const totalPages = Math.ceil(total / size);
  const metadata = { page, size, totalElements: total, totalPages, first: page === 0, last: page + 1 >= totalPages };
  if (offset >= total) return { ...metadata, content: [] };
  if (stride === size && first.page === page) return { ...metadata, content: first.content.slice(0, size) };
  const from = Math.floor(offset / stride);
  const to = Math.floor((Math.min(offset + size, total) - 1) / stride);
  const batches = await Promise.all(Array.from({ length: to - from + 1 }, async (_, i) => {
    const index = from + i;
    const result = first.page === index ? first : await fetchPage(index, stride);
    if (result.page !== index || result.size !== stride || !Array.isArray(result.content))
      throw new Error("Danh sách vừa thay đổi. Vui lòng tải lại để tiếp tục phân trang.");
    return result.content;
  }));
  const localOffset = offset - from * stride;
  return { ...metadata, content: batches.flat().slice(localOffset, localOffset + size) };
}
