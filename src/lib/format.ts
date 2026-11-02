const SHANGHAI = 'Asia/Shanghai';

export function formatAmount(n: string | number | bigint): string {
  const v = BigInt(n);
  return v.toLocaleString('zh-CN');
}

export function mistToSui(mist: string | number | bigint, digits = 4): string {
  const v = Number(BigInt(mist)) / 1e9;
  return v.toLocaleString('zh-CN', { maximumFractionDigits: digits });
}

export function formatShanghai(ms: string | number | bigint | null | undefined): string {
  if (ms === null || ms === undefined || ms === '' || ms === '0') return '—';
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d) + ' (Asia/Shanghai)';
}

export function shortAddr(a: string, n = 6): string {
  if (!a) return '';
  return `${a.slice(0, n)}…${a.slice(-4)}`;
}

export function isValidSuiAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(addr.trim());
}

export function progressPct(minted: bigint, supply: bigint): number {
  if (supply === 0n) return 0;
  const p = Number((minted * 10000n) / supply) / 100;
  return Math.min(100, Math.max(0, p));
}
