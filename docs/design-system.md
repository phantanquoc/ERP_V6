# Design System — ERP An Binh Foods

## Overview

ERP An Binh Foods uses a **cool neutral base** (`gray-50` → `gray-900`) with **blue-600 `#2563EB`** as the primary action color. Success/warning/danger/info are reserved for semantic state. The layout is **compact 8px rhythm, card-based, with dense bordered tables** optimized for scan speed. All tokens encode `openspec/ui-dna.md`; no additional CSS framework was introduced.

- **Source of truth:** `frontend/src/design-system/tokens.ts`
- **DNA principles:** `openspec/ui-dna.md`
- **Global resets:** `frontend/src/index.css` (`@layer base`)
- **Tailwind binding:** `frontend/tailwind.config.js` (`theme.extend` + `safelist`)

---

## Design Tokens

Source: `frontend/src/design-system/tokens.ts`

### Color Palette

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `colors.primary` | `#2563EB` | `blue-600` | Primary CTA, links, `focus-visible` ring |
| `colors.primaryHover` | `#1D4ED8` | `blue-700` | Hover state for primary |
| `colors.primaryLight` | `#EFF6FF` | `blue-50` | Subtle primary background |
| `colors.success` | `#10B981` | `emerald-500` | Success state, completed |
| `colors.warning` | `#F59E0B` | `amber-500` | Warning, pending |
| `colors.danger` | `#EF4444` | `red-500` | Destructive, error, reject |
| `colors.info` | `#06B6D4` | `cyan-500` | Technical domain, informational |
| `colors.purple` | `#8B5CF6` | `violet-500` | Accent / quality domain |
| `colors.neutral.50` | `#F9FAFB` | `gray-50` | Page background tint |
| `colors.neutral.100` | `#F3F4F6` | `gray-100` | Hover / zebra row |
| `colors.neutral.200` | `#E5E7EB` | `gray-200` | Card border, divider |
| `colors.neutral.300` | `#D1D5DB` | `gray-300` | Hover border |
| `colors.neutral.400` | `#9CA3AF` | `gray-400` | Muted icon / placeholder |
| `colors.neutral.500` | `#6B7280` | `gray-500` | Secondary text, labels |
| `colors.neutral.600` | `#4B5563` | `gray-600` | Body text |
| `colors.neutral.700` | `#374151` | `gray-700` | Section title |
| `colors.neutral.800` | `#1F2937` | `gray-800` | Page title, card value |
| `colors.neutral.900` | `#111827` | `gray-900` | High-contrast text |

#### Domain Accent

Icon/dot tint only — card shell stays neutral (`bg-white border-gray-200`).

| Domain | Class |
|---|---|
| `technical` | `text-cyan-500` |
| `quality` | `text-violet-500` |
| `accounting` | `text-orange-500` |
| `common` | `text-blue-500` |
| `dashboard` | `text-blue-600` |

```ts
import { domainAccent } from '@/design-system/tokens';
// <span className={domainAccent.technical}><Wrench /></span>
```

#### Chart Palettes

| Palette | Colors (in order) | Domain |
|---|---|---|
| `chartPalettes.product` | `#3B82F6`, `#10B981`, `#F59E0B`, `#EF4444`, `#8B5CF6`, `#EC4899`, `#6B7280`, `#14B8A6` | Product breakdown (max 8 slices) |
| `chartPalettes.inspection` | `#EF4444`, `#F59E0B`, `#3B82F6`, `#10B981` | Inspection results (fail → pass) |
| `chartPalettes.status` | `#10B981`, `#F59E0B`, `#EF4444`, `#6B7280`, `#3B82F6`, `#8B5CF6` | Generic status |

```ts
import { chartPalettes, chartHeights } from '@/design-system/tokens';
<ResponsiveContainer height={chartHeights.donut}> {/* 200 */} </ResponsiveContainer>
```

| Token | Value | Chart type |
|---|---|---|
| `chartHeights.donut` | `200` | Donut / pie |
| `chartHeights.line` | `260` | Line / area |
| `chartHeights.bar` | `260` | Bar / column |

### Spacing Scale — 8px Rhythm

