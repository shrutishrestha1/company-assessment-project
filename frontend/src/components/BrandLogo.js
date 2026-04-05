import React from 'react';
import { APP_NAME, APP_TAGLINE } from '../constants/brand';

const ACCENT_SUFFIX = 'Remit';

export function BrandMark({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="40" height="40" rx="10" fill="var(--accent-light)" />
      <path
        d="M10 28 L18 12 L22 18 L30 10 L30 28 Z"
        fill="var(--accent)"
        opacity={0.92}
      />
    </svg>
  );
}

export function BrandWordmark({ className }) {
  const base =
    APP_NAME.endsWith(ACCENT_SUFFIX) ? APP_NAME.slice(0, -ACCENT_SUFFIX.length) : `${APP_NAME} `;
  const accent = APP_NAME.endsWith(ACCENT_SUFFIX) ? ACCENT_SUFFIX : '';
  return (
    <h1 className={className || 'sidebar-logo-title'}>
      {base}
      {accent ? <span className="brand-accent">{accent}</span> : null}
    </h1>
  );
}

export function LoginBrandHeader({ titleStyle, subStyle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <BrandMark size={44} />
      </div>
      <h1 style={titleStyle}>
        {APP_NAME.endsWith(ACCENT_SUFFIX) ? (
          <>
            {APP_NAME.slice(0, -ACCENT_SUFFIX.length)}
            <span style={{ color: 'var(--accent)' }}>{ACCENT_SUFFIX}</span>
          </>
        ) : (
          APP_NAME
        )}
      </h1>
      <p style={subStyle}>{APP_TAGLINE}</p>
    </div>
  );
}
