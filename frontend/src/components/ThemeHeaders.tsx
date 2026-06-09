import React from 'react';

export interface ThemeHeaderProps {
  user: any;
  departmentName: string;
}

// DEFAULT THEME — Blue gradient, clean, professional
export const DefaultThemeHeader: React.FC<ThemeHeaderProps> = ({ user, departmentName }) => (
  <div className="relative bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)`
      }}></div>
    </div>
    <div className="relative z-10">
      <div>
        <p className="text-blue-200 text-xs sm:text-sm font-medium tracking-wider mb-1">ABF SYSTEM</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
          Chào mừng, {user.lastName} {user.firstName}!
        </h1>
        <p className="text-blue-100 text-sm sm:text-lg mt-1">
          {user.position} - {departmentName}
        </p>
      </div>
      <div className="flex items-center mt-3 space-x-2 flex-wrap gap-y-2">
        <span className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded-full text-xs sm:text-sm font-bold shadow-lg">
          {user.employeeCode}
        </span>
        {user.subDepartment && (
          <span className="px-2 sm:px-3 py-1 bg-indigo-500 border border-blue-300 text-white rounded-full text-xs sm:text-sm shadow-lg">
            {user.subDepartment.toUpperCase()}
          </span>
        )}
        <span className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded-full text-xs sm:text-sm font-medium shadow-lg">
          {user.employeeStatus || 'Đang làm việc'}
        </span>
      </div>
      <div className="mt-3 sm:mt-0 sm:absolute sm:bottom-3 sm:right-4 text-left sm:text-right text-white">
        <p className="text-lg sm:text-2xl font-bold drop-shadow-lg">{new Date().toLocaleDateString('vi-VN')}</p>
        <p className="text-xs sm:text-sm text-blue-200">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  </div>
);

