import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Inline SVG of the extension icon. Keep in visual sync with `icons/icon.svg`.
 */
const BrandMark: React.FC<BrandMarkProps> = ({ size = 32, className, title = 'Request Interceptor' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 128 128"
    width={size}
    height={size}
    className={className}
    role="img"
    aria-label={title}
  >
    <defs>
      <linearGradient id="brandmark-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#312e81" />
        <stop offset="1" stopColor="#1e1b4b" />
      </linearGradient>
      <linearGradient id="brandmark-stroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a5b4fc" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
      <radialGradient id="brandmark-pin" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#67e8f9" />
        <stop offset="1" stopColor="#06b6d4" />
      </radialGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#brandmark-bg)" />
    <rect x="0.5" y="0.5" width="127" height="127" rx="27.5" fill="none" stroke="#ffffff" strokeOpacity="0.06" />
    <g fill="none" stroke="url(#brandmark-stroke)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 80 H64" />
      <path d="M64 80 V36" />
      <path d="M52 48 L64 36 L76 48" />
    </g>
    <circle cx="22" cy="80" r="9" fill="url(#brandmark-stroke)" />
    <circle cx="22" cy="80" r="4" fill="#1e1b4b" />
    <circle cx="64" cy="80" r="14" fill="url(#brandmark-pin)" />
    <circle cx="64" cy="80" r="5" fill="#0e7490" />
  </svg>
);

export default BrandMark;