`1 Tailwind unit = 4px`. Prefer Tailwind classes directly; the `spacing` object is the reference, not a runtime import.

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `spacing.xs` | `4px` | `p-1` / `gap-1` | Tightest gap, badge padding |
| `spacing.sm` | `8px` | `p-2` / `gap-2` | Base rhythm, KPI row gap on mobile |
| `spacing.md` | `16px` | `p-4` / `gap-4` | Card padding `sm:`, bento gap base |
| `spacing.lg` | `24px` | `p-6` / `gap-6` | Page padding `sm:` |
| `spacing.xl` | `32px` | `p-8` / `gap-8` | Modal sections, large breaks |

### Radii

| Token | Value | Tailwind (`borderRadius`) |
|---|---|---|
| `radii.sm` | `6px` | `rounded-sm` |
| `radii.md` | `8px` | `rounded-md` |
| `radii.lg` | `12px` | `rounded-lg` — cards, chart/section shells |
| `radii.xl` | `16px` | `rounded-xl` |

### Shadows

| Token | Value | Tailwind (`boxShadow`) | Usage |
|---|---|---|---|
| `shadows.card` | `0 1px 3px rgba(0,0,0,0.08)` | `shadow-card` | Default card |
| `shadows.cardHover` | `0 4px 12px rgba(0,0,0,0.10)` | `shadow-cardHover` | Card hover |
| `shadows.floating` | `0 8px 24px rgba(0,0,0,0.12)` | `shadow-floating` | Modal, chat panel, dropdown |

### Shell (Card / Section / Chart Containers)

```ts
import { shell, sectionGap } from '@/design-system/tokens';
```

| Token | Classes | Notes |
|---|---|---|
| `shell.card` | `bg-white border border-gray-200 rounded-lg shadow-sm` | Pair with `p-3 sm:p-4` in consumer |
| `shell.cardHover` | `hover:border-gray-300 hover:shadow-md transition-all duration-200` | Non-interactive hover |
| `shell.cardInteractive` | `cursor-pointer hover:border-gray-300 hover:shadow-md transition-all duration-200` | Clickable card |
| `shell.sectionCard` | `bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4` | Includes padding |
| `shell.chartCard` | `bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4` | Light chart wrapper |
| `shell.chartCardDark` | `bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-sm p-3 sm:p-4` | Dark variant, inner slot `bg-slate-700/50 rounded-lg p-3` |

| Token | Classes | Usage |
|---|---|---|
| `sectionGap.bento` | `gap-4 sm:gap-5` | Bento / 2-col dashboard grids (`16px` → `20px`) |
| `sectionGap.kpi` | `gap-2 sm:gap-3` | KPI row (`8px` → `12px`) |

### Typography

| Token | Classes | Usage |
|---|---|---|
| `typography.pageTitle` | `text-xl font-bold text-gray-800` | `PageHeader` heading |
| `typography.pageSubtitle` | `text-xs text-gray-400 mt-0.5` | `PageHeader` description |
| `typography.sectionTitle` | `text-sm font-semibold text-gray-700` | `SectionCard` / `ChartCard` title |
| `typography.cardValue` | `text-xl sm:text-2xl font-bold text-gray-800` | `KpiCard` value (responsive) |
| `typography.cardLabel` | `text-xs font-medium text-gray-500` | `KpiCard` label |
| `typography.cardSub` | `text-xs text-gray-400` | `KpiCard` subline |

---

## Component Gallery

All components live in `frontend/src/design-system/`. Import via `@/design-system/<Component>` or barrel.

### PageHeader

**Purpose:** Page identity + actions row; always the first element on a page.

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | `string` | yes | — | Clamped to 2 lines (`line-clamp-2 break-words`) |
| `description` | `string` | no | — | `text-xs text-gray-400 mt-0.5` |
| `icon` | `ReactNode` | no | — | Rendered left of title, `shrink-0` |
| `actions` | `ReactNode` | no | — | Right-aligned, `flex flex-wrap gap-2` |
| `breadcrumb` | `ReactNode` | no | — | Rendered above title with `mb-1` |

