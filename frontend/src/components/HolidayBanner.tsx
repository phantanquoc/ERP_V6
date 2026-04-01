/**
 * HolidayBanner — Banner lễ tết chuyên nghiệp
 * - default    → Corporate mesh gradient + animated blobs
 * - tet        → Hoa mai SVG + đèn lồng SVG + particles vàng
 * - liberation → Cờ đỏ sao vàng SVG bay + canvas-confetti pháo hoa
 * - labor      → Same red+gold scheme, nội dung Lao động
 * Hiển thị sớm 7 ngày · User override qua dropdown → localStorage
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

export type HolidayType = 'tet' | 'liberation' | 'labor' | 'default';

export interface BannerUser {
  firstName: string;
  lastName?: string;
  position?: string;
  employeeCode?: string;
  subDepartment?: string;
  employeeStatus?: string;
}

interface Props {
  user: BannerUser;
  departmentName: string;
  forceHoliday?: HolidayType;
}

const LS_KEY = 'holidayBannerOverride';
export function saveBannerOverride(v: HolidayType | 'auto'): void { localStorage.setItem(LS_KEY, v); }
export function loadBannerOverride(): HolidayType | 'auto' {
  return (localStorage.getItem(LS_KEY) as HolidayType | 'auto') ?? 'auto';
}

export function detectHoliday(): HolidayType {
  const ahead = new Date();
  ahead.setDate(ahead.getDate() + 7);
  const m = ahead.getMonth() + 1;
  const d = ahead.getDate();
  if ((m === 1 && d >= 8) || (m === 2 && d <= 20)) return 'tet';
  if (m === 4 && d >= 23) return 'liberation';
  if (m === 5 && d <= 3) return 'labor';
  return 'default';
}

const PICKER_OPTIONS: { value: HolidayType | 'auto'; label: string }[] = [
  { value: 'auto',       label: 'Tự động theo ngày' },
  { value: 'default',    label: 'Mặc định' },
  { value: 'tet',        label: 'Tết Nguyên Đán' },
  { value: 'liberation', label: '30/4 Giải phóng' },
  { value: 'labor',      label: '1/5 Lao động' },
];

const BannerPicker: React.FC<{ value: HolidayType | 'auto'; onChange: (v: HolidayType | 'auto') => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const label = PICKER_OPTIONS.find(o => o.value === value)?.label ?? 'Tự động';
  return (
    <div className="relative mb-1.5 flex justify-end" style={{ zIndex: 30 }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 bg-black/20 text-white/80 hover:bg-black/30 hover:text-white transition-all backdrop-blur-md"
      >
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"/>
        </svg>
        <span>{label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl overflow-hidden shadow-2xl border border-white/10"
               style={{ background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(16px)', zIndex: 50 }}>
            {PICKER_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => { onChange(opt.value); saveBannerOverride(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                  value === opt.value ? 'text-amber-300 font-semibold' : 'text-white/70 hover:text-white'
                } hover:bg-white/8`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${value === opt.value ? 'bg-amber-400' : 'bg-white/20'}`}/>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ─── Fruit SVGs (An Bình Foods theme) ────────────────────────────────────────
// Mỗi fruit là một SVG inline nhỏ, render dưới dạng component
const FruitSVG: React.FC<{ type: 'watermelon' | 'orange' | 'grape' | 'mango' | 'strawberry'; size: number }> = ({ type, size }) => {
  const s = size;
  if (type === 'watermelon') return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      {/* rind outer */}
      <path d="M5 20 A15 15 0 0 1 35 20 Z" fill="#4CAF50"/>
      <path d="M7 20 A13 13 0 0 1 33 20 Z" fill="#81C784"/>
      {/* flesh */}
      <path d="M8 20 A12 12 0 0 1 32 20 Z" fill="#EF5350"/>
      {/* seeds */}
      <ellipse cx="15" cy="17" rx="1.2" ry="1.8" fill="#1B5E20" transform="rotate(-10 15 17)"/>
      <ellipse cx="20" cy="15" rx="1.2" ry="1.8" fill="#1B5E20"/>
      <ellipse cx="25" cy="17" rx="1.2" ry="1.8" fill="#1B5E20" transform="rotate(10 25 17)"/>
      {/* stem */}
      <path d="M20 5 Q22 8 20 11" stroke="#388E3C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
  if (type === 'orange') return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      <circle cx="20" cy="22" r="14" fill="#FF8F00"/>
      <circle cx="20" cy="22" r="14" fill="url(#og)" fillOpacity="0.3"/>
      <defs><radialGradient id="og" cx="35%" cy="30%"><stop offset="0%" stopColor="#fff" stopOpacity="0.5"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/></radialGradient></defs>
      {/* segments hint */}
      {[0,60,120,180,240,300].map(a => (
        <line key={a} x1="20" y1="22" x2={20 + 13 * Math.cos(a * Math.PI/180)} y2={22 + 13 * Math.sin(a * Math.PI/180)}
              stroke="#E65100" strokeWidth="0.6" opacity="0.4"/>
      ))}
      {/* leaf */}
      <path d="M20 8 Q24 4 26 6 Q22 10 20 8Z" fill="#388E3C"/>
      <path d="M20 8 Q17 5 15 7 Q18 10 20 8Z" fill="#43A047"/>
      {/* stem */}
      <line x1="20" y1="8" x2="20" y2="11" stroke="#5D4037" strokeWidth="1.5"/>
    </svg>
  );
  if (type === 'grape') return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      {/* grapes cluster */}
      {([
        [20,30],[15,25],[25,25],[11,20],[20,20],[29,20],[15,15],[25,15],[20,10]
      ] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="5.5" fill="#7B1FA2"/>
      ))}
      {([
        [20,30],[15,25],[25,25],[11,20],[20,20],[29,20],[15,15],[25,15],[20,10]
      ] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x-1.5} cy={y-1.5} r="1.8" fill="rgba(255,255,255,0.28)"/>
      ))}
      {/* stem + leaf */}
      <line x1="20" y1="5" x2="20" y2="8" stroke="#5D4037" strokeWidth="1.5"/>
      <path d="M20 5 Q23 2 25 4 Q22 7 20 5Z" fill="#43A047"/>
    </svg>
  );
  if (type === 'mango') return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      <defs><radialGradient id="mg" cx="40%" cy="30%"><stop offset="0%" stopColor="#FFCC02"/><stop offset="60%" stopColor="#FF8F00"/><stop offset="100%" stopColor="#E65100"/></radialGradient></defs>
      <path d="M20 34 C10 34 6 24 8 16 C10 8 16 6 20 6 C24 6 30 8 32 16 C34 24 30 34 20 34Z" fill="url(#mg)"/>
      <path d="M14 12 Q17 16 16 22" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
      {/* stem */}
      <line x1="20" y1="6" x2="20" y2="2" stroke="#5D4037" strokeWidth="1.5"/>
      <path d="M20 3 Q23 1 24 3 Q22 5 20 3Z" fill="#43A047"/>
    </svg>
  );
  // strawberry
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      <defs><radialGradient id="sg" cx="40%" cy="30%"><stop offset="0%" stopColor="#FF6B6B"/><stop offset="100%" stopColor="#C62828"/></radialGradient></defs>
      <path d="M20 35 C12 30 6 22 8 15 C10 8 16 8 20 11 C24 8 30 8 32 15 C34 22 28 30 20 35Z" fill="url(#sg)"/>
      {/* seeds */}
      {([[14,22],[19,18],[24,22],[17,28],[23,28]] as [number,number][]).map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="0.9" ry="1.2" fill="rgba(255,255,200,0.8)" transform={`rotate(-10 ${x} ${y})`}/>
      ))}
      {/* calyx */}
      <path d="M17 11 Q20 8 23 11" stroke="#388E3C" strokeWidth="1" fill="none"/>
      <path d="M20 9 Q20 5 20 4" stroke="#388E3C" strokeWidth="1.2" fill="none"/>
      <path d="M15 10 Q13 7 14 5" stroke="#43A047" strokeWidth="1.1" fill="none"/>
      <path d="M25 10 Q27 7 26 5" stroke="#43A047" strokeWidth="1.1" fill="none"/>
    </svg>
  );
};

