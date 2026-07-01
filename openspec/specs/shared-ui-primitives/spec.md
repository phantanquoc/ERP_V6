# shared-ui-primitives Specification

## Purpose
TBD - created by archiving change unify-repair-mechanical-modules. Update Purpose after archive.
## Requirements
### Requirement: shared components folder exposes 5 primitives

The frontend SHALL provide a folder `frontend/src/components/shared/` containing five primitive components exported via `frontend/src/components/shared/index.ts`:

- `StatusBadge` — props: `{ label: string; tone: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; size?: 'sm' | 'md' }`. Renders a rounded pill with tone-driven text and background classes.
- `SeverityBadge` — props: `{ severity: 'Nghiêm trọng' | 'Trung bình' | 'Nhẹ'; size?: 'sm' | 'md' }`. Maps severity to red/yellow/gray tones internally.
- `PriorityBadge` — props: `{ priority: 'Cao' | 'Trung bình' | 'Thấp'; size?: 'sm' | 'md' }`. Maps priority to red/yellow/blue tones internally.
- `CollapsibleSection` — props: `{ title: string; icon?: ReactNode; defaultOpen?: boolean; children: ReactNode; rightAdornment?: ReactNode; }`. Renders a header row with chevron animation, click toggles content.
- `StatCard` — props: `{ label: string; value: number | string; delta?: number | null; deltaLabel?: string; subCounts?: { label: string; value: number | string; tone?: string }[]; icon?: ReactNode; onClick?: () => void; }`. Renders `value` prominently; when `delta` is non-null, renders an up/down/flat arrow with `deltaLabel`; renders `subCounts` as a compact row.

All primitives SHALL be pure and stateless (except `CollapsibleSection`'s internal open/close state) and SHALL rely only on TailwindCSS + `lucide-react` icons.

#### Scenario: Primitives are exported from the barrel

- **WHEN** a consumer imports `import { StatusBadge, SeverityBadge, PriorityBadge, CollapsibleSection, StatCard } from '@/components/shared'`
- **THEN** all five imports resolve to the corresponding component

#### Scenario: StatCard renders delta arrow

- **WHEN** `<StatCard label="Tổng" value={42} delta={5} deltaLabel="so với 90 ngày trước" />` is rendered
- **THEN** the DOM contains the value `42`, an up-arrow icon, `+5`, and the text `so với 90 ngày trước`

#### Scenario: CollapsibleSection toggles on header click

- **WHEN** the user clicks the header of a `<CollapsibleSection title="Test" defaultOpen={false}>...</CollapsibleSection>`
- **THEN** the section expands (children become visible) and the chevron rotates 180°

### Requirement: FaultRecordList and RepairRequestList consume the shared primitives

`frontend/src/components/FaultRecordList.tsx` and `frontend/src/components/RepairRequestList.tsx` SHALL replace their inline badge and collapsible implementations with imports from `@/components/shared`. Visual output SHALL remain equivalent to the current FaultRecordList look (same tones, same paddings, same chevron behavior). Component-local badge helpers SHALL be removed once adopters compile without errors.

#### Scenario: FaultRecordList status badges use StatusBadge

- **WHEN** the `FaultRecordList` renders a fault row with `trangThai = DA_XU_LY`
- **THEN** the badge in the row is rendered by the shared `StatusBadge` component with `tone = 'green'` and `label = 'Đã xử lý'`

#### Scenario: RepairRequestList stat cards use StatCard

- **WHEN** the `RepairRequestList` renders its dashboard
- **THEN** each of the 4 stat cards is a `StatCard` instance from `@/components/shared`, and no inline `<div className="rounded-xl ...">` stat card implementation remains in the file

#### Scenario: No visual regression on FaultRecordList severity pills

- **WHEN** a fault record with `mucDo = 'Nghiêm trọng'` renders
- **THEN** the severity pill uses `SeverityBadge` and the pill's Tailwind classes produce the same red background and white text as the previous inline implementation