```tsx
import { PageHeader } from '@/design-system/PageHeader';
import { Button } from '@/components/ui/Button'; // or design-system Button when available

<PageHeader
  title="Kho thanh phẩm"
  description="Theo dõi tồn kho theo kiện"
  icon={<Package className="w-5 h-5 text-blue-600" />}
  breadcrumb={<Breadcrumbs />}
  actions={<Button onClick={openCreate}>Tạo phiếu</Button>}
/>
```

*Visual:* Bold `text-xl` title with optional icon, muted subtitle underneath, actions pinned right. Layout `flex flex-wrap items-start justify-between gap-3 sm:gap-4 gap-y-2 mb-5`. Wraps on mobile, actions never overlap title.

---

### KpiCard

**Purpose:** Single metric tile with optional trend delta and sub-count pills; supports navigation.

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `label` | `string` | yes | — | `text-xs font-medium text-gray-500`, `line-clamp-2`, shown as `title` on hover |
| `value` | `number \| string` | yes | — | `text-xl sm:text-2xl font-bold text-gray-800`, `truncate` |
| `sub` | `string` | no | — | Muted line under value `text-xs text-gray-400 mt-1` |
| `icon` | `ReactNode` | no | — | Tinted by `tone` |
| `tone` | `blue \| green \| purple \| orange \| cyan \| red \| amber \| gray` | no | `blue` | Maps: `blue→text-blue-500`, `green→text-emerald-500`, `purple→text-violet-500`, `orange→text-orange-500`, `cyan→text-cyan-500`, `red→text-red-500`, `amber→text-amber-500`, `gray→text-gray-400` |
| `to` | `string` | no | — | If set, renders as `<button>` with `navigate(to)`, hover border/shadow, `aria-label` auto-built |
| `dot` | `string` | no | — | Tailwind bg class for `w-2.5 h-2.5 rounded-full` pulse dot (e.g. `bg-emerald-500`) |
| `loading` | `boolean` | no | `false` | Shows `h-7 w-24 bg-gray-200 rounded animate-pulse` |
| `delta` | `number \| null` | no | — | `>0` red-600 + `TrendingUp`, `<0` green-600 + `TrendingDown`, `0/null` gray + `Minus` |
| `deltaLabel` | `string` | no | — | Suffix next to delta e.g. `vs tháng trước` |
| `subCounts` | `{ label, count, tone?: red\|yellow\|green\|blue\|gray }[]` | no | — | Pill row `rounded-full border bg-gray-50 px-1.5 py-0.5 text-[10px]` with `TONE_DOT` |
| `className` | `string` | no | — | Extra classes appended |

```tsx
import { KpiCard } from '@/design-system/KpiCard';
import { Package } from 'lucide-react';

<KpiCard
  label="Tổng tồn kho"
  value={1240}
  sub="12 kiện quá hạn"
  icon={<Package className="w-4 h-4" />}
  tone="blue"
  to="/warehouse/lots"
  dot="bg-emerald-500"
  delta={8}
  deltaLabel="vs tháng trước"
  subCounts={[
    { label: 'Hết hạn', count: 3, tone: 'red' },
    { label: 'Sắp hết', count: 9, tone: 'yellow' },
  ]}
/>
```

*Visual:* White `border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm` card. Label row `flex gap-2`, value row with optional pulsing dot. Delta line `text-[11px]` with icon. Sub-count pills wrap. Interactive variant adds `hover:border-gray-300 hover:shadow-md` and is keyboard-focusable via button semantics.

---

### ChartCard

**Purpose:** Styled container for charts; handles title/link/action and light/dark variant.

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | `string` | yes | — | Linked if `to` is set |
| `to` | `string` | no | — | Wraps title in `<Link>` with hover `text-blue-600` (light) / `text-cyan-300` (dark) |
| `action` | `ReactNode` | no | — | Right-aligned in header row |
| `variant` | `light \| dark` | no | `light` | `dark` uses `shell.chartCardDark` + inner `bg-slate-700/50 rounded-lg p-3` |
| `children` | `ReactNode` | yes | — | Chart itself; control height via `chartHeights` |
| `className` | `string` | no | `""` | Appended to shell |
| `headingLevel` | `h2 \| h3 \| h4` | no | `h3` | Heading tag + `aria-labelledby`; container has `role="region"` |

