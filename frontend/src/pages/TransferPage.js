import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { transactionsAPI, sendersAPI, receiversAPI } from '../services/api';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function TransferPage() {
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [form, setForm] = useState({ sender_id: '', receiver_id: '', send_amount_jpy: '', remarks: '' });
  const [calc, setCalc] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    sendersAPI.getAll({ limit: 200, is_active: true }).then((r) => setSenders(r.data.data)).catch(() => {});
    receiversAPI.getAll({ limit: 200, is_active: true }).then((r) => setReceivers(r.data.data)).catch(() => {});
  }, []);

  // Live fee calculation with debounce
  const calculateFee = useCallback(async (amount) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) { setCalc(null); return; }
    setCalcLoading(true);
    try {
      const res = await transactionsAPI.calculate(amount);
      setCalc(res.data.data);
    } catch { setCalc(null); }
    finally { setCalcLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => calculateFee(form.send_amount_jpy), 500);
    return () => clearTimeout(timer);
  }, [form.send_amount_jpy, calculateFee]);

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sender_id || !form.receiver_id || !form.send_amount_jpy) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await transactionsAPI.create({
        sender_id: parseInt(form.sender_id),
        receiver_id: parseInt(form.receiver_id),
        send_amount_jpy: parseFloat(form.send_amount_jpy),
        remarks: form.remarks,
      });
      setReceipt(res.data.data);
      toast.success('Transfer created and queued!');
      setForm({ sender_id: '', receiver_id: '', send_amount_jpy: '', remarks: '' });
      setCalc(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === parseInt(form.sender_id));
  const selectedReceiver = receivers.find((r) => r.id === parseInt(form.receiver_id));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
      {/* Form */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">💸 New Money Transfer</span>
          <span className="badge badge-info">JPY → NPR</span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Sender */}
          <div className="form-group">
            <label className="form-label">Sender (Japan) <span className="required">*</span></label>
            <select className="form-select" value={form.sender_id} onChange={f('sender_id')} required>
              <option value="">— Select Sender —</option>
              {senders.map((s) => <option key={s.id} value={s.id}>{s.full_name} {s.phone ? `· ${s.phone}` : ''}</option>)}
            </select>
            {selectedSender && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                🇯🇵 {selectedSender.country} · {selectedSender.email || 'No email'}
                {selectedSender.id_type && ` · ${selectedSender.id_type}: ${selectedSender.id_number}`}
              </div>
            )}
          </div>

          {/* Receiver */}
          <div className="form-group">
            <label className="form-label">Receiver (Nepal) <span className="required">*</span></label>
            <select className="form-select" value={form.receiver_id} onChange={f('receiver_id')} required>
              <option value="">— Select Receiver —</option>
              {receivers.map((r) => <option key={r.id} value={r.id}>{r.full_name} · {r.phone}</option>)}
            </select>
            {selectedReceiver && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                🇳🇵 {selectedReceiver.country}
                {selectedReceiver.bank_name && ` · ${selectedReceiver.bank_name}: ${selectedReceiver.bank_account}`}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Send Amount (JPY) <span className="required">*</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--warning)', fontFamily: 'DM Mono', fontSize: 16 }}>¥</span>
              <input
                type="number" min="0.01" step="any"
                className="form-input mono"
                style={{ paddingLeft: 28, fontSize: 20, fontWeight: 600 }}
                placeholder="0"
                value={form.send_amount_jpy}
                onChange={f('send_amount_jpy')}
                required
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-textarea" placeholder="Optional note for this transfer…" value={form.remarks} onChange={f('remarks')} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px 20px', fontSize: 15 }} disabled={submitting || !calc}>
            {submitting ? <><span className="spinner" /> Processing…</> : '🚀 Send Money'}
          </button>
        </form>
      </div>

      {/* Right Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Calculation Preview */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>💱 Transfer Breakdown</div>
          {calcLoading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <span className="spinner" /> Calculating…
            </div>
          ) : calc ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Send Amount', value: `¥ ${fmt(calc.sendAmountJPY)}`, color: 'var(--warning)' },
                { label: 'Forex Rate', value: `1 JPY = ${calc.forexRate} NPR`, color: 'var(--text-secondary)' },
                { label: 'Converted Amount', value: `रु ${fmt(calc.convertedAmountNPR)}`, color: 'var(--success)' },
                { label: 'Service Fee', value: `रु ${fmt(calc.serviceFeeNPR)}`, color: 'var(--danger)' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 500, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Total Receiver Gets</span>
                <span style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 18, color: 'var(--success)' }}>
                  रु {fmt(calc.totalAmountNPR)}
                </span>
              </div>
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--warning-light)', borderRadius: 6, fontSize: 12, color: 'var(--warning)' }}>
                ⚡ Fee tier: {calc.convertedAmountNPR <= 100000 ? '0–100K NPR → रु 500' : calc.convertedAmountNPR <= 200000 ? '100K–200K NPR → रु 1,000' : 'Above 200K NPR → रु 3,000'}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Enter an amount to see the breakdown
            </div>
          )}
        </div>

        {/* Fee Info */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>📋 Fee Schedule</div>
          {[
            { range: '0 – 100,000', fee: '500 NPR' },
            { range: '100,001 – 200,000', fee: '1,000 NPR' },
            { range: 'Above 200,000', fee: '3,000 NPR' },
          ].map((t) => (
            <div key={t.range} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>रु {t.range}</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>{t.fee}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>Exchange Rate: 1 JPY = 0.92 NPR</div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">✅ Transfer Successful</span>
              <button className="modal-close" onClick={() => setReceipt(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 14, color: 'var(--accent)', background: 'var(--accent-light)', padding: '6px 16px', borderRadius: 20, display: 'inline-block' }}>
                  {receipt.reference_no}
                </div>
              </div>
              {[
                { label: 'Status', value: <span className="badge badge-warning">Processing via Kafka</span> },
                { label: 'JPY Sent', value: `¥ ${fmt(receipt.send_amount_jpy)}` },
                { label: 'Converted', value: `रु ${fmt(receipt.converted_amount_npr)}` },
                { label: 'Service Fee', value: `रु ${fmt(receipt.service_fee_npr)}` },
                { label: 'Total (NPR)', value: `रु ${fmt(receipt.total_amount_npr)}` },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setReceipt(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
