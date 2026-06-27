// src/components/BotanicalDivider.js
import React from 'react';

export default function BotanicalDivider({ style }) {
  return (
    <svg
      viewBox="0 0 320 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto', ...style }}
    >
      {/* Left stem */}
      <path d="M20 16 Q60 10 100 16" stroke="#C4879A" strokeWidth="0.75" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Right stem */}
      <path d="M220 16 Q260 10 300 16" stroke="#C4879A" strokeWidth="0.75" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Left small leaves */}
      <ellipse cx="45" cy="11" rx="6" ry="3" fill="#8FAF9A" opacity="0.5" transform="rotate(-20 45 11)" />
      <ellipse cx="70" cy="9" rx="5" ry="2.5" fill="#8FAF9A" opacity="0.4" transform="rotate(-10 70 9)" />
      <ellipse cx="90" cy="12" rx="4" ry="2" fill="#8FAF9A" opacity="0.35" transform="rotate(5 90 12)" />
      {/* Right small leaves */}
      <ellipse cx="250" cy="11" rx="6" ry="3" fill="#8FAF9A" opacity="0.5" transform="rotate(20 250 11)" />
      <ellipse cx="230" cy="9" rx="5" ry="2.5" fill="#8FAF9A" opacity="0.4" transform="rotate(10 230 9)" />
      <ellipse cx="210" cy="12" rx="4" ry="2" fill="#8FAF9A" opacity="0.35" transform="rotate(-5 210 12)" />
      {/* Center diamond */}
      <rect x="156" y="13" width="8" height="8" rx="1" fill="none" stroke="#C9A84C" strokeWidth="0.75" transform="rotate(45 160 17)" opacity="0.7" />
      <circle cx="160" cy="17" r="1.5" fill="#C9A84C" opacity="0.6" />
    </svg>
  );
}
