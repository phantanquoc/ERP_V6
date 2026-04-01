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

// ─── DEFAULT BANNER — Fruit Basket Game ──────────────────────────────────────
const FRUIT_TYPES = ['watermelon', 'orange', 'grape', 'mango', 'strawberry'] as const;
type FruitType = typeof FRUIT_TYPES[number];

interface GameFruit {
  id: number;
  x: number;       // px từ left của banner
  y: number;       // px từ top
  vx: number;      // velocity x px/frame
  vy: number;      // velocity y px/frame
  size: number;
  type: FruitType;
  rotation: number;
  rotSpeed: number;
  bounced: boolean; // đã tưng khỏi vùng text chưa
  caught: boolean;
  catchFlash: number; // countdown frames cho hiệu ứng bắt được
}

const BASKET_W = 70;
const BASKET_H = 36;
const GRAVITY  = 0.09;   // rơi chậm, nhẹ nhàng
// Vùng text content chiếm ~0–58% width (max-w-[58%])
const TEXT_ZONE_RIGHT_PCT = 0.58;

let fruitIdCounter = 0;

function spawnFruit(bannerW: number, _bannerH: number): GameFruit {
  const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  const size = 36 + Math.floor(Math.random() * 20); // 36–55px
  return {
    id: fruitIdCounter++,
    x: size + Math.random() * (bannerW - size * 2),
    y: -size,
    vx: (Math.random() - 0.5) * 0.8,   // ít lệch ngang khi spawn
    vy: 0.4 + Math.random() * 0.5,     // rơi chậm: 0.4–0.9 px/frame
    size,
    type,
    rotation: 0,
    rotSpeed: (Math.random() - 0.5) * 2.5,  // xoay nhẹ hơn
    bounced: false,
    caught: false,
    catchFlash: 0,
  };
}

