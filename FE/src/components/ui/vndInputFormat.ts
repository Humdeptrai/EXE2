export function formatVndInput(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseVndInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}