```tsx
import { ChartCard } from '@/design-system/ChartCard';
import { chartHeights, chartPalettes } from '@/design-system/tokens';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

<ChartCard title="Tồn kho theo nhóm" to="/warehouse" action={<span className="text-xs text-gray-400">30 ngày</span>}>
  <ResponsiveContainer width="100%" height={chartHeights.donut}>
    <PieChart>
      <Pie data={data} dataKey="value" innerRadius={56} outerRadius={80}>
        {data.map((_, i) => <Cell key={i} fill={chartPalettes.product[i % chartPalettes.product.length]} />)}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
</ChartCard>

<ChartCard title="Cảnh báo hệ thống" variant="dark">
  <ul className="text-sm text-slate-200">...</ul>
</ChartCard>
```

*Visual:* Light = white card `p-3 sm:p-4` with `text-sm font-semibold text-gray-700` header row `flex justify-between mb-3`. Dark = `from-slate-700 to-slate-800` gradient, white title, inner content on `bg-slate-700/50`. Height is not fixed — consumer's `ResponsiveContainer height={chartHeights.*}` drives it.

---

### SectionCard

**Purpose:** Generic grouped-card / table / list container with optional header and padding control.

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | `string` | no | — | Rendered as `h3 text-sm font-semibold text-gray-700` |
| `icon` | `ReactNode` | no | — | `text-gray-400`, left of title |
| `action` | `ReactNode` | no | — | Right-aligned (e.g. link, button, filter) |
| `children` | `ReactNode` | yes | — | Card body |
| `className` | `string` | no | `""` | Outer shell |
| `bodyClassName` | `string` | no | `""` | Inner body wrapper |
| `padded` | `boolean` | no | `true` | `false` removes outer `p-3 sm:p-4` for edge-to-edge tables/lists |

```tsx
import { SectionCard } from '@/design-system/SectionCard';

<SectionCard title="Phiếu nhập gần đây" icon={<ClipboardList className="w-4 h-4" />} action={<Link to="/warehouse/receipts" className="text-xs text-blue-600">Xem tất cả</Link>}>
  <ReceiptList />
</SectionCard>

// Edge-to-edge table — control padding inside body
<SectionCard title="Chi tiết kiện" padded={false} bodyClassName="overflow-x-auto">
  <table className="w-full text-sm">...</table>
</SectionCard>
```

*Visual:* Same shell as `KpiCard`/`ChartCard` (`bg-white border-gray-200 rounded-lg shadow-sm`). Header `flex justify-between mb-3`. When `padded=false`, outer card has no padding so tables/lists bleed to the border; use `bodyClassName` for inner scroll wrappers.

---

### DataTable

**Status: not implemented as a design-system component.**

No `frontend/src/design-system/DataTable.tsx` exists. Dense ERP tables are built ad-hoc with Tailwind per `openspec/ui-dna.md`:

- Wrapper: `SectionCard` with `padded={false}` + `bodyClassName="overflow-x-auto"` for horizontal scroll.
- Table: `w-full text-sm border-collapse`, `th` with `bg-gray-50 font-semibold border border-gray-300 px-2 py-1.5`, `td` with `border border-gray-200 px-2 py-1.5`.
- Optional: `overflow-x-auto` on modal bodies for wide tables.

```tsx
// Recommended pattern until DataTable is added
import { SectionCard } from '@/design-system/SectionCard';

<SectionCard title="Danh sách nhân viên" padded={false} bodyClassName="overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-gray-50">
        <th className="text-left font-semibold text-gray-600 border px-2 py-1.5">Họ tên</th>
        <th className="text-left font-semibold text-gray-600 border px-2 py-1.5">Phòng ban</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(r => <tr key={r.id}><td className="border px-2 py-1.5">{r.name}</td><td className="border px-2 py-1.5">{r.dept}</td></tr>)}
    </tbody>
  </table>
</SectionCard>
```

---

### Button

**Status: not implemented as a design-system component.**

No `frontend/src/design-system/Button.tsx` exists. Buttons use the shared UI primitives in `frontend/src/components/ui/` and Tailwind conventions from `openspec/ui-dna.md`:

