import React, { useState, useEffect } from 'react';
import { transactionsAPI } from '../services/api';

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bg, color }}>
      {icon}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transactionsAPI.getSummary()
      .then((res) => setSummary(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-overlay">
      <span className="spinner" /> Loading dashboard...
    </div>
  );

  return (
    <div>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="📦" label="Total Transactions" value={fmt(summary?.total_transactions)} color="var(--accent)" bg="var(--accent-light)" />
        <StatCard icon="✅" label="Completed" value={fmt(summary?.completed)} color="var(--success)" bg="var(--success-light)" />
        <StatCard icon="⏳" label="Pending" value={fmt(summary?.pending)} color="var(--warning)" bg="var(--warning-light)" />
        <StatCard icon="❌" label="Failed" value={fmt(summary?.failed)} color="var(--danger)" bg="var(--danger-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">💴 Total JPY Sent</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--warning)' }}>
            ¥ {fmt(summary?.total_jpy_sent, 2)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Completed transactions only</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🇳🇵 Total NPR Converted</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--success)' }}>
            रु {fmt(summary?.total_npr_converted, 2)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>At 1 JPY = 0.92 NPR</div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <span className="card-title">💰 Total Service Fees Collected</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--info)' }}>
            रु {fmt(summary?.total_fees_collected, 2)}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { range: '0 – 100,000 NPR', fee: '500 NPR' },
              { range: '100,001 – 200,000 NPR', fee: '1,000 NPR' },
              { range: 'Above 200,000 NPR', fee: '3,000 NPR' },
            ].map((tier) => (
              <div key={tier.range} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Transfer Range</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tier.range}</div>
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>Fee: {tier.fee}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
