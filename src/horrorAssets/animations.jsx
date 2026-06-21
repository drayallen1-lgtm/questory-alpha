import React from 'react';

/** Inline animated previews — work offline and animate in img/object contexts */

export function AnimSwingMoving({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Swing moving">
      <style>{`
        @keyframes swing-move { 0%,100%{transform:rotate(-18deg);transform-origin:200px 90px} 50%{transform:rotate(18deg);transform-origin:200px 90px} }
        .swing-seat { animation: swing-move 2.8s ease-in-out infinite; }
      `}</style>
      <rect width="400" height="400" fill="#050508"/>
      <rect x="0" y="280" width="400" height="120" fill="#0a0a0c"/>
      <path d="M80 280 L80 90 L320 90 L320 280" stroke="#3a3a42" strokeWidth="8" fill="none"/>
      <line x1="200" y1="90" x2="200" y2="175" stroke="#555" strokeWidth="3"/>
      <g className="swing-seat">
        <rect x="165" y="175" width="70" height="8" rx="2" fill="#5a4a3a"/>
        <line x1="175" y1="175" x2="175" y2="240" stroke="#666" strokeWidth="2"/>
        <line x1="225" y1="175" x2="225" y2="240" stroke="#666" strokeWidth="2"/>
        <rect x="160" y="240" width="80" height="12" rx="3" fill="#4a3a2a"/>
      </g>
      <text x="200" y="370" textAnchor="middle" fill="#5a5a6a" fontFamily="serif" fontSize="14">Swing Moving</text>
    </svg>
  );
}

export function AnimLanternFlicker({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Lantern flickering">
      <style>{`
        @keyframes flicker { 0%,100%{opacity:1} 15%{opacity:0.4} 30%{opacity:0.9} 45%{opacity:0.3} 60%{opacity:1} 75%{opacity:0.55} }
        .flame { animation: flicker 1.2s infinite; }
      `}</style>
      <rect width="400" height="400" fill="#050508"/>
      <defs>
        <radialGradient id="lf" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcc66"/>
          <stop offset="60%" stopColor="#ff6600"/>
          <stop offset="100%" stopColor="#330000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse className="flame" cx="200" cy="175" rx="50" ry="60" fill="url(#lf)"/>
      <path d="M200 120 L175 200 L225 200 Z" fill="#1a1a1a"/>
      <rect x="172" y="198" width="56" height="70" rx="4" fill="#111"/>
      <text x="200" y="370" textAnchor="middle" fill="#6a5a4a" fontFamily="serif" fontSize="14">Lantern Flickering</text>
    </svg>
  );
}

export function AnimGhostAppearing({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Ghost appearing">
      <style>{`
        @keyframes ghost-in { 0%{opacity:0;transform:translateY(30px) scale(0.85)} 40%{opacity:0.3} 100%{opacity:0.95;transform:translateY(0) scale(1)} }
        .ghost { animation: ghost-in 3s ease-out infinite alternate; }
      `}</style>
      <rect width="400" height="400" fill="#070709"/>
      <g className="ghost" opacity="0.9">
        <path d="M200 100 C160 100 145 150 150 200 L135 320 L165 320 L175 220 L185 320 L215 320 L225 220 L235 320 L265 320 L250 200 C255 150 240 100 200 100 Z" fill="#e8e8ee" opacity="0.75"/>
        <ellipse cx="200" cy="118" rx="26" ry="30" fill="#f0f0f5" opacity="0.8"/>
        <circle cx="188" cy="112" r="4" fill="#222"/>
        <circle cx="212" cy="112" r="4" fill="#222"/>
      </g>
      <text x="200" y="370" textAnchor="middle" fill="#6a6a7a" fontFamily="serif" fontSize="14">Ghost Appearing</text>
    </svg>
  );
}

export function AnimTreeBranches({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Tree branches moving">
      <style>{`
        @keyframes sway { 0%,100%{transform:rotate(-3deg);transform-origin:200px 310px} 50%{transform:rotate(4deg);transform-origin:200px 310px} }
        .branches { animation: sway 4s ease-in-out infinite; }
      `}</style>
      <rect width="400" height="400" fill="#030305"/>
      <circle cx="320" cy="70" r="28" fill="#8b0000" opacity="0.35"/>
      <rect x="0" y="310" width="400" height="90" fill="#0a0a0c"/>
      <g className="branches">
        <path d="M200 310 L200 120" stroke="#2a2520" strokeWidth="16" strokeLinecap="round"/>
        <path d="M200 200 L110 120 M200 170 L290 90 M200 240 L90 190 M200 220 L310 200" stroke="#2a2520" strokeWidth="8" strokeLinecap="round"/>
      </g>
      <text x="200" y="370" textAnchor="middle" fill="#5a5a6a" fontFamily="serif" fontSize="14">Tree Branches</text>
    </svg>
  );
}

export const ANIMATION_PREVIEW_COMPONENTS = {
  'anim-swing': AnimSwingMoving,
  'anim-lantern': AnimLanternFlicker,
  'anim-ghost': AnimGhostAppearing,
  'anim-tree': AnimTreeBranches,
};

export function HorrorAnimationPreview({ assetId, className = '' }) {
  const Component = ANIMATION_PREVIEW_COMPONENTS[assetId];
  if (!Component) return null;
  return <Component className={className} />;
}