| Variant | Classes |
|---|---|
| Primary | `bg-blue-600 text-white hover:bg-blue-700 border-transparent rounded-lg` |
| Secondary | `bg-white text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg` |
| Ghost / tertiary | `bg-transparent text-gray-600 hover:bg-gray-100` |
| Danger | `bg-red-500 text-white hover:bg-red-600` |

All should include `inline-flex items-center gap-1.5 text-sm px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`.

```tsx
// Until design-system/Button ships, use the existing UI button or Tailwind directly
<button className="inline-flex items-center gap-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
  Lưu
</button>
```

---

### States — LoadingState, LoadingSkeleton, ErrorState, EmptyState

**Purpose:** Consistent loading / error / empty patterns per `openspec/ui-dna.md` empty-state voice.

#### LoadingState

| Prop | Type | Default |
|---|---|---|
| `message` | `string` | `Đang tải dữ liệu...` |

```tsx
import { LoadingState } from '@/design-system/States';
<LoadingState message="Đang tải danh sách..." />
```
*Visual:* Centered column `py-12 gap-3` with `w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin` and muted label. Has `role="status" aria-live="polite" aria-busy="true"`.

#### LoadingSkeleton

No props. Full-page skeleton mirroring header + 4 KPI cards + 2 chart areas (`animate-pulse` + `bg-gray-200`). Use for initial page loads.

```tsx
import { LoadingSkeleton } from '@/design-system/States';
if (isInitialLoading) return <LoadingSkeleton />;
```
*Visual:* Pulse blocks: header row (`h-6 w-48` + `h-3 w-64`), KPI grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5`, content grid `grid-cols-1 lg:grid-cols-2 gap-4` with `h-72` cards. `aria-hidden` on decoration, `role="status" aria-label="Đang tải..."`.

#### ErrorState

| Prop | Type | Default |
|---|---|---|
| `message` | `string` | `Không thể tải dữ liệu` |
| `onRetry` | `() => void` | — |

```tsx
import { ErrorState } from '@/design-system/States';
<ErrorState message="Không thể tải kho" onRetry={refetch} />
```
*Visual:* Centered `py-12`, `AlertTriangle w-10 h-10 text-red-400`, message `role="alert" text-sm text-gray-600`, retry button `inline-flex gap-1.5 text-sm text-blue-600 border bg-white rounded-lg px-3 py-1.5` with `RefreshCw` icon and `focus-visible:ring`.

#### EmptyState

| Prop | Type | Default |
|---|---|---|
| `message` | `string` | `Chưa có dữ liệu` |
| `description` | `string` | — |
| `action` | `ReactNode` | — |

```tsx
import { EmptyState } from '@/design-system/States';
<EmptyState message="Chưa có phiếu nhập" description="Tạo phiếu đầu tiên để bắt đầu theo dõi tồn kho." action={<Button>Tạo phiếu</Button>} />
```
*Visual:* Centered `py-10 text-center`, `w-12 h-12 rounded-full bg-gray-100` with `Inbox w-6 h-6 text-gray-400`, title `text-sm font-medium text-gray-600`, description `text-xs text-gray-400 mt-1 max-w-sm`, action `mt-4`.

---

### Progress — CircularProgress, ProgressBar, NavCard

#### CircularProgress

**Purpose:** Ring gauge for completion / score.

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `value` | `number` | yes | — | Clamped `0–100`, `aria-valuenow` |
| `size` | `number` | no | `100` | SVG width/height px |
| `strokeWidth` | `number` | no | `8` | Ring thickness |
| `color` | `string` | no | `#10B981` | Stroke color (use `colors.success` / token) |
| `label` | `string` | no | — | Rendered below ring `text-xs text-gray-400`; fallback `aria-label` is `${clamped}%` |

```tsx
import { CircularProgress } from '@/design-system/Progress';
<CircularProgress value={72} color="#2563EB" label="Hoàn thành" />
```
*Visual:* SVG ring with track `stroke="#e5e7eb"` and progress `strokeLinecap="round"` `strokeDashoffset` animated `0.8s ease`, centered bold `%` label. Container `role="progressbar"`.

#### ProgressBar

**Purpose:** Stacked segmented bar with legend.