const DefaultBanner: React.FC<Props> = ({ user, departmentName }) => {
  const now = useClock();
  const h = now.getHours();
  const greeting = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const bannerRef  = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const fruitsRef  = useRef<GameFruit[]>([]);
  const basketXRef = useRef<number>(-999);   // -999 = chuột chưa vào banner
  const scoreRef   = useRef<number>(0);
  const [score, setScore]           = useState(0);
  const [gameActive, setGameActive] = useState(false);

  // Spawn fruit theo interval khi game active
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSpawning = useCallback(() => {
    if (spawnRef.current) return;
    spawnRef.current = setInterval(() => {
      const banner = bannerRef.current;
      if (!banner) return;
      const { width, height } = banner.getBoundingClientRect();
      fruitsRef.current.push(spawnFruit(width, height));
      // Giới hạn tối đa 12 fruit cùng lúc
      if (fruitsRef.current.length > 12) fruitsRef.current.splice(0, 1);
    }, 1200);
  }, []);

  const stopSpawning = useCallback(() => {
    if (spawnRef.current) { clearInterval(spawnRef.current); spawnRef.current = null; }
  }, []);

  // Game loop — canvas rendering + physics
  useEffect(() => {
    const canvas = canvasRef.current;
    const banner = bannerRef.current;
    if (!canvas || !banner) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Offscreen SVG → ImageBitmap cache cho mỗi loại+size fruit
    // Dùng Path2D vẽ trực tiếp trên canvas (đơn giản hơn)
    const drawFruitOnCanvas = (ctx: CanvasRenderingContext2D, f: GameFruit) => {
      ctx.save();
      ctx.translate(f.x + f.size / 2, f.y + f.size / 2);
      ctx.rotate((f.rotation * Math.PI) / 180);
      const r = f.size / 2;
      if (f.catchFlash > 0) {
        ctx.shadowColor = 'rgba(255,240,80,0.95)';
        ctx.shadowBlur  = 18;
        ctx.globalAlpha = 0.5 + (f.catchFlash / 12) * 0.5;
      }
      const t = f.type;
      if (t === 'watermelon') {
        // rind
        ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fillStyle = '#4CAF50'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.85, Math.PI, 0); ctx.fillStyle = '#81C784'; ctx.fill();
        // flesh
        ctx.beginPath(); ctx.arc(0, 0, r * 0.75, Math.PI, 0); ctx.fillStyle = '#EF5350'; ctx.fill();
        // seeds
        ctx.fillStyle = '#1B5E20';
        [[-r*0.3, -r*0.25], [0, -r*0.38], [r*0.3, -r*0.25]].forEach(([sx, sy]) => {
          ctx.beginPath(); ctx.ellipse(sx, sy, r*0.07, r*0.12, -0.18, 0, Math.PI*2); ctx.fill();
        });
      } else if (t === 'orange') {
        const grad = ctx.createRadialGradient(-r*0.25, -r*0.3, 0, 0, 0, r);
        grad.addColorStop(0, '#FFCA28'); grad.addColorStop(1, '#FF8F00');
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = '#E65100'; ctx.lineWidth = 0.5; ctx.globalAlpha *= 0.35;
        for (let a = 0; a < 6; a++) {
          ctx.beginPath(); ctx.moveTo(0,0);
          ctx.lineTo(r * Math.cos(a*60*Math.PI/180), r * Math.sin(a*60*Math.PI/180));
          ctx.stroke();
        }
        ctx.globalAlpha = f.catchFlash > 0 ? 0.5 + (f.catchFlash/12)*0.5 : 1;
        // leaf
        ctx.fillStyle = '#388E3C';
        ctx.beginPath(); ctx.ellipse(r*0.1, -r*0.85, r*0.18, r*0.35, -0.5, 0, Math.PI*2); ctx.fill();
      } else if (t === 'grape') {
        const positions = [
          [0, r*0.45],[r*-0.32,r*0.18],[r*0.32,r*0.18],
          [r*-0.55,-r*0.1],[0,-r*0.1],[r*0.55,-r*0.1],
          [r*-0.32,-r*0.38],[r*0.32,-r*0.38],[0,-r*0.55],
        ];
        positions.forEach(([gx,gy]) => {
          ctx.beginPath(); ctx.arc(gx, gy, r*0.28, 0, Math.PI*2);
          ctx.fillStyle = '#7B1FA2'; ctx.fill();
          ctx.beginPath(); ctx.arc(gx - r*0.08, gy - r*0.08, r*0.09, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill();
        });
        ctx.fillStyle = '#43A047';
        ctx.beginPath(); ctx.ellipse(r*0.2, -r*0.72, r*0.14, r*0.28, 0.6, 0, Math.PI*2); ctx.fill();
      } else if (t === 'mango') {
        const grad = ctx.createRadialGradient(-r*0.2, -r*0.3, 0, 0, 0, r);
        grad.addColorStop(0, '#FFCC02'); grad.addColorStop(0.6, '#FF8F00'); grad.addColorStop(1, '#E65100');
        ctx.beginPath();
        ctx.moveTo(0, r);
        ctx.bezierCurveTo(-r, r, -r*1.1, -r*0.5, 0, -r);
        ctx.bezierCurveTo(r*1.1, -r*0.5, r, r, 0, r);
        ctx.fillStyle = grad; ctx.fill();
        ctx.fillStyle = '#43A047';
        ctx.beginPath(); ctx.ellipse(r*0.1, -r*0.92, r*0.1, r*0.22, 0.4, 0, Math.PI*2); ctx.fill();
      } else { // strawberry
        const grad = ctx.createRadialGradient(-r*0.2, -r*0.25, 0, 0, 0, r);
        grad.addColorStop(0, '#FF6B6B'); grad.addColorStop(1, '#C62828');
        ctx.beginPath();
        ctx.moveTo(0, r);
        ctx.bezierCurveTo(-r*1.1, r*0.3, -r*1.0, -r*0.3, -r*0.5, -r*0.5);
        ctx.bezierCurveTo(-r*0.2, -r*0.9, r*0.2, -r*0.9, r*0.5, -r*0.5);
        ctx.bezierCurveTo(r*1.0, -r*0.3, r*1.1, r*0.3, 0, r);
        ctx.fillStyle = grad; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,200,0.75)';
        [[r*-0.25,r*0.15],[r*0.25,r*0.15],[0,-r*0.1],[r*-0.15,r*0.45],[r*0.15,r*0.45]].forEach(([sx,sy]) => {
          ctx.beginPath(); ctx.ellipse(sx, sy, r*0.05, r*0.08, -0.18, 0, Math.PI*2); ctx.fill();
        });
        ctx.fillStyle = '#388E3C';
        ctx.beginPath(); ctx.ellipse(0, -r*0.75, r*0.1, r*0.28, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    };

    const drawBasket = (ctx: CanvasRenderingContext2D, bx: number, by: number) => {
      const w = BASKET_W, h = BASKET_H;
      ctx.save();
      ctx.translate(bx, by);
      // Thân giỏ
      ctx.beginPath();
      ctx.moveTo(-w/2, -h/2);
      ctx.lineTo(-w/2 + 6, h/2);
      ctx.lineTo(w/2 - 6, h/2);
      ctx.lineTo(w/2, -h/2);
      ctx.closePath();
      // Gradient nan tre
      const bg = ctx.createLinearGradient(0, -h/2, 0, h/2);
      bg.addColorStop(0, '#8B5E3C'); bg.addColorStop(1, '#5D3A1A');
      ctx.fillStyle = bg; ctx.fill();
      // Đan giỏ — ngang
      ctx.strokeStyle = 'rgba(255,200,120,0.35)'; ctx.lineWidth = 1;
      for (let row = 1; row < 4; row++) {
        const y = -h/2 + (h / 4) * row;
        const shrink = (row / 4) * 6;
        ctx.beginPath(); ctx.moveTo(-w/2 + shrink, y); ctx.lineTo(w/2 - shrink, y); ctx.stroke();
      }
      // Đan giỏ — chéo
      ctx.strokeStyle = 'rgba(255,200,120,0.2)'; ctx.lineWidth = 0.8;
      for (let col = -3; col <= 3; col++) {
        ctx.beginPath();
        ctx.moveTo(col * (w/7), -h/2);
        ctx.lineTo(col * (w/7) - 4, h/2);
        ctx.stroke();
      }
      // Viền miệng giỏ
      const rimG = ctx.createLinearGradient(-w/2, 0, w/2, 0);
      rimG.addColorStop(0,'#D4A853'); rimG.addColorStop(0.5,'#F0C878'); rimG.addColorStop(1,'#D4A853');
      ctx.fillStyle = rimG;
      ctx.beginPath(); ctx.roundRect(-w/2 - 2, -h/2 - 5, w + 4, 10, 4); ctx.fill();
      // Quai giỏ
      ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w/4, -h/2 - 4);
      ctx.quadraticCurveTo(0, -h/2 - 22, w/4, -h/2 - 4);
      ctx.stroke();
      ctx.restore();
    };

    let lastSpawn = 0;
    const loop = (ts: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width  = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const bx = basketXRef.current;
      const by = height - 14; // basket y (bottom of banner)
      const textZoneRight = width * TEXT_ZONE_RIGHT_PCT;

      // Auto-spawn khi game active
      if (gameActive && ts - lastSpawn > 1400) {
        fruitsRef.current.push(spawnFruit(width, height));
        if (fruitsRef.current.length > 14) fruitsRef.current.splice(0, 1);
        lastSpawn = ts;
      }

      // Physics update
      fruitsRef.current = fruitsRef.current.filter(f => {
        if (f.caught) return false;
        f.vy += GRAVITY;
        f.vx *= 0.994;  // cản không khí nhẹ theo chiều ngang
        f.x  += f.vx;
        f.y  += f.vy;
        f.rotation += f.rotSpeed;

        // Wall bounce — giảm tốc một chút mỗi lần chạm tường
        if (f.x < 0) {
          f.x  = 0;
          f.vx = Math.abs(f.vx) * 0.75;
        }
        if (f.x + f.size > width) {
          f.x  = width - f.size;
          f.vx = -Math.abs(f.vx) * 0.75;
        }

        // Tưng khỏi vùng text (cạnh phải của khối text ~58% width)
        // Trái cây chạm vào cạnh phải vùng text → tưng sang PHẢI + nảy lên nhẹ
        const fruitRight = f.x + f.size;
        const fruitLeft  = f.x;
        if (
          !f.bounced &&
          fruitRight > textZoneRight && fruitLeft < textZoneRight &&
          f.y + f.size > height * 0.15 && f.y < height * 0.90 &&
          f.vx < 0  // đang đi sang trái mới cần đẩy ngược
        ) {
          // Đẩy ra khỏi vùng text về phía phải
          f.x  = textZoneRight - f.size + 1;
          f.vx = 1.2 + Math.random() * 1.4;     // tưng sang PHẢI
          f.vy = -(Math.abs(f.vy) * 0.55 + 0.5); // nảy lên nhẹ
          f.rotSpeed = (Math.random() - 0.3) * 3; // xoay thêm khi va
          f.bounced = true;
        }

        // Basket catch — chỉ khi basket hiện (bx >= 0)
        if (bx >= 0) {
          const basketTop  = by - BASKET_H / 2;
          const basketLeft = bx - BASKET_W / 2;
          const fruitCx    = f.x + f.size / 2;
          const fruitBot   = f.y + f.size;
          if (
            fruitCx > basketLeft && fruitCx < basketLeft + BASKET_W &&
            fruitBot > basketTop && fruitBot < basketTop + BASKET_H + 8 &&
            f.vy > 0
          ) {
            f.caught = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            return false;
          }
        }

        // Remove khi rơi ra ngoài
        return f.y < height + 80;
      });

      // Draw fruits
      fruitsRef.current.forEach(f => {
        if (f.catchFlash > 0) f.catchFlash--;
        drawFruitOnCanvas(ctx, f);
      });

      // Draw basket khi chuột trong banner
      if (bx >= 0) {
        drawBasket(ctx, bx, by);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameActive]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = bannerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    basketXRef.current = x;
    if (!gameActive) {
      setGameActive(true);
      startSpawning();
    }
  }, [gameActive, startSpawning]);

  const handleMouseLeave = useCallback(() => {
    basketXRef.current = -999;
  }, []);

  useEffect(() => () => {
    stopSpawning();
    cancelAnimationFrame(rafRef.current);
  }, [stopSpawning]);

  return (
    <div
      ref={bannerRef}
      className="relative rounded-2xl overflow-hidden shadow-xl mb-8"
      style={{ minHeight: 148, cursor: gameActive ? 'none' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
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
        .leaf-sway { animation: leaf-sway 4s ease-in-out infinite; transform-origin: 50% 0%; }
        .sl { animation: slide-l 0.5s ease both; }
        .fu { animation: fade-u  0.5s ease both; }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #052e16 100%)' }}/>
      <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full opacity-20"
           style={{ background: 'radial-gradient(circle, #4ade80 0%, transparent 70%)', animation: 'blob-drift 9s ease-in-out infinite' }}/>
      <div className="absolute -bottom-20 right-20 w-80 h-80 rounded-full opacity-15"
           style={{ background: 'radial-gradient(circle, #fb923c 0%, transparent 70%)', animation: 'blob-drift 12s ease-in-out infinite reverse' }}/>
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }}/>

      {/* Decorative leaf */}
      <svg className="leaf-sway absolute right-4 top-0 opacity-20 pointer-events-none" width="60" height="80" viewBox="0 0 60 80" style={{ zIndex: 1 }}>
        <path d="M30 0 Q55 20 50 50 Q40 70 30 80 Q20 70 10 50 Q5 20 30 0Z" fill="#16a34a"/>
        <path d="M30 0 Q30 30 30 80" stroke="#15803d" strokeWidth="1.5" fill="none" opacity="0.6"/>
      </svg>

      {/* Game canvas — fruit + basket render here */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 2, pointerEvents: 'none' }}
      />

      {/* Score */}
      {gameActive && (
        <div className="absolute top-2 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
             style={{ zIndex: 10, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}>
          <span style={{ fontSize: 14 }}>🧺</span>
          <span className="text-white font-bold tabular-nums text-sm">{score}</span>
          <span className="text-green-300 text-xs">quả</span>
        </div>
      )}

      {/* Hint khi chưa chơi */}
      {!gameActive && (
        <div className="absolute bottom-8 right-6 text-xs pointer-events-none"
             style={{ zIndex: 10, color: 'rgba(134,239,172,0.55)' }}>
          🧺 Di chuột vào để hứng trái cây
        </div>
      )}

      {/* Content — z-10 luôn trên canvas */}
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

  // Mỗi burst dùng một confetti instance riêng trên canvas chung
  // → animation cũ không bị hủy, burst mới chạy song song
  const fireConfetti = useCallback(() => {
    if (!canvasRef.current) return;
    const shoot = confetti.create(canvasRef.current, { resize: true, useWorker: false });

    // Palette đa dạng — mỗi burst chọn ngẫu nhiên subset màu
    const allColors = ['#FFCD00','#FFD700','#FFF176','#ffffff','#FF6B6B','#FF8F00','#69F0AE','#40C4FF','#EA80FC'];
    const pickColors = () => allColors.filter(() => Math.random() > 0.35);

    // Sinh một burst với tham số ngẫu nhiên hoàn toàn
    const randomBurst = (delayMs: number) => {
      setTimeout(() => {
        shoot({
          particleCount: 18 + Math.floor(Math.random() * 30),   // 18–47
          angle:  100 + Math.random() * 60,                       // 100°–160°
          spread:  40 + Math.random() * 40,                       // 40°–80°
          origin: {
            x: 0.60 + Math.random() * 0.38,                      // 60%–98% ngang
            y: 0.05 + Math.random() * 0.55,                      // 5%–60% dọc
          },
          colors:  pickColors(),
          ticks:   140 + Math.floor(Math.random() * 100),        // 140–240
          gravity: 0.65 + Math.random() * 0.45,                  // 0.65–1.1
          scalar:  0.70 + Math.random() * 0.40,                  // 0.70–1.10
          drift:   (Math.random() - 0.5) * 0.6,                  // trôi ngang nhẹ
        });
      }, delayMs);
    };

    // 3–5 đợt bắn lệch thời gian → nhìn tự nhiên, không đồng bộ với lần click trước
    const bursts = 3 + Math.floor(Math.random() * 3);
    for (let b = 0; b < bursts; b++) {
      randomBurst(b === 0 ? 0 : 200 + Math.floor(Math.random() * 500) * b);
    }
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