// Danh sách trái cây rơi (vị trí, loại, delay, tốc độ, size)
const FALLING_FRUITS: { left: string; delay: string; duration: string; size: number; type: 'watermelon' | 'orange' | 'grape' | 'mango' | 'strawberry'; wobble: string }[] = [
  { left: '30%',  delay: '0s',   duration: '8s',   size: 52, type: 'watermelon', wobble: '0s'   },
  { left: '40%',  delay: '1.8s', duration: '9.5s', size: 46, type: 'orange',     wobble: '0.4s' },
  { left: '50%',  delay: '3.2s', duration: '8.6s', size: 48, type: 'grape',      wobble: '0.7s' },
  { left: '61%',  delay: '0.9s', duration: '10s',  size: 50, type: 'mango',      wobble: '1.1s' },
  { left: '72%',  delay: '4s',   duration: '8.2s', size: 44, type: 'strawberry', wobble: '0.3s' },
  { left: '34%',  delay: '5.5s', duration: '9s',   size: 42, type: 'orange',     wobble: '0.9s' },
  { left: '56%',  delay: '7s',   duration: '8.8s', size: 46, type: 'mango',      wobble: '0.5s' },
  { left: '83%',  delay: '2.4s', duration: '9.3s', size: 42, type: 'grape',      wobble: '1.3s' },
  { left: '45%',  delay: '6.2s', duration: '8.6s', size: 48, type: 'watermelon', wobble: '0.6s' },
  { left: '92%',  delay: '1.2s', duration: '9.8s', size: 42, type: 'strawberry', wobble: '0.2s' },
];