| Prop | Type | Required | Default |
|---|---|---|---|
| `segments` | `{ label: string; value: number; color: string }[]` | yes | — |
| `total` | `number` | yes | — |
| `ariaLabel` | `string` | no | `Progress` |

```tsx
import { ProgressBar } from '@/design-system/Progress';
<ProgressBar
  total={320}
  ariaLabel="Tiến độ sản xuất"
  segments={[
    { label: 'Hoàn thành', value: 180, color: 'bg-emerald-500' },
    { label: 'Đang làm', value: 90, color: 'bg-amber-400' },
    { label: 'Chưa làm', value: 50, color: 'bg-gray-300' },
  ]}
/>
```
*Visual:* `flex h-5 rounded-full overflow-hidden gap-0.5 mb-3` with per-segment `width: (value/total)*100%`. Values render inside only when `pct > 8`. Legend `flex flex-wrap gap-x-4 gap-y-1` with `w-2.5 h-2.5 rounded-sm` swatches. Container `role="progressbar"` with `aria-valuenow` = sum of segments.

#### NavCard

**Purpose:** Navigational CTA card (e.g. dashboard shortcuts).

| Prop | Type | Required | Default |
|---|---|---|---|
| `title` | `string` | yes | — |
| `desc` | `string` | yes | — |
| `icon` | `ReactNode` | yes | — |
| `to` | `string` | yes | — |

```tsx
import { NavCard } from '@/design-system/Progress';
<NavCard title="Chấm công" desc="Ghi nhận giờ làm" icon={<Clock className="w-5 h-5" />} to="/attendance" />
```
*Visual:* `bg-white border-gray-200 rounded-lg p-4 shadow-sm hover:border-cyan-300 hover:shadow-md` button full-width, cyan `p-2 bg-cyan-50 rounded-lg` icon block (`group-hover:bg-cyan-100`), title `text-sm font-semibold text-gray-800` + desc `text-xs text-gray-400`, trailing `→` that turns `text-cyan-500` on hover. Includes `focus-visible:ring-cyan-500`.

---

## Layout & Responsive

Page chrome and grid patterns. Values derive from `tokens.ts` spacing/shell/sectionGap and `index.css`.

### Page Padding & Section Gaps

| Area | Classes | Px |
|---|---|---|
| Page container | `p-4 sm:p-6` | `16px` → `24px` (`spacing.md` → `spacing.lg`) |
| Card padding | `p-3 sm:p-4` | `12px` → `16px` (shell default; tighter than page) |
| Bento / dashboard grid | `gap-4 sm:gap-5` | `16px` → `20px` (`sectionGap.bento`) |
| KPI row | `gap-2 sm:gap-3` | `8px` → `12px` (`sectionGap.kpi`) |
| PageHeader bottom | `mb-5` | `20px` |
| Grouped sections | `space-y-4 sm:space-y-5` | Consistent with bento gap |

### Grid Patterns

```tsx
// KPI row — 2 cols mobile, 3 on md, 4 on lg
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
  <KpiCard ... /><KpiCard ... /><KpiCard ... /><KpiCard ... />
</div>

// Bento / dashboard — single col, 2 on lg
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
  <ChartCard ...>...</ChartCard>
  <SectionCard ...>...</SectionCard>
</div>

// KPI + charts skeleton mirrors the same grids (see LoadingSkeleton)
```

- Always use `min-w-0` on flex children that may overflow; `KpiCard`/`PageHeader` already handle this (`truncate`, `line-clamp-2`, `break-words`, `overflow-wrap: anywhere` on print).
- Wide tables scroll inside card, not the page: `SectionCard padded={false} bodyClassName="overflow-x-auto"`.
- Modal bodies scroll: `.modal-viewport-h` (`max-height: calc(100vh - 1rem)` / `calc(100dvh - 1rem)`, `sm: calc(100vh - 2rem)` / `calc(100dvh - 2rem)`), dvh fallback declared after vh so iOS Safari uses `dvh` when available.

---

## Accessibility

Implemented in `frontend/src/index.css` and component props.

