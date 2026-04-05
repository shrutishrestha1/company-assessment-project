import React, { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoginBrandHeader } from '../components/BrandLogo';

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiresMinutes, setExpiresMinutes] = useState(5);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await authAPI.sendOTP(email.trim());
      const data = res.data.data;
      setExpiresMinutes(data.expiresMinutes);
      if (data.devOtp) {
        setOtp(data.devOtp);
        toast.success(`Local dev — OTP is ${data.devOtp} (pre-filled below)`);
      } else {
        toast.success(`Check ${email} for your verification code.`);
      }
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(email.trim(), otp.trim());
      const { token, user } = res.data.data;
      login(token, user);
      toast.success(`Welcome back, ${user.fullName}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <LoginBrandHeader titleStyle={styles.logoTitle} subStyle={styles.logoSub} />

        {step === 'email' ? (
          <form onSubmit={handleSendOTP}>
            <div style={styles.stepLabel}>
              <span style={styles.stepDot}>1</span> Enter your email address
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input
                type="email"
                className="form-input"
                placeholder="mail@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><span className="spinner" /> Sending OTP...</> : <><span>Send OTP</span> <ArrowRight size={18} strokeWidth={1.75} aria-hidden /></>}
            </button>
            <p style={styles.hint}>
              Enter the email where you want the code. We send a new one-time password each time (check spam). First visit creates your account automatically.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div style={styles.stepLabel}>
              <span style={styles.stepDot}>2</span> Enter the OTP sent to your email
            </div>
            <div style={styles.emailChip}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} strokeWidth={1.75} aria-hidden />
                {email}
              </span>
              <button type="button" style={styles.changeBtn} onClick={() => { setStep('email'); setOtp(''); }}>
                Change
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">One-Time Password <span className="required">*</span></label>
              <input
                type="text"
                className="form-input mono"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ letterSpacing: '8px', fontSize: '22px', textAlign: 'center' }}
                required
                autoFocus
              />
              <div className="form-error" style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                Expires in {expiresMinutes} minutes
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading || otp.length !== 6} style={{ width: '100%' }}>
              {loading ? <><span className="spinner" /> Verifying...</> : 'Verify & login'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={handleSendOTP}
              disabled={loading}
            >
              Resend OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
  },
  logoTitle: { fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' },
  logoSub: { fontSize: 13, color: 'var(--text-muted)', marginTop: 4 },
  stepLabel: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)',
    marginBottom: 20,
  },
  stepDot: {
    width: 24, height: 24,
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  emailChip: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 12px',
    fontSize: 13, color: 'var(--text-secondary)',
    marginBottom: 16,
  },
  changeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--accent)', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
  },
  hint: { fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 14 },
};
