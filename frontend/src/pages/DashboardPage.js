import React, { useState, useEffect } from 'react';
import { Package, CheckCircle2, Clock, XCircle, Coins, Receipt, Wallet } from 'lucide-react';
import { transactionsAPI, configAPI } from '../services/api';

const StatCard = ({ Icon, label, value, color, bg }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bg, color }}>
      <Icon strokeWidth={1.75} aria-hidden />
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const fmt = (n, decimals = 0) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [publicConfig, setPublicConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      transactionsAPI.getSummary().then((r) => r.data.data).catch(() => null),
      configAPI.getPublic().then((r) => r.data.data).catch(() => null),
    ])
      .then(([sum, cfg]) => {
        setSummary(sum);
        setPublicConfig(cfg);
      })
      .finally(() => setLoading(false));
  }, []);

  const forexRate = publicConfig?.forexRate ?? 0.92;
  const feeTiers = publicConfig?.feeTiers ?? [];

  if (loading) return (
    <div className="loading-overlay">
      <span className="spinner" /> Loading dashboard...
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard Icon={Package} label="Total Transactions" value={fmt(summary?.total_transactions)} color="var(--accent)" bg="var(--accent-light)" />
        <StatCard Icon={CheckCircle2} label="Completed" value={fmt(summary?.completed)} color="var(--success)" bg="var(--success-light)" />
        <StatCard Icon={Clock} label="Pending" value={fmt(summary?.pending)} color="var(--warning)" bg="var(--warning-light)" />
        <StatCard Icon={XCircle} label="Failed" value={fmt(summary?.failed)} color="var(--danger)" bg="var(--danger-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Coins size={18} strokeWidth={1.75} aria-hidden />
              Total JPY sent
            </span>
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: 'var(--warning)' }}>
            ¥ {fmt(summary?.total_jpy_sent, 2)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Completed transactions only</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} strokeWidth={1.75} aria-hidden />
              Total NPR converted
            </span>
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>
            रु {fmt(summary?.total_npr_converted, 2)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Spot rate: 1 JPY = {forexRate} NPR (configured on the server)
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={18} strokeWidth={1.75} aria-hidden />
              Service fee schedule
            </span>
          </div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--info)' }}>
            रु {fmt(summary?.total_fees_collected, 2)}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {feeTiers.map((tier) => (
              <div key={tier.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Converted amount (NPR)</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tier.label}</div>
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                  Fee: {fmt(tier.feeNPR)} NPR
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