| Concern | Implementation | File |
|---|---|---|
| Focus visible | `*:focus-visible { outline: 2px solid #2563EB; outline-offset: 2px }` — global, token `primary` | `index.css` `@layer base` |
| Focus on buttons/cards | `KpiCard` (when `to`), `NavCard`, `ErrorState` retry, and `ChartCard` links include `focus-visible:ring-*` and `ring-offset-2` | `KpiCard.tsx`, `Progress.tsx`, `States.tsx` |
| Reduced motion | Global: `*, *::before, *::after { animation-duration: 0.01ms; transition-duration: 0.01ms }` under `@media (prefers-reduced-motion: reduce)`. Marquee specifically disables animation and restores centered text in that query. | `index.css` |
| ARIA — loading | `LoadingState` → `role="status" aria-live="polite" aria-busy="true"`; `LoadingSkeleton` → `role="status" aria-label="Đang tải..." aria-busy="true"` | `States.tsx` |
| ARIA — error | `ErrorState` message has `role="alert"` | `States.tsx` |
| ARIA — progress | `CircularProgress` and `ProgressBar` → `role="progressbar"` with `aria-valuenow/min/max/label` | `Progress.tsx` |
| ARIA — region | `ChartCard` → `role="region" aria-labelledby="{id}-title"` with `React.useId()` and configurable `headingLevel` (`h2`/`h3`/`h4`) | `ChartCard.tsx` |
| Keyboard | `KpiCard` with `to` renders as `<button type="button">` with `aria-label` (`label — value — sub`) and `navigate(to)` on click. `NavCard` is a full `<button>` with `focus-visible:ring`. Non-interactive cards remain `<div>`. | `KpiCard.tsx`, `Progress.tsx` |
| Color not sole indicator | Deltas pair color with `TrendingUp/Down/Minus` icons; `subCounts` pair dot color with label text; `EmptyState`/`ErrorState` pair icon + text. Per `openspec/ui-dna.md` accessibility baseline. | `KpiCard.tsx`, `States.tsx` |
| Table headers | Must remain meaningful after optional columns hidden (DNA rule) — keep `th` text descriptive even if column is conditionally rendered. | `openspec/ui-dna.md` |
| Scroll affordance | `input, textarea, select { scroll-margin-top/bottom: 80px }` prevents sticky header/footer from covering focused inputs behind virtual keyboard. Number spinners hidden in dense tables. | `index.css` `@layer base` |

---

## Adoption Guide

### How to Use

```ts
// Tokens — import values, prefer Tailwind classes in JSX
import { colors, radii, shadows, shell, sectionGap, typography, chartPalettes, chartHeights, domainAccent } from '@/design-system/tokens';

// Components
import { PageHeader } from '@/design-system/PageHeader';
import { KpiCard } from '@/design-system/KpiCard';
import { ChartCard } from '@/design-system/ChartCard';
import { SectionCard } from '@/design-system/SectionCard';
import { LoadingState, LoadingSkeleton, ErrorState, EmptyState } from '@/design-system/States';
import { CircularProgress, ProgressBar, NavCard } from '@/design-system/Progress';
```

- All cards share the same shell (`bg-white border border-gray-200 rounded-lg shadow-sm`). Do not introduce new border/card primitives — reuse `shell.*`.
- Spacing uses Tailwind directly (`p-3 sm:p-4`, `gap-4 sm:gap-5`). The `spacing` export is documentation, not a runtime style import.
- Chart heights come from `chartHeights`; do not hardcode `height={200}` — use `chartHeights.donut/line/bar`.

### Replace Old Patterns

