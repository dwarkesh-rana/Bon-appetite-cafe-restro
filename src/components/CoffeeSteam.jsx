import React from 'react';

export default function CoffeeSteam({ className = "" }) {
  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 100 120"
      width="60"
      height="80"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="steamBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <g filter="url(#steamBlur)" stroke="rgba(212, 175, 55, 0.45)" strokeWidth="2.5" fill="none" strokeLinecap="round">
        {/* Steam Wave Path 1 */}
        <path
          className="steam-path-1"
          d="M 50 110 C 45 90, 55 70, 48 50 C 42 32, 52 15, 45 5"
        />
        {/* Steam Wave Path 2 */}
        <path
          className="steam-path-2"
          d="M 52 110 C 58 92, 48 74, 55 54 C 62 36, 48 18, 52 5"
        />
        {/* Steam Wave Path 3 */}
        <path
          className="steam-path-3"
          d="M 48 110 C 40 88, 60 68, 50 48 C 40 30, 56 12, 48 5"
        />
      </g>
    </svg>
  );
}
