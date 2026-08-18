// Shared zoom/pan config for FactoryOverview and WarehouseMap
// Unified to handle multiple cases: mobile, desktop, many slots, tall layouts

export const WAREHOUSE_VIEW_CONFIG = {
  factory: {
    minScale: 0.6,
    maxScale: 4,
    initialScale: 1,
    wheel: { step: 0.06 },
    pinch: { step: 5 },
    doubleClick: { mode: 'toggle' as const, step: 2 },
    panning: { velocityDisabled: false },
    limitToBounds: false,
    centerZoomedOut: true,
    centerOnInit: true,
  },
  warehouseMap: {
    minScale: 0.6,
    maxScale: 5,
    initialScale: 1,
    wheel: { step: 0.06 },
    pinch: { step: 5 },
    doubleClick: { mode: 'toggle' as const, step: 2 },
    panning: { velocityDisabled: false },
    limitToBounds: false,
    centerZoomedOut: true,
    centerOnInit: true,
  },
} as const;

// Responsive wrapper heights — avoids 72vh clipping on short mobile viewports
export const WRAPPER_CLASSES = {
  factory: '!w-full !h-[60vh] sm:!h-[72vh] !cursor-grab active:!cursor-grabbing',
  warehouseMap: '!w-full !h-[60vh] sm:!h-[72vh] !overflow-hidden !cursor-grab active:!cursor-grabbing',
} as const;

export const CONTENT_CLASSES = {
  factory: '!w-full',
  warehouseMap: '!w-full !h-full',
} as const;