| Old | New | Notes |
|---|---|---|
| `StatCard` | `KpiCard` | `delta`/`deltaLabel`/`subCounts` already ported; `tone` replaces ad-hoc color props |
| `border-2` on cards | `border` (`1px`) | DNA: soft `border-gray-200`, hover `border-gray-300` — `border-2` is an anti-pattern |
| `shadow` / `shadow-lg` ad-hoc | `shadow-sm` / `shadow-card` / `shadow-cardHover` | Use `shell.*` or `shadows` tokens |
| `rounded-xl` on small cards | `rounded-lg` (`12px`) | `xl` (`16px`) reserved for modals/large panels |
| `p-4` fixed on cards | `p-3 sm:p-4` | Responsive card padding from shell |
| `gap-4` for KPI rows | `gap-2 sm:gap-3` (`sectionGap.kpi`) | KPI grids are intentionally tighter |
| `gap-6` for dashboard | `gap-4 sm:gap-5` (`sectionGap.bento`) | Bento gap from token |
| Raw `div` page header | `PageHeader` | Ensures `mb-5`, responsive title clamp, breadcrumb slot |
| Manual spinner `div` | `LoadingState` / `LoadingSkeleton` | Correct ARIA + consistent sizing |
| Inline error `p` | `ErrorState` with `onRetry` | Includes `role="alert"` and retry affordance |
| Empty `div` with text | `EmptyState` | Includes icon, Vietnamese copy per DNA voice |
| Hardcoded chart colors | `chartPalettes.*` | Single palette source; cycle with `i % length` |
| Hardcoded chart height | `chartHeights.*` | `donut 200`, `line 260`, `bar 260` |

### Voice & Copy (from `openspec/ui-dna.md`)

- User-facing strings are **Vietnamese, concise, operational**. Example defaults: `Đang tải dữ liệu...`, `Không thể tải dữ liệu`, `Chưa có dữ liệu`, `Thử lại`.
- Empty states explain absence plainly; do not show placeholder noise.
- Confirmations show human-readable summaries, not raw payloads.

---

## Tailwind Wiring

Source: `frontend/tailwind.config.js`

### `theme.extend`

| Key | Tokens wired | Values |
|---|---|---|
| `colors` | `primary`, `primaryHover`, `success`, `warning`, `danger`, `info` | `primary #2563EB`, `primaryHover #1D4ED8`, `success #10B981`, `warning #F59E0B`, `danger #EF4444`, `info #06B6D4` — available as `bg-primary`, `text-success`, `border-danger`, etc. |
| `borderRadius` | `radii` | `sm 6px`, `md 8px`, `lg 12px`, `xl 16px` — overrides Tailwind `rounded-sm` etc. |
| `boxShadow` | `shadows` | `card 0 1px 3px rgba(0,0,0,0.08)`, `cardHover 0 4px 12px rgba(0,0,0,0.10)`, `floating 0 8px 24px rgba(0,0,0,0.12)` — `shadow-card` etc. |
| `typography` | prose | `@tailwindcss/typography` `DEFAULT` overrides: `code` on `gray-100`, `pre` on `slate-800 #1e293b`, `th` on `gray-50 #f9fafb`, tight `0.5rem 0.75rem` cell padding |

Neutral scale (`gray-50`–`gray-900`) and the Tailwind default palette are not re-declared — `colors.neutral` in `tokens.ts` maps 1:1 to Tailwind `gray-*`, which is the intended usage (`border-gray-200`, `text-gray-500`, etc.).

### `content` & `safelist`

```js
content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
safelist: [
  { pattern: /hover:border-.*/ },          // dynamic hover borders (e.g. NavCard cyan)
  { pattern: /bg-.*-50/ },                 // tint backgrounds (cyan-50, violet-50, ...)
  { pattern: /text-.*-(500|600)/ },        // tone / domainAccent text colors
  { pattern: /border-.*-(200|300|400|500)/ }, // card borders + hover variants
],
plugins: [require('@tailwindcss/typography')],
```

The safelist preserves dynamically constructed classes (e.g. `toneIcon[tone]`, `domainAccent.*`, `chartPalettes` not needed — they are hex fills) that Tailwind's purge would otherwise drop. If a new dynamic color class is introduced, add its pattern here.

### Relationship

```
openspec/ui-dna.md  →  tokens.ts (JS constants)
                          ↓
                    tailwind.config.js theme.extend  →  compiled CSS
                          ↓
                    shell / typography / sectionGap  →  component className
                          ↓
                    PageHeader / KpiCard / ChartCard / SectionCard / States / Progress
```

Change the DNA → update `tokens.ts` → mirror in `tailwind.config.js` `extend` if the token should be a utility (`colors`, `radii`, `shadows`). `spacing` and `domainAccent` intentionally stay out of `extend` (spacing is Tailwind-native, accents are class strings).