// ─── DEFAULT BANNER ───────────────────────────────────────────────────────────
const DefaultBanner: React.FC<Props> = ({ user, departmentName }) => {
  const now = useClock();
  const h = now.getHours();
  const greeting = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // Mouse interaction state
  const [hoveredFruit, setHoveredFruit] = useState<number | null>(null);
  const [poppedFruits, setPoppedFruits] = useState<Set<number>>(new Set());

  const handleFruitClick = (i: number) => {
    setPoppedFruits(prev => new Set([...prev, i]));
    // Reset sau 700ms để fruit có thể rơi lại
    setTimeout(() => setPoppedFruits(prev => { const s = new Set(prev); s.delete(i); return s; }), 700);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-xl mb-8" style={{ minHeight: 148 }}>
      <style>{`
        @keyframes fruit-fall {
          0%   { transform: translateY(-50px) rotate(0deg);   opacity: 0; }
          8%   { opacity: 0.85; }
          90%  { opacity: 0.7; }
          100% { transform: translateY(200px) rotate(340deg); opacity: 0; }
        }
        @keyframes fruit-wobble {
          0%,100% { margin-left: 0px; }
          25%      { margin-left: 8px; }
          75%      { margin-left: -8px; }
        }
        @keyframes leaf-sway {
          0%,100% { transform: rotate(-8deg) scale(1); }
          50%      { transform: rotate(8deg) scale(1.04); }
        }
        @keyframes blob-drift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(18px,-12px) scale(1.04); }
          66%     { transform: translate(-10px,8px) scale(0.97); }
        }
        @keyframes slide-l { from{opacity:0;transform:translateX(-22px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fade-u  { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
        .fruit-fall    { animation: fruit-fall linear infinite; position: absolute; top: 0; pointer-events: auto; cursor: pointer; }
        .fruit-wobble  { animation: fruit-wobble ease-in-out infinite; }
        .leaf-sway     { animation: leaf-sway 4s ease-in-out infinite; transform-origin: 50% 0%; }
        .sl { animation: slide-l 0.5s ease both; }
        .fu { animation: fade-u  0.5s ease both; }
      `}</style>

      {/* Background — deep forest green → teal, thương hiệu trái cây */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #052e16 100%)' }}/>
      {/* Animated blobs */}
      <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full opacity-20"
           style={{ background: 'radial-gradient(circle, #4ade80 0%, transparent 70%)', animation: 'blob-drift 9s ease-in-out infinite' }}/>
      <div className="absolute -bottom-20 right-20 w-80 h-80 rounded-full opacity-15"
           style={{ background: 'radial-gradient(circle, #fb923c 0%, transparent 70%)', animation: 'blob-drift 12s ease-in-out infinite reverse' }}/>
      {/* Dot grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }}/>

      {/* ── Falling fruits (toàn banner, từ giữa ra phải) ── */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 2 }}>
        {FALLING_FRUITS.map((f, i) => {
          const isHovered = hoveredFruit === i;
          const isPopped  = poppedFruits.has(i);
          return (
            <div key={i} className="fruit-fall"
                 style={{ left: f.left, animationDelay: f.delay, animationDuration: f.duration }}
                 onMouseEnter={() => setHoveredFruit(i)}
                 onMouseLeave={() => setHoveredFruit(null)}
                 onClick={() => handleFruitClick(i)}>
              <div className="fruit-wobble" style={{
                animationDelay: f.wobble,
                animationDuration: f.duration,
                transform: isPopped
                  ? 'scale(1.7) rotate(25deg)'
                  : isHovered
                    ? 'scale(1.3) rotate(12deg)'
                    : 'scale(1)',
                transition: 'transform 0.18s ease, filter 0.18s ease, opacity 0.2s ease',
                filter: isPopped
                  ? 'brightness(1.8) drop-shadow(0 0 10px rgba(255,240,100,0.9))'
                  : isHovered
                    ? 'brightness(1.25) drop-shadow(0 0 6px rgba(255,255,150,0.6))'
                    : 'none',
                opacity: isPopped ? 0 : 1,
              }}>
                <FruitSVG type={f.type} size={f.size}/>
              </div>
            </div>
          );
        })}

        {/* Decorative large leaf top-right */}
        <svg className="leaf-sway absolute right-4 top-0 opacity-30" width="60" height="80" viewBox="0 0 60 80">
          <path d="M30 0 Q55 20 50 50 Q40 70 30 80 Q20 70 10 50 Q5 20 30 0Z" fill="#16a34a"/>
          <path d="M30 0 Q30 30 30 80" stroke="#15803d" strokeWidth="1.5" fill="none" opacity="0.6"/>
          <path d="M30 20 Q42 28 50 40" stroke="#15803d" strokeWidth="1" fill="none" opacity="0.5"/>
          <path d="M30 20 Q18 28 10 40" stroke="#15803d" strokeWidth="1" fill="none" opacity="0.5"/>
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 p-6 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 max-w-[58%]">
          <p className="sl text-xs font-semibold tracking-[0.2em] uppercase mb-2"
             style={{ color: '#86efac', animationDelay: '0.1s' }}>
            An Bình Foods — ERP System
          </p>
          <h1 className="sl text-white font-bold leading-tight mb-1"
              style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)', animationDelay: '0.2s' }}>
            {greeting}, <span style={{ color: '#4ade80' }}>{user.firstName}</span>
          </h1>
          <p className="fu text-sm mb-4" style={{ color: 'rgba(187,247,208,0.7)', animationDelay: '0.3s' }}>
            {user.position} &nbsp;·&nbsp; {departmentName}
          </p>
          <div className="fu flex flex-wrap gap-2" style={{ animationDelay: '0.4s' }}>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold border"
                  style={{ borderColor: 'rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.1)', color: '#86efac' }}>
              {user.employeeCode}
            </span>
            {user.subDepartment && (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold border"
                    style={{ borderColor: 'rgba(251,146,60,0.35)', background: 'rgba(251,146,60,0.1)', color: '#fdba74' }}>
                {user.subDepartment.toUpperCase()}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold border"
                  style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#86efac' }}>
              {user.employeeStatus || 'Đang làm việc'}
            </span>
          </div>
        </div>

        {/* Clock */}
        <div className="hidden sm:flex flex-col items-end flex-shrink-0" style={{ zIndex: 3 }}>
          <p className="text-white font-bold tabular-nums" style={{ fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', letterSpacing: '-0.02em' }}>
            {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs mt-0.5 text-right" style={{ color: 'rgba(134,239,172,0.6)' }}>
            {now.toLocaleDateString('vi-VN', { weekday: 'long' })}<br/>
            {now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
           style={{ background: 'linear-gradient(90deg, transparent, #4ade80, #fb923c, #4ade80, transparent)' }}/>
    </div>
  );
};

// ─── TẾT BANNER ───────────────────────────────────────────────────────────────
const TetBanner: React.FC<Props> = ({ user, departmentName }) => {
  const now = useClock();
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-8" style={{ minHeight: 148 }}>
      <style>{`
        @keyframes tet-shimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes lantern-sway { 0%,100%{transform:rotate(-7deg)} 50%{transform:rotate(7deg)} }
        @keyframes lantern-glow { 0%,100%{filter:drop-shadow(0 0 5px rgba(255,175,0,0.5))} 50%{filter:drop-shadow(0 0 14px rgba(255,175,0,0.9))} }
        @keyframes mai-float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-5px) rotate(3deg)} }
        @keyframes mai-sway  { 0%,100%{transform:rotate(-3.5deg)} 50%{transform:rotate(3.5deg)} }
        @keyframes petal-drift {
          0%   { transform:translateY(-8px) translateX(0)    rotate(0deg);   opacity:0.9 }
          100% { transform:translateY(175px) translateX(18px) rotate(520deg); opacity:0 }
        }
        @keyframes gold-shine {
          0%,100% { text-shadow:0 0 7px rgba(255,215,0,0.35),0 1px 2px rgba(0,0,0,0.5) }
          50%      { text-shadow:0 0 16px rgba(255,215,0,0.8),0 0 28px rgba(255,175,0,0.35),0 1px 2px rgba(0,0,0,0.5) }
        }
        @keyframes slide-l { from{opacity:0;transform:translateX(-22px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fade-u  { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
        .mai-branch { animation:mai-sway 5s ease-in-out infinite; transform-origin:88% 78% }
        .mf { animation:mai-float 3s ease-in-out infinite }
        .lsway { animation:lantern-sway 3s ease-in-out infinite; transform-origin:50% 0 }
        .lglow { animation:lantern-glow 2.5s ease-in-out infinite }
        .pdrift { animation:petal-drift linear infinite; position:absolute; pointer-events:none }
        .gold-text { animation:gold-shine 2.5s ease-in-out infinite }
        .sl { animation:slide-l 0.55s ease both }
        .fu { animation:fade-u 0.55s ease both }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0" style={{
        background:'linear-gradient(135deg,#6B0000 0%,#B71C1C 28%,#C62828 54%,#8B0000 80%,#5D0000 100%)',
        backgroundSize:'200% 200%', animation:'tet-shimmer 9s ease infinite'
      }}/>
      {/* Brocade grid */}
      <div className="absolute inset-0 opacity-[0.055]" style={{
        backgroundImage:`repeating-linear-gradient(0deg,transparent 0px,transparent 19px,rgba(255,215,0,1) 19px,rgba(255,215,0,1) 20px),
          repeating-linear-gradient(90deg,transparent 0px,transparent 19px,rgba(255,215,0,1) 19px,rgba(255,215,0,1) 20px)`
      }}/>
      <div className="absolute top-0 right-0 w-96 h-96 opacity-15" style={{ background:'radial-gradient(circle at 80% 15%,#FFD700 0%,transparent 55%)' }}/>

      {/* ── Mai branch right ── */}
      <div className="absolute right-0 top-0 bottom-0 w-[47%] pointer-events-none overflow-hidden">
        <svg className="mai-branch absolute right-0 top-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMaxYMid slice">
          <path d="M290 82 Q225 65 182 50 Q152 38 118 55 Q86 70 52 65" stroke="#3E2723" strokeWidth="7.5" fill="none" strokeLinecap="round"/>
          <path d="M182 50 Q165 24 136 16" stroke="#4E342E" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <path d="M118 55 Q100 36 76 32" stroke="#4E342E" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M146 53 Q140 78 128 94" stroke="#4E342E" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M198 58 Q191 82 180 98" stroke="#4E342E" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M88 63 Q82 82 76 98" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Leaves */}
          <ellipse cx="162" cy="33" rx="5" ry="9" fill="#2E7D32" opacity="0.55" transform="rotate(-28 162 33)"/>
          <ellipse cx="103" cy="44" rx="4" ry="7.5" fill="#388E3C" opacity="0.5" transform="rotate(22 103 44)"/>
          <ellipse cx="216" cy="63" rx="4" ry="7" fill="#2E7D32" opacity="0.4" transform="rotate(-14 216 63)"/>
          <defs>
            <g id="mf">
              {([0,72,144,216,288] as number[]).map((a,i) => (
                <ellipse key={i} cx="0" cy="-9" rx="4.5" ry="9" fill="#FFD700" transform={`rotate(${a})`} opacity="0.92"/>
              ))}
              <circle cx="0" cy="0" r="3.5" fill="#FF8F00"/>
              <circle cx="-0.8" cy="-0.8" r="0.65" fill="#8D6E63"/>
              <circle cx="0.8"  cy="-0.5" r="0.65" fill="#8D6E63"/>
              <circle cx="0"    cy="1"    r="0.65" fill="#8D6E63"/>
            </g>
            <g id="mfs">
              {([0,72,144,216,288] as number[]).map((a,i) => (
                <ellipse key={i} cx="0" cy="-6.5" rx="3" ry="6.5" fill="#FFCA28" transform={`rotate(${a})`} opacity="0.88"/>
              ))}
              <circle cx="0" cy="0" r="2.5" fill="#FFA000"/>
            </g>
            <g id="mb"><ellipse cx="0" cy="0" rx="2.5" ry="5" fill="#FFD700" opacity="0.65"/></g>
          </defs>
          {([
            [138,22,'mf','0s'],[173,46,'mf','0.6s'],[106,53,'mf','1.1s'],
            [203,60,'mf','0.3s'],[83,37,'mfs','0.9s'],[146,56,'mfs','1.4s'],
            [126,90,'mf','0.7s'],[183,96,'mfs','1.7s'],[218,74,'mf','0.2s'],
            [90,93,'mfs','1.2s'],[156,30,'mb',''],[193,80,'mb','']
          ] as [number,number,string,string][]).map(([x,y,id,d],i) => (
            <use key={i} href={`#${id}`} x={x} y={y} className="mf" style={d ? {animationDelay:d} : {}}/>
          ))}
        </svg>

        {/* Falling petal dots */}
        {([
          {l:'63%',d:'0s',  dur:'6.2s',s:5},
          {l:'73%',d:'1.6s',dur:'7.1s',s:4},
          {l:'81%',d:'3.1s',dur:'5.6s',s:6},
          {l:'76%',d:'4.6s',dur:'6.8s',s:4},
          {l:'68%',d:'2.2s',dur:'7.4s',s:5},
        ]).map((p,i) => (
          <div key={i} className="pdrift" style={{ left:p.l, top:-8, animationDelay:p.d, animationDuration:p.dur }}>
            <svg width={p.s*2} height={p.s*2} viewBox="0 0 10 10">
              <ellipse cx="5" cy="5" rx="4" ry="3.5" fill="#FFCA28" opacity="0.72" transform="rotate(25 5 5)"/>
            </svg>
          </div>
        ))}
      </div>

      {/* ── Lanterns top-left ── */}
      <div className="absolute top-0 left-5 flex gap-4 pointer-events-none" style={{ zIndex:2 }}>
        {([{sc:1,d:'0s'},{sc:0.72,d:'0.45s'}] as {sc:number,d:string}[]).map((l,i) => (
          <div key={i} className="lsway lglow" style={{ animationDelay:l.d }}>
            <svg width={Math.round(32*l.sc)} height={Math.round(50*l.sc)} viewBox="0 0 32 50">
              <line x1="16" y1="0" x2="16" y2="6" stroke="#B8860B" strokeWidth="1.5"/>
              <path d="M8 7 Q16 4 24 7" stroke="#B8860B" strokeWidth="2" fill="#7B5800"/>
              <rect x="9" y="7" width="14" height="2.5" rx="1.2" fill="#C8920A"/>
              <path d="M9 9.5 Q4 23 8 36 Q16 40 24 36 Q28 23 23 9.5 Z" fill="#C62828"/>
              {([14,18,22,26,30,34] as number[]).map(y => (
                <path key={y} d={`M10 ${y} Q16 ${y+2.5} 22 ${y}`} stroke="rgba(255,200,0,0.28)" strokeWidth="0.8" fill="none"/>
              ))}
              <ellipse cx="16" cy="23" rx="5" ry="7.5" fill="rgba(255,200,0,0.22)"/>
              <line x1="12" y1="36" x2="11" y2="44" stroke="#C8920A" strokeWidth="1"/>
              <line x1="16" y1="37" x2="16" y2="45" stroke="#C8920A" strokeWidth="1"/>
              <line x1="20" y1="36" x2="21" y2="44" stroke="#C8920A" strokeWidth="1"/>
            </svg>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 p-6 pr-4">
        <div style={{ marginLeft:80 }}>
          <p className="sl gold-text text-xs font-semibold tracking-[0.22em] uppercase mb-2"
             style={{ color:'#FFD700', animationDelay:'0.1s' }}>
            Chúc Mừng Năm Mới — Xuân Bính Ngọ 2026
          </p>
          <h1 className="sl font-bold text-white leading-tight mb-1"
              style={{ fontSize:'clamp(1.2rem,3vw,1.75rem)', animationDelay:'0.2s' }}>
            Kính chào, <span style={{ color:'#FFD700' }}>{user.firstName}</span>!
          </h1>
          <p className="fu text-red-200/70 text-sm mb-4" style={{ animationDelay:'0.3s' }}>
            {user.position} &nbsp;·&nbsp; {departmentName}
          </p>
          <div className="fu flex flex-wrap gap-2" style={{ animationDelay:'0.4s' }}>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold border"
                  style={{ borderColor:'rgba(255,215,0,0.4)', background:'rgba(255,215,0,0.1)', color:'#FFD700' }}>
              {user.employeeCode}
            </span>
            {user.subDepartment && (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold border border-red-300/30 bg-red-300/10 text-red-200">
                {user.subDepartment.toUpperCase()}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              {user.employeeStatus || 'Đang làm việc'}
            </span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-5 text-right z-10 pointer-events-none">
        <p className="font-bold tabular-nums gold-text" style={{ color:'#FFD700', fontSize:'clamp(1.1rem,2.5vw,1.5rem)' }}>
          {now.toLocaleDateString('vi-VN')}
        </p>
        <p className="text-xs text-red-200/55 mt-0.5">{now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
           style={{ background:'linear-gradient(90deg,transparent,#FFD700 30%,#FF8F00 50%,#FFD700 70%,transparent)' }}/>
    </div>
  );
};

// ─── LIBERATION / LABOR BANNER ────────────────────────────────────────────────
const LiberationBanner: React.FC<Props & { type: 'liberation' | 'labor' }> = ({ user, departmentName, type }) => {
  const now = useClock();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLabor = type === 'labor';

  const fireConfetti = useCallback(() => {
    if (!canvasRef.current) return;
    const shoot = confetti.create(canvasRef.current, { resize: true, useWorker: false });
    const colors = ['#FFCD00','#FFD700','#FFF176','#ffffff','#FF6B6B'];
    shoot({ particleCount:38, angle:125, spread:58, origin:{x:0.84,y:0.22}, colors, ticks:200, gravity:0.75, scalar:0.88 });
    setTimeout(() => shoot({ particleCount:28, angle:112, spread:50, origin:{x:0.91,y:0.55}, colors, ticks:160, gravity:0.85, scalar:0.78 }), 420);
    setTimeout(() => shoot({ particleCount:20, angle:140, spread:45, origin:{x:0.76,y:0.18}, colors, ticks:140, gravity:0.9,  scalar:0.72 }), 800);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => fireConfetti(), 700);
    timerRef.current = setInterval(() => fireConfetti(), 6500);
    return () => { clearTimeout(first); if (timerRef.current) clearInterval(timerRef.current); };
  }, [fireConfetti]);

  const headline = isLabor ? 'Ngày Quốc Tế Lao Động — 1 tháng 5' : 'Kỷ Niệm Ngày Giải Phóng Miền Nam — 30 tháng 4';
  const subline  = isLabor ? 'Vinh danh những người lao động Việt Nam' : 'Độc lập — Tự do — Hạnh phúc';

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-8" style={{ minHeight: 148 }}>
      <style>{`
        @keyframes lib-bg { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes star-glow {
          0%,100%{filter:drop-shadow(0 0 4px rgba(255,205,0,0.65))}
          50%     {filter:drop-shadow(0 0 12px rgba(255,205,0,1)) drop-shadow(0 0 22px rgba(255,155,0,0.45))}
        }
        @keyframes flag-light {
          0%,100%{opacity:0.05} 50%{opacity:0.12}
        }
        @keyframes slide-l { from{opacity:0;transform:translateX(-22px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fade-u  { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes gold-shine {
          0%,100%{text-shadow:0 0 7px rgba(255,205,0,0.35),0 1px 2px rgba(0,0,0,0.5)}
          50%     {text-shadow:0 0 16px rgba(255,205,0,0.8),0 0 28px rgba(255,155,0,0.35),0 1px 2px rgba(0,0,0,0.5)}
        }
        .star-glow { animation:star-glow 2.2s ease-in-out infinite }
        .flag-light { animation:flag-light 2.5s ease-in-out infinite }
        .gold-text { animation:gold-shine 2.5s ease-in-out infinite }
        .sl { animation:slide-l 0.55s ease both }
        .fu { animation:fade-u 0.55s ease both }
        .flag-clickable { transition: transform 0.18s ease, filter 0.18s ease; }
        .flag-clickable:hover { transform: scale(1.07) rotate(-1deg); filter: drop-shadow(0 0 12px rgba(255,205,0,0.7)); }
        .flag-clickable:active { transform: scale(0.96); }
      `}</style>

      <div className="absolute inset-0" style={{
        background:'linear-gradient(135deg,#5D0000 0%,#B71C1C 25%,#C62828 50%,#8B0000 75%,#5D0000 100%)',
        backgroundSize:'200% 200%', animation:'lib-bg 11s ease infinite'
      }}/>
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage:`repeating-linear-gradient(-45deg,transparent 0px,transparent 12px,rgba(255,205,0,1) 12px,rgba(255,205,0,1) 13px)`
      }}/>
      <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 62% 50%,transparent 38%,rgba(0,0,0,0.32) 100%)' }}/>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex:5 }}/>

      {/* Flag SVG — click để bắn pháo bông */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flag-clickable"
           style={{ zIndex: 4, cursor: 'pointer' }}
           onClick={fireConfetti}
           title="Nhấn để bắn pháo bông 🎆">
        <svg width="164" height="114" viewBox="0 0 164 114">
          <defs>
            <linearGradient id="pg" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"  stopColor="#9E7D10"/>
              <stop offset="40%" stopColor="#F0C040"/>
              <stop offset="100%" stopColor="#9E7D10"/>
            </linearGradient>
            <clipPath id="fc"><rect x="10" y="4" width="152" height="106" rx="2"/></clipPath>
          </defs>
          {/* Pole */}
          <rect x="2" y="0" width="7" height="114" rx="3.5" fill="url(#pg)"/>
          <circle cx="5.5" cy="4" r="5.5" fill="#F0C040"/>
          {/* Flag */}
          <g clipPath="url(#fc)">
            <rect x="10" y="4" width="152" height="106" fill="#C62828"/>
            {/* Wave sheen layers */}
            <path d="M10,4 C48,4 58,22 96,22 C134,22 144,4 162,4 L162,110 C144,110 134,92 96,92 C58,92 48,110 10,110 Z"
                  fill="rgba(255,255,255,0.035)" className="flag-light"/>
            <path d="M10,4 C36,4 46,30 84,30 C122,30 132,4 154,4 L154,110 C132,110 122,84 84,84 C46,84 36,110 10,110 Z"
                  fill="rgba(255,255,255,0.025)" className="flag-light" style={{animationDelay:'0.6s'}}/>
          </g>
          {/* Star */}
          <polygon
            points="87,27 91.9,42 107.5,42 95.2,51.2 100.1,66.2 87,57 73.9,66.2 78.8,51.2 66.5,42 82.1,42"
            fill="#FFCD00" className="star-glow"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 max-w-[60%]">
        <p className="sl gold-text text-xs font-bold tracking-[0.2em] uppercase mb-2"
           style={{ color:'#FFCD00', animationDelay:'0.1s' }}>
          {headline}
        </p>
        <h1 className="sl font-bold text-white leading-tight mb-1"
            style={{ fontSize:'clamp(1.2rem,3vw,1.75rem)', animationDelay:'0.2s' }}>
          Kính chào, <span style={{ color:'#FFCD00' }}>{user.firstName}</span>!
        </h1>
        <p className="fu text-red-200/65 text-sm italic mb-4" style={{ animationDelay:'0.3s' }}>{subline}</p>
        <p className="fu text-red-100/55 text-xs mb-3" style={{ animationDelay:'0.35s' }}>{user.position} &nbsp;·&nbsp; {departmentName}</p>
        <div className="fu flex flex-wrap gap-2" style={{ animationDelay:'0.45s' }}>
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold border"
                style={{ borderColor:'rgba(255,205,0,0.4)', background:'rgba(255,205,0,0.1)', color:'#FFCD00' }}>
            {user.employeeCode}
          </span>
          {user.subDepartment && (
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold border border-red-300/30 bg-red-300/10 text-red-200">
              {user.subDepartment.toUpperCase()}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            {user.employeeStatus || 'Đang làm việc'}
          </span>
        </div>
      </div>

      <div className="absolute bottom-4 right-5 text-right z-10 pointer-events-none">
        <p className="font-bold tabular-nums gold-text" style={{ color:'#FFCD00', fontSize:'clamp(1.1rem,2.5vw,1.5rem)' }}>
          {now.toLocaleDateString('vi-VN')}
        </p>
        <p className="text-xs text-red-200/50 mt-0.5">{now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
           style={{ background:'linear-gradient(90deg,transparent,#FFCD00 30%,#FF8F00 50%,#FFCD00 70%,transparent)' }}/>
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
const HolidayBanner: React.FC<Props> = ({ user, departmentName, forceHoliday }) => {
  const [override, setOverride] = useState<HolidayType | 'auto'>(() => loadBannerOverride());
  const holiday: HolidayType = forceHoliday ?? (override === 'auto' ? detectHoliday() : override);
  const p = { user, departmentName };
  const renderBanner = () => {
    switch (holiday) {
      case 'tet':        return <TetBanner {...p}/>;
      case 'liberation': return <LiberationBanner {...p} type="liberation"/>;
      case 'labor':      return <LiberationBanner {...p} type="labor"/>;
      default:           return <DefaultBanner {...p}/>;
    }
  };
  return (
    <div>
      {!forceHoliday && <BannerPicker value={override} onChange={setOverride}/>}
      {renderBanner()}
    </div>
  );
};

export default HolidayBanner;
