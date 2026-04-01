/**
 * HolidayBanner — Banner lễ tết tái sử dụng được
 *
 * Tự động hiển thị đúng theme theo ngày:
 *   • Tết Nguyên Đán (Jan–Feb)  → Hoa mai vàng, đèn lồng đỏ
 *   • 30/4 Giải phóng miền Nam  → Cờ đỏ sao vàng, pháo hoa
 *   • 1/5 Quốc tế Lao động      → Cờ đỏ búa liềm, pháo hoa
 *
 * Nếu không phải dịp đặc biệt → banner mặc định (xanh navy)
 */

import React, { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type HolidayType = 'tet' | 'liberation' | 'labor' | 'default';

export interface BannerUser {
  firstName: string;
  position?: string;
  employeeCode?: string;
  subDepartment?: string;
  employeeStatus?: string;
}

interface Props {
  user: BannerUser;
  departmentName: string;
  /** Override tự động detect — dùng khi cần test */
  forceHoliday?: HolidayType;
}

const LS_KEY = 'holidayBannerOverride';

/** Lưu lựa chọn override của user vào localStorage */
export function saveBannerOverride(v: HolidayType | 'auto'): void {
  localStorage.setItem(LS_KEY, v);
}

/** Đọc lựa chọn override ('auto' = không override) */
export function loadBannerOverride(): HolidayType | 'auto' {
  return (localStorage.getItem(LS_KEY) as HolidayType | 'auto') ?? 'auto';
}

// ─── Auto-detect holiday (hiển thị sớm 7 ngày trước mỗi dịp lễ) ─────────────
export function detectHoliday(): HolidayType {
  const today = new Date();
  // Dịch ngày lên 7 ngày để "nhìn trước"
  const ahead = new Date(today);
  ahead.setDate(ahead.getDate() + 7);
  const m = ahead.getMonth() + 1; // 1-based
  const d = ahead.getDate();

  // Tết Nguyên Đán: window 8 Jan – 20 Feb (bao gồm cả 7 ngày trước)
  if ((m === 1 && d >= 8) || (m === 2 && d <= 20)) return 'tet';

  // 30/4 Giải phóng: 23/4 – 30/4  (7 ngày trước = 23/4)
  if (m === 4 && d >= 23) return 'liberation';

  // 1/5 Lao động: 1/5 – 3/5  (hiển thị khi 30/4 đã qua nhưng chưa 1/5)
  if (m === 5 && d <= 3) return 'labor';

  return 'default';
}

// ─── Banner Picker — dropdown chọn thủ công để test ─────────────────────────
const PICKER_OPTIONS: { value: HolidayType | 'auto'; label: string }[] = [
  { value: 'auto',        label: '🔄 Tự động theo ngày' },
  { value: 'default',     label: '🏢 Mặc định (bình thường)' },
  { value: 'tet',         label: '🧧 Tết Nguyên Đán' },
  { value: 'liberation',  label: '🎆 30/4 Giải phóng' },
  { value: 'labor',       label: '🌹 1/5 Lao động' },
];

interface BannerPickerProps {
  value: HolidayType | 'auto';
  onChange: (v: HolidayType | 'auto') => void;
}

const BannerPicker: React.FC<BannerPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const current = PICKER_OPTIONS.find(o => o.value === value) ?? PICKER_OPTIONS[0];

  return (
    <div className="relative mb-2 flex justify-end" style={{zIndex: 20}}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
        title="Chọn banner để xem trước"
      >
        <span>{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl border border-white/10 overflow-hidden"
               style={{background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)'}}>
            {PICKER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); saveBannerOverride(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-white/10 transition-colors ${
                  value === opt.value ? 'text-yellow-300 font-semibold bg-white/5' : 'text-white'
                }`}
              >
                {value === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0"/>}
                {value !== opt.value && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"/>}
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Shared CSS animations injected once ─────────────────────────────────────
const SHARED_CSS = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%       { transform: translateY(-8px) rotate(5deg); }
  }
  @keyframes sway {
    0%, 100% { transform: rotate(-5deg); }
    50%       { transform: rotate(5deg); }
  }
  @keyframes falling-petal {
    0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(160px) rotate(360deg); opacity: 0; }
  }
  @keyframes flag-wave {
    0%   { transform: skewX(0deg) scaleX(1); }
    25%  { transform: skewX(-3deg) scaleX(0.97); }
    50%  { transform: skewX(0deg) scaleX(1); }
    75%  { transform: skewX(3deg) scaleX(0.97); }
    100% { transform: skewX(0deg) scaleX(1); }
  }
  @keyframes firework-burst {
    0%   { transform: scale(0); opacity: 1; }
    60%  { transform: scale(1.2); opacity: 0.9; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes firework-rise {
    0%   { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-80px); opacity: 0; }
  }
  @keyframes star-twinkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.8); }
  }
  @keyframes glow {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(255,205,0,0.6)); }
    50%       { filter: brightness(1.3) drop-shadow(0 0 10px rgba(255,205,0,0.9)); }
  }
  @keyframes march {
    0%   { transform: translateX(-100%) scaleX(1); }
    100% { transform: translateX(120%) scaleX(1); }
  }
  .branch-sway  { animation: sway 4s ease-in-out infinite; transform-origin: left center; }
  .flower-float { animation: float 3s ease-in-out infinite; }
  .petal-fall   { animation: falling-petal 5s linear infinite; position: absolute; }
  .flag-wave    { animation: flag-wave 2s ease-in-out infinite; transform-origin: left center; }
  .glow-gold    { animation: glow 2s ease-in-out infinite; }
  .star-twinkle { animation: star-twinkle 1.5s ease-in-out infinite; }
`;

// ─── TET Banner ───────────────────────────────────────────────────────────────
const TetBanner: React.FC<Props> = ({ user, departmentName }) => (
  <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-2xl shadow-xl p-6 mb-8 overflow-hidden">
    <style>{SHARED_CSS}</style>

    {/* Gold diamond pattern */}
    <div className="absolute inset-0 opacity-10" style={{
      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,215,0,0.15) 10px, rgba(255,215,0,0.15) 20px)`
    }} />

    {/* Mai branch SVG */}
    <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden">
      <svg className="absolute right-0 top-0 h-full w-full branch-sway" viewBox="0 0 250 150" preserveAspectRatio="xMaxYMid slice">
        <path d="M260 75 Q200 60 160 45 Q130 35 100 50 Q70 65 40 60" stroke="#5D4037" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M160 45 Q145 25 120 20" stroke="#5D4037" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <path d="M100 50 Q85 35 65 30" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M130 48 Q125 70 115 85" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M180 55 Q175 75 165 90" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <defs>
          <g id="tet-flower">
            <ellipse cx="0" cy="-8" rx="4" ry="8" fill="#FFD700"/>
            <ellipse cx="7.6" cy="-2.5" rx="4" ry="8" fill="#FFD700" transform="rotate(72)"/>
            <ellipse cx="4.7" cy="6.5"  rx="4" ry="8" fill="#FFD700" transform="rotate(144)"/>
            <ellipse cx="-4.7" cy="6.5" rx="4" ry="8" fill="#FFD700" transform="rotate(216)"/>
            <ellipse cx="-7.6" cy="-2.5" rx="4" ry="8" fill="#FFD700" transform="rotate(288)"/>
            <circle cx="0" cy="0" r="3" fill="#FF8C00"/>
            <circle cx="-1" cy="-1" r="0.8" fill="#8B4513"/>
            <circle cx="1"  cy="0"  r="0.8" fill="#8B4513"/>
            <circle cx="0"  cy="1"  r="0.8" fill="#8B4513"/>
          </g>
          <g id="tet-flower-sm">
            <ellipse cx="0" cy="-6" rx="3" ry="6" fill="#FFD700"/>
            <ellipse cx="5.7" cy="-1.9" rx="3" ry="6" fill="#FFD700" transform="rotate(72)"/>
            <ellipse cx="3.5" cy="4.9"  rx="3" ry="6" fill="#FFD700" transform="rotate(144)"/>
            <ellipse cx="-3.5" cy="4.9" rx="3" ry="6" fill="#FFD700" transform="rotate(216)"/>
            <ellipse cx="-5.7" cy="-1.9" rx="3" ry="6" fill="#FFD700" transform="rotate(288)"/>
            <circle cx="0" cy="0" r="2" fill="#FF8C00"/>
          </g>
          <g id="tet-bud">
            <ellipse cx="0" cy="0" rx="3" ry="5" fill="#FFD700"/>
            <path d="M-2 2 Q0 -3 2 2" stroke="#5D4037" strokeWidth="0.5" fill="none"/>
          </g>
        </defs>
        <use href="#tet-flower"    x="120" y="22" className="flower-float"/>
        <use href="#tet-flower"    x="155" y="40" className="flower-float" style={{animationDelay:'0.5s'}}/>
        <use href="#tet-flower"    x="95"  y="48" className="flower-float" style={{animationDelay:'1s'}}/>
        <use href="#tet-flower"    x="180" y="55" className="flower-float" style={{animationDelay:'0.3s'}}/>
        <use href="#tet-flower-sm" x="65"  y="32" className="flower-float" style={{animationDelay:'0.8s'}}/>
        <use href="#tet-flower-sm" x="130" y="50" className="flower-float" style={{animationDelay:'1.2s'}}/>
        <use href="#tet-flower"    x="115" y="82" className="flower-float" style={{animationDelay:'0.6s'}}/>
        <use href="#tet-flower-sm" x="165" y="88" className="flower-float" style={{animationDelay:'1.5s'}}/>
        <use href="#tet-flower"    x="200" y="65" className="flower-float" style={{animationDelay:'0.2s'}}/>
        <use href="#tet-bud" x="75"  y="55"/>
        <use href="#tet-bud" x="145" y="30"/>
        <use href="#tet-bud" x="190" y="78"/>
      </svg>
    </div>

    {/* Falling petals */}
    {[{l:'60%',d:'0s'},{l:'70%',d:'1s'},{l:'80%',d:'2s'},{l:'75%',d:'3s'},{l:'65%',d:'4s'}].map((p,i)=>(
      <div key={i} className="petal-fall text-xl" style={{left:p.l, animationDelay:p.d}}>🌸</div>
    ))}

    {/* Content */}
    <div className="flex items-center justify-between relative z-10">
      <div className="flex-1">
        <p className="text-yellow-300 text-sm font-medium tracking-wider mb-1">🧧 CHÚC MỪNG NĂM MỚI - XUÂN BÍNH NGỌ 2026 ✨</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Chào mừng, {user.firstName}!</h1>
        <p className="text-red-100 text-lg mt-1">{user.position} - {departmentName}</p>
        <div className="flex items-center mt-3 space-x-2 flex-wrap gap-y-2">
          <span className="px-3 py-1 bg-yellow-500 text-red-800 rounded-full text-sm font-bold shadow-lg">🏷️ {user.employeeCode}</span>
          {user.subDepartment && (
            <span className="px-3 py-1 bg-red-500 border border-yellow-400 text-white rounded-full text-sm shadow-lg">{user.subDepartment.toUpperCase()}</span>
          )}
          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium shadow-lg">🌟 {user.employeeStatus || 'ACTIVE'}</span>
        </div>
      </div>
    </div>

    <div className="absolute bottom-3 right-4 text-right text-white z-10">
      <p className="text-2xl font-bold drop-shadow-lg">{new Date().toLocaleDateString('vi-VN')}</p>
      <p className="text-sm text-red-100">{new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</p>
    </div>
    <div className="absolute top-2 left-2 text-2xl">🏮</div>
  </div>
);

// ─── LIBERATION / LABOR DAY Banner ───────────────────────────────────────────
const LiberationBanner: React.FC<Props & { type: 'liberation' | 'labor' }> = ({ user, departmentName, type }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const isLabor = type === 'labor';
  const headline   = isLabor ? '🌹 NGÀY QUỐC TẾ LAO ĐỘNG 1/5' : '🎆 KỶ NIỆM NGÀY GIẢI PHÓNG MIỀN NAM 30/4';
  const subline    = isLabor ? 'Vinh danh người lao động Việt Nam' : 'Thống nhất Đất nước · Tự do · Độc lập';
  const badgeColor = isLabor ? 'bg-yellow-500 text-red-900' : 'bg-yellow-400 text-red-900';

  // Firework positions
  const fireworks = [
    {x:'15%', delay:'0s',   size:'text-2xl'},
    {x:'25%', delay:'0.7s', size:'text-xl'},
    {x:'35%', delay:'1.4s', size:'text-2xl'},
    {x:'45%', delay:'0.3s', size:'text-xl'},
    {x:'55%', delay:'1.1s', size:'text-2xl'},
  ];

  return (
    <div className="relative rounded-2xl shadow-2xl p-6 mb-8 overflow-hidden"
         style={{background:'linear-gradient(135deg, #8B0000 0%, #c8102e 40%, #A00020 70%, #8B0000 100%)'}}>
      <style>{SHARED_CSS + `
        @keyframes firework-pop {
          0%   { transform: scale(0) translateY(0); opacity: 1; }
          50%  { transform: scale(1.4) translateY(-30px); opacity: 1; }
          100% { transform: scale(0.8) translateY(-50px); opacity: 0; }
        }
        @keyframes flag-flutter {
          0%   { clip-path: polygon(0 0, 100% 5%, 100% 95%, 0 100%); }
          25%  { clip-path: polygon(0 3%, 100% 0, 100% 100%, 0 97%); }
          50%  { clip-path: polygon(0 0, 100% 5%, 100% 95%, 0 100%); }
          75%  { clip-path: polygon(0 5%, 100% 0, 100% 100%, 0 95%); }
          100% { clip-path: polygon(0 0, 100% 5%, 100% 95%, 0 100%); }
        }
        @keyframes star-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .firework-pop { animation: firework-pop 2s ease-out infinite; }
        .flag-flutter { animation: flag-flutter 1.5s ease-in-out infinite; }
      `}</style>

      {/* Gold diagonal stripes */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: `repeating-linear-gradient(135deg, transparent 0px, transparent 15px, rgba(255,205,0,1) 15px, rgba(255,205,0,1) 17px)`
      }}/>

      {/* Right side — Vietnamese flag SVG + fireworks */}
      <div className="absolute right-0 top-0 bottom-0 w-5/12 overflow-hidden">
        {/* Fireworks */}
        {fireworks.map((f, i) => (
          <div key={i} className="firework-pop absolute text-yellow-300"
               style={{left: f.x, top: '20%', animationDelay: f.delay, fontSize: f.size === 'text-2xl' ? '1.5rem' : '1.25rem'}}>
            {'✦'}
          </div>
        ))}

        {/* Vietnamese Flag */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2" style={{width: 120, height: 80}}>
          {/* Flagpole */}
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded"
               style={{background:'linear-gradient(to bottom, #d4af37, #8B6914, #d4af37)'}}/>
          {/* Flag body */}
          <div className="absolute left-1 top-0 bottom-0 flag-flutter rounded-r-sm"
               style={{width: 119, background: '#c8102e', right: 0}}>
            {/* 5-point star */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 40 40" width="40" height="40" className="glow-gold">
                <polygon points="20,2 24.9,15.5 39.5,15.5 27.8,24.4 32.7,38 20,29.2 7.3,38 12.2,24.4 0.5,15.5 15.1,15.5"
                         fill="#FFCD00"/>
              </svg>
            </div>
          </div>
          {/* Rope */}
          <div className="absolute left-0 top-0 w-1 h-2 rounded-t-full bg-yellow-600"/>
        </div>

        {/* Extra sparkles */}
        {[{t:'10%',r:'30%',d:'0.5s'},{t:'70%',r:'15%',d:'1.2s'},{t:'40%',r:'8%',d:'0.8s'}].map((s,i)=>(
          <div key={i} className="star-twinkle absolute text-yellow-300 text-lg"
               style={{top:s.t, right:s.r, animationDelay:s.d}}>✦</div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[60%]">
        <p className="text-yellow-300 text-sm font-bold tracking-widest mb-2 uppercase"
           style={{textShadow:'0 0 8px rgba(255,205,0,0.8)'}}>
          {headline}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg leading-tight">
          Chào mừng, {user.firstName}!
        </h1>
        <p className="text-red-200 mt-1 text-base italic">{subline}</p>
        <p className="text-red-100 text-sm mt-1">{user.position} · {departmentName}</p>

        <div className="flex items-center mt-3 space-x-2 flex-wrap gap-y-2">
          <span className={`px-3 py-1 ${badgeColor} rounded-full text-sm font-bold shadow-lg`}>
            🏷️ {user.employeeCode}
          </span>
          {user.subDepartment && (
            <span className="px-3 py-1 border border-yellow-400 text-yellow-300 rounded-full text-sm">
              {user.subDepartment.toUpperCase()}
            </span>
          )}
          <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium shadow-lg">
            🌟 {user.employeeStatus || 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* Date/time */}
      <div className="absolute bottom-3 right-4 text-right text-white z-10">
        <p className="text-2xl font-bold" style={{textShadow:'0 0 6px rgba(255,205,0,0.5)'}}>
          {time.toLocaleDateString('vi-VN')}
        </p>
        <p className="text-sm text-red-200">{time.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</p>
      </div>

      {/* Corner decoration */}
      <div className="absolute top-2 left-2 text-2xl">🎆</div>
      <div className="absolute bottom-2 left-2 text-xl opacity-70">⭐</div>
    </div>
  );
};

// ─── Default Banner ───────────────────────────────────────────────────────────
const DefaultBanner: React.FC<Props> = ({ user, departmentName }) => (
  <div className="relative bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 rounded-2xl shadow-xl p-6 mb-8 overflow-hidden">
    <div className="absolute inset-0 opacity-10" style={{
      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.05) 15px, rgba(255,255,255,0.05) 30px)`
    }}/>
    <div className="relative z-10 flex items-center justify-between">
      <div>
        <p className="text-blue-200 text-sm font-medium tracking-wider mb-1">🌟 HỆ THỐNG ERP AN BÌNH FOODS</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Chào mừng, {user.firstName}!</h1>
        <p className="text-blue-100 text-lg mt-1">{user.position} · {departmentName}</p>
        <div className="flex items-center mt-3 space-x-2 flex-wrap gap-y-2">
          <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg">🏷️ {user.employeeCode}</span>
          {user.subDepartment && (
            <span className="px-3 py-1 bg-blue-600 border border-blue-300 text-white rounded-full text-sm">{user.subDepartment.toUpperCase()}</span>
          )}
          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium shadow-lg">🌟 {user.employeeStatus || 'ACTIVE'}</span>
        </div>
      </div>
    </div>
    <div className="absolute bottom-3 right-4 text-right text-white z-10">
      <p className="text-2xl font-bold">{new Date().toLocaleDateString('vi-VN')}</p>
      <p className="text-sm text-blue-200">{new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</p>
    </div>
    <div className="absolute top-2 left-2 text-2xl">🏢</div>
  </div>
);

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * HolidayBanner — Banner lễ tết tái sử dụng được.
 *
 * - Hiển thị sớm 7 ngày trước mỗi dịp lễ (tự động)
 * - User có thể chọn banner thủ công bằng dropdown góc phải (lưu localStorage)
 * - `forceHoliday` prop override cả hai (dùng khi test từ ngoài)
 */
const HolidayBanner: React.FC<Props> = ({ user, departmentName, forceHoliday }) => {
  // Đọc override từ localStorage (mặc định 'auto')
  const [override, setOverride] = useState<HolidayType | 'auto'>(() => loadBannerOverride());

  // Tính holiday thực tế: forceHoliday (prop) > override (localStorage) > auto-detect
  const holiday: HolidayType = forceHoliday ?? (override === 'auto' ? detectHoliday() : override);

  const bannerProps = { user, departmentName };

  const renderBanner = () => {
    switch (holiday) {
      case 'tet':        return <TetBanner {...bannerProps}/>;
      case 'liberation': return <LiberationBanner {...bannerProps} type="liberation"/>;
      case 'labor':      return <LiberationBanner {...bannerProps} type="labor"/>;
      default:           return <DefaultBanner {...bannerProps}/>;
    }
  };

  return (
    <div>
      {/* Picker chỉ hiện khi không bị force từ prop */}
      {!forceHoliday && (
        <BannerPicker value={override} onChange={setOverride}/>
      )}
      {renderBanner()}
    </div>
  );
};

export default HolidayBanner;
