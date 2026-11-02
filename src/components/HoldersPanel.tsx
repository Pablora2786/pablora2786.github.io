import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatAmount, formatShanghai, shortAddr } from '../lib/format';

export type HolderRow = {
  address: string;
  amount: string;
  objects: number;
  pct: number;
};

export type HoldersSnapshot = {
  tick: string;
  updatedAt: string;
  timezoneNote?: string;
  totalSupply: string;
  currentSupply: string;
  scannedObjects: number;
  holderCount: number;
  marketEscrow?: {
    note: string;
    amount: string;
    objects: number;
  };
  holders: HolderRow[];
  complete?: boolean;
  coverage?: unknown;
};

type Props = {
  tick: string;
};

const PAGE = 50;

export function HoldersPanel({ tick }: Props) {
  const [data, setData] = useState<HoldersSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!tick) return;
    setLoading(true);
    setErr(null);
    try {
      const url = `${import.meta.env.BASE_URL}holders/${tick.toUpperCase()}.json?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`暂无 ${tick} 持有者快照，请等待定时任务生成或稍后再试`);
        }
        throw new Error(`加载失败（HTTP ${res.status}）`);
      }
      const json = (await res.json()) as HoldersSnapshot;
      setData(json);
      setPage(0);
    } catch (e: any) {
      setData(null);
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [tick]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = useMemo(() => {
    const n = data?.holders.length || 0;
    return Math.max(1, Math.ceil(n / PAGE));
  }, [data]);

  const slice = useMemo(() => {
    if (!data) return [];
    const start = page * PAGE;
    return data.holders.slice(start, start + PAGE);
  }, [data, page]);

  async function copyAddr(addr: string) {
    try {
      await navigator.clipboard.writeText(addr);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2>持有者榜单 {tick ? `· ${tick}` : ''}</h2>
        <button className="btn ghost small" onClick={load} disabled={loading}>
          刷新
        </button>
      </div>

      {loading && <div className="card muted">加载持有者快照…</div>}
      {err && (
        <div className="card error-card">
          <p>{err}</p>
          <button className="btn small primary" onClick={load}>
            重试
          </button>
        </div>
      )}

      {!loading && !err && data && (
        <>
          <p className="hint">
            更新于 {formatShanghai(BigInt(Date.parse(data.updatedAt)))} · 共{' '}
            {data.holderCount.toLocaleString()} 个地址 · 扫描对象 {data.scannedObjects.toLocaleString()}
            {data.complete === false ? ' · 快照扫描未完成（双向分页合并中）' : ' · 完整快照'}
            {data.marketEscrow ? (
              <>
                {' '}
                · 市场托管/挂单对象已排除：{formatAmount(BigInt(data.marketEscrow.amount))}（
                {data.marketEscrow.objects} 个）
              </>
            ) : null}
          </p>

          <div className="table-wrap holders-table-wrap">
            <div className="scroll-hint">左右滑动查看更多 →</div>
            <table className="table holders-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>地址</th>
                  <th>持有量</th>
                  <th>占比</th>
                  <th>对象数</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((h, i) => {
                  const rank = page * PAGE + i + 1;
                  return (
                    <tr key={h.address}>
                      <td>{rank}</td>
                      <td className="mono">
                        <a
                          className="addr-link"
                          href={`https://suiscan.xyz/mainnet/account/${h.address}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortAddr(h.address, 8)}
                        </a>{' '}
                        <button
                          type="button"
                          className="btn small ghost"
                          onClick={() => copyAddr(h.address)}
                          title="复制地址"
                        >
                          复制
                        </button>
                      </td>
                      <td>{formatAmount(BigInt(h.amount))}</td>
                      <td>{h.pct.toFixed(2)}%</td>
                      <td>{h.objects}</td>
                    </tr>
                  );
                })}
                {slice.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      快照中暂无地址持有者
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="market-cards holders-cards">
            {slice.map((h, i) => {
              const rank = page * PAGE + i + 1;
              return (
                <div className="market-card" key={`hcard-${h.address}`}>
                  <div className="market-card-row">
                    <span className="pill-rank">#{rank}</span>
                    <a
                      className="addr-link mono"
                      href={`https://suiscan.xyz/mainnet/account/${h.address}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortAddr(h.address, 8)}
                    </a>
                  </div>
                  <div className="market-card-grid">
                    <div>
                      <div className="muted">持有量</div>
                      <div>{formatAmount(BigInt(h.amount))}</div>
                    </div>
                    <div>
                      <div className="muted">占比</div>
                      <div>{h.pct.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="muted">对象数</div>
                      <div>{h.objects}</div>
                    </div>
                  </div>
                  <button type="button" className="btn small ghost" onClick={() => copyAddr(h.address)}>
                    复制地址
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pager row gap wrap">
            <button className="btn small" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
              上一页
            </button>
            <span className="muted">
              {page + 1} / {pages}
            </span>
            <button
              className="btn small"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </section>
  );
}
