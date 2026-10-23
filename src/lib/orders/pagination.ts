import { PAGE_SIZE } from "./params";

export function paginationInfo(total: number, page: number) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const outOfRange = page > totalPages;
  return {
    totalPages,
    from: total === 0 || outOfRange ? 0 : (page - 1) * PAGE_SIZE + 1,
    to: outOfRange ? 0 : Math.min(page * PAGE_SIZE, total),
    hasPrev: page > 1 && !outOfRange,
    hasNext: page < totalPages,
    outOfRange,
  };
}