// TET THEME — Red + Mai flowers + animations
export const TetThemeHeader: React.FC<ThemeHeaderProps> = ({ user, departmentName }) => (
  <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,215,0,0.1) 10px, rgba(255,215,0,0.1) 20px)`
      }}></div>
    </div>
    <style>{`
      @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-8px) rotate(5deg); } }
      @keyframes sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
      @keyframes falling-petal { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(150px) rotate(360deg); opacity: 0; } }
      .branch-sway { animation: sway 4s ease-in-out infinite; transform-origin: left center; }
      .flower-float { animation: float 3s ease-in-out infinite; }
      .petal-fall { animation: falling-petal 5s linear infinite; position: absolute; }
      @media (prefers-reduced-motion: reduce) {
        .branch-sway, .flower-float, .petal-fall { animation: none; }
      }
    `}</style>
    <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden hidden sm:block">
      <svg className="absolute right-0 top-0 h-full w-full branch-sway" viewBox="0 0 250 150" preserveAspectRatio="xMaxYMid slice">
        <path d="M260 75 Q200 60 160 45 Q130 35 100 50 Q70 65 40 60" stroke="#5D4037" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M160 45 Q145 25 120 20" stroke="#5D4037" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <path d="M100 50 Q85 35 65 30" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M130 48 Q125 70 115 85" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M180 55 Q175 75 165 90" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <defs>
          <g id="mai-flower">
            <ellipse cx="0" cy="-8" rx="4" ry="8" fill="#FFD700"/><ellipse cx="7.6" cy="-2.5" rx="4" ry="8" fill="#FFD700" transform="rotate(72)"/>
            <ellipse cx="4.7" cy="6.5" rx="4" ry="8" fill="#FFD700" transform="rotate(144)"/><ellipse cx="-4.7" cy="6.5" rx="4" ry="8" fill="#FFD700" transform="rotate(216)"/>
            <ellipse cx="-7.6" cy="-2.5" rx="4" ry="8" fill="#FFD700" transform="rotate(288)"/><circle cx="0" cy="0" r="3" fill="#FF8C00"/>
            <circle cx="-1" cy="-1" r="0.8" fill="#8B4513"/><circle cx="1" cy="0" r="0.8" fill="#8B4513"/><circle cx="0" cy="1" r="0.8" fill="#8B4513"/>
          </g>
          <g id="mai-flower-small">
            <ellipse cx="0" cy="-6" rx="3" ry="6" fill="#FFD700"/><ellipse cx="5.7" cy="-1.9" rx="3" ry="6" fill="#FFD700" transform="rotate(72)"/>
            <ellipse cx="3.5" cy="4.9" rx="3" ry="6" fill="#FFD700" transform="rotate(144)"/><ellipse cx="-3.5" cy="4.9" rx="3" ry="6" fill="#FFD700" transform="rotate(216)"/>
            <ellipse cx="-5.7" cy="-1.9" rx="3" ry="6" fill="#FFD700" transform="rotate(288)"/><circle cx="0" cy="0" r="2" fill="#FF8C00"/>
          </g>
          <g id="mai-bud"><ellipse cx="0" cy="0" rx="3" ry="5" fill="#FFD700"/><path d="M-2 2 Q0 -3 2 2" stroke="#5D4037" strokeWidth="0.5" fill="none"/></g>
        </defs>
        <use href="#mai-flower" x="120" y="22" className="flower-float"/>
        <use href="#mai-flower" x="155" y="40" className="flower-float" style={{animationDelay: '0.5s'}}/>
        <use href="#mai-flower" x="95" y="48" className="flower-float" style={{animationDelay: '1s'}}/>
        <use href="#mai-flower" x="180" y="55" className="flower-float" style={{animationDelay: '0.3s'}}/>
        <use href="#mai-flower-small" x="65" y="32" className="flower-float" style={{animationDelay: '0.8s'}}/>
        <use href="#mai-flower-small" x="130" y="50" className="flower-float" style={{animationDelay: '1.2s'}}/>
        <use href="#mai-flower" x="115" y="82" className="flower-float" style={{animationDelay: '0.6s'}}/>
        <use href="#mai-flower-small" x="165" y="88" className="flower-float" style={{animationDelay: '1.5s'}}/>
        <use href="#mai-flower" x="200" y="65" className="flower-float" style={{animationDelay: '0.2s'}}/>
        <use href="#mai-bud" x="75" y="55" /><use href="#mai-bud" x="145" y="30" /><use href="#mai-bud" x="190" y="78" />
      </svg>
    </div>
    <div className="petal-fall text-lg hidden sm:block" style={{left: '60%', animationDelay: '0s'}}>🌸</div>
    <div className="petal-fall text-xl hidden sm:block" style={{left: '70%', animationDelay: '1s'}}>🌸</div>
    <div className="petal-fall text-lg hidden sm:block" style={{left: '80%', animationDelay: '2s'}}>🌸</div>
    <div className="petal-fall text-xl hidden sm:block" style={{left: '75%', animationDelay: '3s'}}>🌸</div>
    <div className="petal-fall text-lg hidden sm:block" style={{left: '65%', animationDelay: '4s'}}>🌸</div>
    <div className="relative z-10">
      <div>
        <p className="text-yellow-300 text-xs sm:text-sm font-medium tracking-wider mb-1">🧧 CHÚC MỪNG NĂM MỚI 2026 ✨</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">Chào mừng, {user.lastName} {user.firstName}!</h1>
        <p className="text-red-100 text-sm sm:text-lg mt-1">{user.position} - {departmentName}</p>
      </div>
      <div className="flex items-center mt-3 space-x-2 flex-wrap gap-y-2">
        <span className="px-2 sm:px-3 py-1 bg-yellow-500 text-red-800 rounded-full text-xs sm:text-sm font-bold shadow-lg">🏷️ {user.employeeCode}</span>
        {user.subDepartment && (
          <span className="px-2 sm:px-3 py-1 bg-red-500 border border-yellow-400 text-white rounded-full text-xs sm:text-sm shadow-lg">{user.subDepartment.toUpperCase()}</span>
        )}
        <span className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded-full text-xs sm:text-sm font-medium shadow-lg">🌟 {user.employeeStatus || 'Đang làm việc'}</span>
      </div>
      <div className="mt-3 sm:mt-0 sm:absolute sm:bottom-3 sm:right-4 text-left sm:text-right text-white">
        <p className="text-lg sm:text-2xl font-bold drop-shadow-lg">{new Date().toLocaleDateString('vi-VN')}</p>
        <p className="text-xs sm:text-sm text-red-100">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
    <div className="absolute top-2 left-2 text-xl sm:text-2xl">🏮</div>
  </div>
);

// APR30 THEME — Vietnam Liberation Day — animated star + refined skyline
export const Apr30ThemeHeader: React.FC<ThemeHeaderProps> = ({ user, departmentName }) => (
  <div className="relative rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden" style={{background: 'linear-gradient(135deg, #8B0000 0%, #CC0000 40%, #DA251D 60%, #B71C1C 100%)'}}>
    {/* Subtle vignette */}
    <div className="absolute inset-0" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 40%)'}}></div>

    <style>{`
      @keyframes apr30-star-rotate {
        0% { transform: rotate(0deg) scale(1); }
        25% { transform: rotate(3deg) scale(1.04); }
        50% { transform: rotate(0deg) scale(1.08); }
        75% { transform: rotate(-3deg) scale(1.04); }
        100% { transform: rotate(0deg) scale(1); }
      }
      @keyframes apr30-star-glow-pulse {
        0%, 100% {
          filter: drop-shadow(0 0 8px rgba(255,205,0,0.5)) drop-shadow(0 0 20px rgba(255,205,0,0.2));
          opacity: 1;
        }
        50% {
          filter: drop-shadow(0 0 18px rgba(255,205,0,0.8)) drop-shadow(0 0 40px rgba(255,205,0,0.4)) drop-shadow(0 0 60px rgba(255,205,0,0.15));
          opacity: 1;
        }
      }
      @keyframes apr30-rays-rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes apr30-aura-breathe {
        0%, 100% { r: 45; opacity: 0.3; }
        50% { r: 58; opacity: 0.5; }
      }
      @keyframes apr30-sparkle {
        0%, 100% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 0.8; transform: scale(1.1); }
      }
      @keyframes apr30-window-blink {
        0%, 100% { opacity: 0.15; }
        50% { opacity: 0.5; }
      }
      /* Firework burst — expand + fade */
      @keyframes apr30-fw-burst {
        0% { transform: scale(0); opacity: 0; }
        10% { opacity: 1; }
        40% { transform: scale(1); opacity: 0.9; }
        100% { transform: scale(1.3); opacity: 0; }
      }
      /* Firework trail — shoot up */
      @keyframes apr30-fw-trail {
        0% { opacity: 0; stroke-dashoffset: 40; }
        30% { opacity: 0.8; }
        60% { opacity: 0.6; stroke-dashoffset: 0; }
        100% { opacity: 0; stroke-dashoffset: 0; }
      }
      /* Firework particle — radial scatter */
      @keyframes apr30-fw-particle {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      /* Anniversary text slide in + glow */
      @keyframes apr30-text-appear {
        0% { opacity: 0; transform: translateY(8px); }
        40% { opacity: 1; transform: translateY(0); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes apr30-text-glow {
        0%, 100% { filter: drop-shadow(0 0 4px rgba(255,205,0,0.3)); }
        50% { filter: drop-shadow(0 0 10px rgba(255,205,0,0.6)) drop-shadow(0 0 20px rgba(255,205,0,0.2)); }
      }
      .apr30-star-animate {
        animation: apr30-star-rotate 6s ease-in-out infinite, apr30-star-glow-pulse 3s ease-in-out infinite;
        transform-origin: 0 0;
      }
      .apr30-rays-spin {
        animation: apr30-rays-rotate 30s linear infinite;
        transform-origin: 0 0;
      }
      .apr30-sparkle { animation: apr30-sparkle 3s ease-in-out infinite; }
      .apr30-window-blink { animation: apr30-window-blink 4s ease-in-out infinite; }
      .apr30-fw-burst { animation: apr30-fw-burst 2.5s ease-out infinite; transform-origin: center; }
      .apr30-fw-trail { animation: apr30-fw-trail 2.5s ease-out infinite; stroke-dasharray: 40; }
      .apr30-text-line { animation: apr30-text-appear 1.5s ease-out forwards, apr30-text-glow 3s ease-in-out 1.5s infinite; opacity: 0; }
      .apr30-text-line-2 { animation: apr30-text-appear 1.5s ease-out 0.4s forwards, apr30-text-glow 3s ease-in-out 1.9s infinite; opacity: 0; }
      .apr30-text-line-3 { animation: apr30-text-appear 1.5s ease-out 0.8s forwards, apr30-text-glow 3s ease-in-out 2.3s infinite; opacity: 0; }
      @media (prefers-reduced-motion: reduce) {
        .apr30-star-animate, .apr30-rays-spin, .apr30-sparkle, .apr30-window-blink,
        .apr30-fw-burst, .apr30-fw-trail, .apr30-text-line, .apr30-text-line-2, .apr30-text-line-3 {
          animation: none !important;
          opacity: 1;
        }
      }
    `}</style>

    {/* Background SVG — animated star + refined skyline (hidden on mobile for performance) */}
    <div className="absolute inset-0 hidden sm:block">
      <svg className="w-full h-full" viewBox="0 0 1000 180" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="apr30-hill1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B71C1C"/>
            <stop offset="100%" stopColor="#7B0000"/>
          </linearGradient>
          <linearGradient id="apr30-hill2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D32F2F"/>
            <stop offset="100%" stopColor="#B71C1C"/>
          </linearGradient>
          <radialGradient id="apr30-star-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFCD00" stopOpacity="0.6"/>
            <stop offset="50%" stopColor="#FFB300" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#FFCD00" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="apr30-star-inner" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#FFF9C4"/>
            <stop offset="40%" stopColor="#FFE066"/>
            <stop offset="100%" stopColor="#FFCD00"/>
          </radialGradient>
          <linearGradient id="apr30-skyline-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5D0000"/>
            <stop offset="100%" stopColor="#3D0000"/>
          </linearGradient>
        </defs>

        {/* ===== ROTATING LIGHT RAYS from star ===== */}
        <g transform="translate(520,42)">
          <g className="apr30-rays-spin" opacity="0.07">
            <polygon points="0,-90 12,-180 -12,-180" fill="#FFCD00"/>
            <polygon points="85.6,-29.4 171.2,-58.8 148.5,-94.1" fill="#FFCD00"/>
            <polygon points="55.6,72.8 111.2,145.6 139.8,117.6" fill="#FFCD00"/>
            <polygon points="-55.6,72.8 -111.2,145.6 -139.8,117.6" fill="#FFCD00"/>
            <polygon points="-85.6,-29.4 -171.2,-58.8 -148.5,-94.1" fill="#FFCD00"/>
            <polygon points="0,90 30,180 -30,180" fill="#FFCD00"/>
            <polygon points="72.8,-55.6 145.6,-111.2 117.6,-139.8" fill="#FFCD00"/>
            <polygon points="90,0 180,30 180,-30" fill="#FFCD00"/>
            <polygon points="-72.8,-55.6 -145.6,-111.2 -117.6,-139.8" fill="#FFCD00"/>
            <polygon points="-90,0 -180,30 -180,-30" fill="#FFCD00"/>
          </g>
        </g>

        {/* ===== ANIMATED GOLD STAR ===== */}
        <g transform="translate(520,42)">
          <g className="apr30-star-animate">
          {/* Outer aura — breathing */}
          <circle cx="0" cy="0" r="52" fill="url(#apr30-star-aura)" opacity="0.4">
            <animate attributeName="r" values="45;58;45" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite"/>
          </circle>
          {/* Main 5-pointed star */}
          <polygon points="0,-34 9,-11 34,-11 15,4 22,30 0,16 -22,30 -15,4 -34,-11 -9,-11" fill="url(#apr30-star-inner)"/>
          {/* Inner highlight */}
          <polygon points="0,-22 6,-7 22,-7 10,3 14,19 0,10 -14,19 -10,3 -22,-7 -6,-7" fill="#FFE066" opacity="0.6"/>
          {/* Bright center core */}
          <polygon points="0,-12 3,-4 12,-4 5,1 7,10 0,5 -7,10 -5,1 -12,-4 -3,-4" fill="#FFF9C4" opacity="0.5"/>
          {/* Center dot */}
          <circle cx="0" cy="0" r="2.5" fill="white" opacity="0.6"/>
          </g>
        </g>

        {/* ===== SPARKLE STARS around main star ===== */}
        <g fill="#FFCD00">
          <polygon points="380,22 382,27 387,27 383,30 385,35 380,32 375,35 377,30 373,27 378,27" className="apr30-sparkle" style={{animationDelay: '0s'}}/>
          <polygon points="660,28 662,33 667,33 663,36 665,41 660,38 655,41 657,36 653,33 658,33" className="apr30-sparkle" style={{animationDelay: '1s'}}/>
          <polygon points="450,65 451,68 454,68 452,70 453,73 450,71 447,73 448,70 446,68 449,68" className="apr30-sparkle" style={{animationDelay: '0.5s'}}/>
          <polygon points="595,18 596,21 599,21 597,23 598,26 595,24 592,26 593,23 591,21 594,21" className="apr30-sparkle" style={{animationDelay: '1.8s'}}/>
          <polygon points="470,15 471,18 474,18 472,20 473,23 470,21 467,23 468,20 466,18 469,18" className="apr30-sparkle" style={{animationDelay: '2.3s'}}/>
        </g>

        {/* ===== RED HILLS (back layer) ===== */}
        <path d="M0,130 Q100,108 220,118 Q350,130 480,112 Q580,100 680,115 Q800,130 920,118 Q970,108 1000,128 L1000,180 L0,180 Z" fill="url(#apr30-hill1)" opacity="0.5"/>

        {/* ===== HCMC SKYLINE — refined silhouette ===== */}
        <g opacity="0.75">
          {/* Ground/base for buildings */}
          <rect x="380" y="158" width="320" height="22" fill="#3D0000" opacity="0.3" rx="1"/>

          {/* --- Far-left small buildings --- */}
          <g fill="url(#apr30-skyline-grad)">
            <rect x="390" y="132" width="12" height="28" rx="1"/>
            <rect x="390" y="130" width="12" height="3" rx="1" fill="#4A0000"/>
            <rect x="406" y="126" width="10" height="34" rx="1"/>
            <rect x="406" y="124" width="10" height="3" rx="1" fill="#4A0000"/>
            <rect x="420" y="136" width="14" height="24" rx="1"/>
          </g>

          {/* --- Bitexco Financial Tower --- */}
          <g>
            {/* Main tower body — tapered */}
            <path d="M460,78 L466,78 Q469,108 471,132 L473,155 L474,160 L452,160 L453,155 L455,132 Q457,108 460,78 Z" fill="#4A0000"/>
            {/* Tower top cap */}
            <rect x="458" y="74" width="10" height="5" rx="2" fill="#5D0000"/>
            <line x1="463" y1="65" x2="463" y2="74" stroke="#5D0000" strokeWidth="1.5"/>
            {/* Helipad — the iconic feature */}
            <path d="M470,115 L484,110 L484,113 L470,118 Z" fill="#4A0000"/>
            <ellipse cx="484" cy="111.5" rx="2" ry="1.5" fill="#5D0000"/>
            {/* Horizontal floor lines */}
            <line x1="459" y1="90" x2="466" y2="90" stroke="#FFCD00" strokeWidth="0.5" opacity="0.3"/>
            <line x1="458" y1="100" x2="467" y2="100" stroke="#FFCD00" strokeWidth="0.5" opacity="0.25"/>
            <line x1="457" y1="110" x2="468" y2="110" stroke="#FFCD00" strokeWidth="0.5" opacity="0.2"/>
            <line x1="456" y1="125" x2="470" y2="125" stroke="#FFCD00" strokeWidth="0.5" opacity="0.18"/>
            <line x1="455" y1="140" x2="471" y2="140" stroke="#FFCD00" strokeWidth="0.5" opacity="0.15"/>
          </g>

          {/* --- Landmark 81 (tallest) --- */}
          <g>
            {/* Main tower — very tall, slender taper */}
            <path d="M510,48 L514,48 Q516,85 518,118 L519,155 L520,160 L504,160 L505,155 L506,118 Q508,85 510,48 Z" fill="#3D0000"/>
            {/* Crown/top */}
            <rect x="507" y="44" width="10" height="5" rx="1" fill="#350000"/>
            {/* Spire */}
            <line x1="512" y1="26" x2="512" y2="44" stroke="#350000" strokeWidth="2"/>
            <circle cx="512" cy="25" r="1.5" fill="#FFCD00" opacity="0.5"/>
            {/* Floor lines */}
            <line x1="509" y1="65" x2="514" y2="65" stroke="#FFCD00" strokeWidth="0.4" opacity="0.3"/>
            <line x1="509" y1="80" x2="515" y2="80" stroke="#FFCD00" strokeWidth="0.4" opacity="0.25"/>
            <line x1="508" y1="100" x2="516" y2="100" stroke="#FFCD00" strokeWidth="0.4" opacity="0.2"/>
            <line x1="507" y1="120" x2="517" y2="120" stroke="#FFCD00" strokeWidth="0.4" opacity="0.18"/>
            <line x1="506" y1="140" x2="518" y2="140" stroke="#FFCD00" strokeWidth="0.4" opacity="0.15"/>
          </g>

          {/* --- Mid buildings cluster --- */}
          <g fill="url(#apr30-skyline-grad)">
            <rect x="530" y="118" width="16" height="42" rx="1"/>
            <rect x="530" y="116" width="16" height="3" rx="1" fill="#4A0000"/>
            <rect x="550" y="108" width="14" height="52" rx="1"/>
            <rect x="550" y="106" width="14" height="3" rx="1" fill="#4A0000"/>
          </g>

          {/* --- Notre Dame Cathedral --- */}
          <g>
            {/* Main body */}
            <rect x="578" y="130" width="26" height="30" rx="1" fill="#4A0000"/>
            {/* Facade detail — arched entrance */}
            <path d="M583,160 L583,148 Q591,142 599,148 L599,160" fill="#3D0000" opacity="0.5"/>
            {/* Left tower + spire */}
            <rect x="578" y="118" width="8" height="14" rx="1" fill="#5D0000"/>
            <polygon points="579,118 582,102 585,118" fill="#5D0000"/>
            <line x1="582" y1="96" x2="582" y2="102" stroke="#5D0000" strokeWidth="1"/>
            {/* Cross on left */}
            <line x1="582" y1="93" x2="582" y2="97" stroke="#FFCD00" strokeWidth="1" opacity="0.7"/>
            <line x1="580" y1="95" x2="584" y2="95" stroke="#FFCD00" strokeWidth="1" opacity="0.7"/>
            {/* Right tower + spire */}
            <rect x="596" y="118" width="8" height="14" rx="1" fill="#5D0000"/>
            <polygon points="597,118 600,102 603,118" fill="#5D0000"/>
            <line x1="600" y1="96" x2="600" y2="102" stroke="#5D0000" strokeWidth="1"/>
            {/* Cross on right */}
            <line x1="600" y1="93" x2="600" y2="97" stroke="#FFCD00" strokeWidth="1" opacity="0.7"/>
            <line x1="598" y1="95" x2="602" y2="95" stroke="#FFCD00" strokeWidth="1" opacity="0.7"/>
            {/* Rose window */}
            <circle cx="591" cy="135" r="3" fill="none" stroke="#FFCD00" strokeWidth="0.5" opacity="0.3"/>
          </g>

          {/* --- Right buildings cluster --- */}
          <g fill="url(#apr30-skyline-grad)">
            <rect x="618" y="124" width="14" height="36" rx="1"/>
            <rect x="618" y="122" width="14" height="3" rx="1" fill="#4A0000"/>
            <rect x="636" y="116" width="18" height="44" rx="1"/>
            <rect x="636" y="114" width="18" height="3" rx="1" fill="#4A0000"/>
            <rect x="658" y="128" width="12" height="32" rx="1"/>
            <rect x="674" y="134" width="16" height="26" rx="1"/>
            <rect x="674" y="132" width="16" height="3" rx="1" fill="#4A0000"/>
          </g>

          {/* --- Window lights (blinking) --- */}
          <g fill="#FFCD00">
            {/* Bitexco windows */}
            <rect x="461" y="88" width="1.5" height="1.5" opacity="0.3" className="apr30-window-blink"/>
            <rect x="460" y="105" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '1s'}}/>
            <rect x="459" y="130" width="1.5" height="1.5" opacity="0.2" className="apr30-window-blink" style={{animationDelay: '2s'}}/>
            {/* Landmark windows */}
            <rect x="511" y="70" width="1.5" height="1.5" opacity="0.3" className="apr30-window-blink" style={{animationDelay: '0.5s'}}/>
            <rect x="510" y="95" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '1.5s'}}/>
            <rect x="510" y="115" width="1.5" height="1.5" opacity="0.2" className="apr30-window-blink" style={{animationDelay: '2.5s'}}/>
            {/* Small buildings windows */}
            <rect x="394" y="138" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '0.8s'}}/>
            <rect x="409" y="132" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '1.3s'}}/>
            <rect x="534" y="128" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '1.8s'}}/>
            <rect x="554" y="118" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '0.3s'}}/>
            <rect x="622" y="132" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '2.2s'}}/>
            <rect x="642" y="124" width="1.5" height="1.5" opacity="0.25" className="apr30-window-blink" style={{animationDelay: '0.7s'}}/>
            <rect x="648" y="136" width="1.5" height="1.5" opacity="0.2" className="apr30-window-blink" style={{animationDelay: '1.2s'}}/>
            <rect x="662" y="138" width="1.5" height="1.5" opacity="0.2" className="apr30-window-blink" style={{animationDelay: '2.8s'}}/>
            <rect x="678" y="140" width="1.5" height="1.5" opacity="0.2" className="apr30-window-blink" style={{animationDelay: '1.7s'}}/>
          </g>
        </g>

        {/* ===== RED HILLS (mid layer) ===== */}
        <path d="M0,145 Q120,125 250,138 Q380,150 500,132 Q620,118 740,135 Q860,150 1000,142 L1000,180 L0,180 Z" fill="url(#apr30-hill2)" opacity="0.7"/>

        {/* Traditional houses */}
        <g opacity="0.4" fill="#3D0000">
          <g transform="translate(80, 135)"><rect x="0" y="4" width="10" height="7"/><polygon points="-1,4 5,-2 11,4"/></g>
          <g transform="translate(115, 130)"><rect x="0" y="4" width="8" height="6"/><polygon points="-1,4 4,-2 9,4"/></g>
          <g transform="translate(850, 138)"><rect x="0" y="4" width="10" height="7"/><polygon points="-1,4 5,-2 11,4"/></g>
          <g transform="translate(885, 133)"><rect x="0" y="4" width="8" height="6"/><polygon points="-1,4 4,-2 9,4"/></g>
          <g transform="translate(200, 140)"><rect x="0" y="3" width="7" height="5"/><polygon points="-1,3 3.5,-1 8,3"/></g>
          <g transform="translate(780, 136)"><rect x="0" y="3" width="7" height="5"/><polygon points="-1,3 3.5,-1 8,3"/></g>
        </g>

        {/* Front hill */}
        <path d="M0,158 Q150,142 300,152 Q450,160 600,148 Q750,138 900,152 Q960,158 1000,155 L1000,180 L0,180 Z" fill="#B71C1C" opacity="0.85"/>

        {/* ===== FIREWORKS in right empty area ===== */}

        {/* --- Firework 1 (large, golden) at right-center --- */}
        <g>
          {/* Trail */}
          <line x1="800" y1="140" x2="800" y2="55" stroke="#FFCD00" strokeWidth="1.2" className="apr30-fw-trail" style={{animationDelay: '0s'}}/>
          {/* Burst */}
          <g className="apr30-fw-burst" style={{animationDelay: '0.6s'}}>
            <circle cx="800" cy="50" r="2" fill="#FFCD00"/>
            {/* Particles — radial lines */}
            <line x1="800" y1="50" x2="800" y2="28" stroke="#FFCD00" strokeWidth="1" opacity="0.9"/>
            <line x1="800" y1="50" x2="800" y2="72" stroke="#FFCD00" strokeWidth="1" opacity="0.9"/>
            <line x1="800" y1="50" x2="778" y2="50" stroke="#FFCD00" strokeWidth="1" opacity="0.9"/>
            <line x1="800" y1="50" x2="822" y2="50" stroke="#FFCD00" strokeWidth="1" opacity="0.9"/>
            <line x1="800" y1="50" x2="816" y2="34" stroke="#FFE066" strokeWidth="0.8" opacity="0.8"/>
            <line x1="800" y1="50" x2="784" y2="34" stroke="#FFE066" strokeWidth="0.8" opacity="0.8"/>
            <line x1="800" y1="50" x2="816" y2="66" stroke="#FFE066" strokeWidth="0.8" opacity="0.8"/>
            <line x1="800" y1="50" x2="784" y2="66" stroke="#FFE066" strokeWidth="0.8" opacity="0.8"/>
            {/* Extra sparkle dots */}
            <circle cx="800" cy="25" r="1.5" fill="#FFF9C4"/>
            <circle cx="825" cy="50" r="1.5" fill="#FFF9C4"/>
            <circle cx="775" cy="50" r="1.5" fill="#FFF9C4"/>
            <circle cx="800" cy="75" r="1.5" fill="#FFF9C4"/>
            <circle cx="818" cy="32" r="1" fill="white"/>
            <circle cx="782" cy="32" r="1" fill="white"/>
            <circle cx="818" cy="68" r="1" fill="white"/>
            <circle cx="782" cy="68" r="1" fill="white"/>
            {/* Falling sparkle trails */}
            <line x1="800" y1="25" x2="800" y2="20" stroke="#FFF9C4" strokeWidth="0.5" opacity="0.6"/>
            <line x1="825" y1="50" x2="830" y2="52" stroke="#FFF9C4" strokeWidth="0.5" opacity="0.6"/>
            <line x1="818" y1="32" x2="822" y2="27" stroke="#FFF9C4" strokeWidth="0.5" opacity="0.6"/>
            <line x1="782" y1="32" x2="778" y2="27" stroke="#FFF9C4" strokeWidth="0.5" opacity="0.6"/>
          </g>
        </g>

        {/* --- Firework 2 (medium, red-orange) offset right --- */}
        <g>
          <line x1="890" y1="130" x2="890" y2="60" stroke="#FF6B35" strokeWidth="1" className="apr30-fw-trail" style={{animationDelay: '1.2s'}}/>
          <g className="apr30-fw-burst" style={{animationDelay: '1.8s'}}>
            <circle cx="890" cy="55" r="1.5" fill="#FF6B35"/>
            <line x1="890" y1="55" x2="890" y2="38" stroke="#FF6B35" strokeWidth="0.9" opacity="0.9"/>
            <line x1="890" y1="55" x2="890" y2="72" stroke="#FF6B35" strokeWidth="0.9" opacity="0.9"/>
            <line x1="890" y1="55" x2="873" y2="55" stroke="#FF6B35" strokeWidth="0.9" opacity="0.9"/>
            <line x1="890" y1="55" x2="907" y2="55" stroke="#FF6B35" strokeWidth="0.9" opacity="0.9"/>
            <line x1="890" y1="55" x2="902" y2="43" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <line x1="890" y1="55" x2="878" y2="43" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <line x1="890" y1="55" x2="902" y2="67" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <line x1="890" y1="55" x2="878" y2="67" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <circle cx="890" cy="35" r="1.2" fill="#FFE066"/>
            <circle cx="910" cy="55" r="1.2" fill="#FFE066"/>
            <circle cx="870" cy="55" r="1.2" fill="#FFE066"/>
            <circle cx="904" cy="41" r="0.8" fill="white"/>
            <circle cx="876" cy="41" r="0.8" fill="white"/>
          </g>
        </g>

        {/* --- Firework 3 (small, white-gold) top-right --- */}
        <g>
          <line x1="940" y1="120" x2="940" y2="40" stroke="#FFF9C4" strokeWidth="0.8" className="apr30-fw-trail" style={{animationDelay: '0.5s'}}/>
          <g className="apr30-fw-burst" style={{animationDelay: '1.1s'}}>
            <circle cx="940" cy="35" r="1" fill="#FFF9C4"/>
            <line x1="940" y1="35" x2="940" y2="22" stroke="#FFF9C4" strokeWidth="0.7" opacity="0.8"/>
            <line x1="940" y1="35" x2="940" y2="48" stroke="#FFF9C4" strokeWidth="0.7" opacity="0.8"/>
            <line x1="940" y1="35" x2="927" y2="35" stroke="#FFF9C4" strokeWidth="0.7" opacity="0.8"/>
            <line x1="940" y1="35" x2="953" y2="35" stroke="#FFF9C4" strokeWidth="0.7" opacity="0.8"/>
            <line x1="940" y1="35" x2="949" y2="26" stroke="#FFCD00" strokeWidth="0.5" opacity="0.7"/>
            <line x1="940" y1="35" x2="931" y2="26" stroke="#FFCD00" strokeWidth="0.5" opacity="0.7"/>
            <line x1="940" y1="35" x2="949" y2="44" stroke="#FFCD00" strokeWidth="0.5" opacity="0.7"/>
            <line x1="940" y1="35" x2="931" y2="44" stroke="#FFCD00" strokeWidth="0.5" opacity="0.7"/>
            <circle cx="940" cy="20" r="0.8" fill="white"/>
            <circle cx="955" cy="35" r="0.8" fill="white"/>
            <circle cx="925" cy="35" r="0.8" fill="white"/>
          </g>
        </g>

        {/* --- Firework 4 (medium, gold) far right low --- */}
        <g>
          <line x1="850" y1="135" x2="850" y2="75" stroke="#FFB300" strokeWidth="1" className="apr30-fw-trail" style={{animationDelay: '2s'}}/>
          <g className="apr30-fw-burst" style={{animationDelay: '2.6s'}}>
            <circle cx="850" cy="70" r="1.5" fill="#FFB300"/>
            <line x1="850" y1="70" x2="850" y2="52" stroke="#FFB300" strokeWidth="0.9" opacity="0.9"/>
            <line x1="850" y1="70" x2="850" y2="88" stroke="#FFB300" strokeWidth="0.9" opacity="0.9"/>
            <line x1="850" y1="70" x2="832" y2="70" stroke="#FFB300" strokeWidth="0.9" opacity="0.9"/>
            <line x1="850" y1="70" x2="868" y2="70" stroke="#FFB300" strokeWidth="0.9" opacity="0.9"/>
            <line x1="850" y1="70" x2="863" y2="57" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <line x1="850" y1="70" x2="837" y2="57" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <line x1="850" y1="70" x2="863" y2="83" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <line x1="850" y1="70" x2="837" y2="83" stroke="#FFCD00" strokeWidth="0.7" opacity="0.8"/>
            <circle cx="850" cy="50" r="1" fill="#FFF9C4"/>
            <circle cx="870" cy="70" r="1" fill="#FFF9C4"/>
            <circle cx="830" cy="70" r="1" fill="#FFF9C4"/>
            <circle cx="865" cy="55" r="0.8" fill="white"/>
            <circle cx="835" cy="55" r="0.8" fill="white"/>
          </g>
        </g>

        {/* ===== ANNIVERSARY TEXT — right side, moved up to avoid date overlay ===== */}
        <text x="830" y="80" textAnchor="middle" className="apr30-text-line" style={{fontSize: '11px', fontWeight: 700, fill: '#FFCD00', letterSpacing: '1px'}}>
          KỶ NIỆM 51 NĂM
        </text>
        <text x="830" y="93" textAnchor="middle" className="apr30-text-line-2" style={{fontSize: '8px', fontWeight: 600, fill: '#FFE066', letterSpacing: '0.5px'}}>
          GIẢI PHÓNG MIỀN NAM
        </text>
        <text x="830" y="104" textAnchor="middle" className="apr30-text-line-3" style={{fontSize: '8px', fontWeight: 600, fill: '#FFE066', letterSpacing: '0.5px'}}>
          THỐNG NHẤT ĐẤT NƯỚC
        </text>
      </svg>
    </div>

    {/* Content overlay */}
    <div className="relative z-10">
      <div>
        <p className="text-yellow-300 text-xs sm:text-sm font-bold tracking-widest mb-1" style={{textShadow: '0 1px 4px rgba(0,0,0,0.7)', letterSpacing: '1.5px'}}>
          MỪNG NGÀY GIẢI PHÓNG 30/4 - QUỐC TẾ LAO ĐỘNG 1/5
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white" style={{textShadow: '0 2px 8px rgba(0,0,0,0.5)'}}>
          Chào mừng, {user.lastName} {user.firstName}!
        </h1>
        <p className="text-red-100 text-sm sm:text-lg mt-1" style={{textShadow: '0 1px 3px rgba(0,0,0,0.4)'}}>
          {user.position} - {departmentName}
        </p>
      </div>
      <div className="flex items-center mt-3 space-x-2 flex-wrap gap-y-2">
        <span className="px-2 sm:px-3 py-1 bg-yellow-500 text-red-900 rounded-full text-xs sm:text-sm font-bold shadow-lg border border-yellow-400">{user.employeeCode}</span>
        {user.subDepartment && (
          <span className="px-2 sm:px-3 py-1 bg-red-600 border border-yellow-400 text-white rounded-full text-xs sm:text-sm shadow-lg font-medium">{user.subDepartment.toUpperCase()}</span>
        )}
        <span className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded-full text-xs sm:text-sm font-medium shadow-lg border border-green-400">{user.employeeStatus || 'Đang làm việc'}</span>
      </div>
      <div className="mt-3 sm:mt-0 sm:absolute sm:bottom-3 sm:right-4 text-left sm:text-right text-white">
        <p className="text-lg sm:text-2xl font-bold" style={{textShadow: '0 2px 6px rgba(0,0,0,0.5)'}}>{new Date().toLocaleDateString('vi-VN')}</p>
        <p className="text-xs sm:text-sm text-red-200" style={{textShadow: '0 1px 3px rgba(0,0,0,0.4)'}}>{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  </div>
);


// Theme-aware header that auto-selects based on activeTheme
export const ThemeHeader: React.FC<ThemeHeaderProps & { activeTheme: string }> = ({ activeTheme, ...props }) => {
  switch (activeTheme) {
    case 'TET': return <TetThemeHeader {...props} />;
    case 'APR30': return <Apr30ThemeHeader {...props} />;
    default: return <DefaultThemeHeader {...props} />;
  }
};

// Page background class based on theme
export const getThemePageBackground = (activeTheme: string): string => {
  switch (activeTheme) {
    case 'TET': return 'bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50';
    case 'APR30': return 'bg-gradient-to-br from-red-50 via-yellow-50 to-red-50';
    default: return 'bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50';
  }
};
