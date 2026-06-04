# UI DNA

## Design Tokens
- The interface uses a cool neutral base with blue as the primary action color and green/red reserved for success/destructive actions.
- Spacing follows a compact 8px rhythm; dense ERP tables use tighter cell padding while modal sections use larger vertical breaks.
- Rounded corners are moderate and consistent; cards, inputs, buttons, and modals use soft radii rather than sharp edges.
- Shadows are used mainly to separate floating surfaces such as modals and chat panels; inline content relies on borders and subtle backgrounds.

## Component Patterns
- Modals use white surfaces, clear headers, scrollable bodies, and footer actions aligned to the right.
- Tables are information-dense with explicit borders, shaded headers, and compact typography for scanability.
- Detail views prefer grouped cards or tables with labels close to their values; empty data should be omitted when it reduces noise.
- Primary actions carry solid blue fill; secondary actions use neutral borders or low-contrast backgrounds.

## Interaction & Motion
- Interactions are direct and lightweight: hover color shifts, focus rings, and short transitions.
- Long or secondary content should be progressively disclosed when it would distract from the main task.
- Confirmation flows should show human-readable summaries before execution and avoid exposing raw technical payloads.

## Accessibility Baseline
- Interactive controls need visible text labels or accessible titles.
- Table headers should remain meaningful after optional columns are hidden.
- Color should reinforce state but not be the only indicator.

## Voice & Tone
- User-facing copy is Vietnamese, concise, and operational.
- Empty states should explain the absence of data plainly instead of showing placeholder noise.
- System feedback should name the completed action and avoid technical internals.

## Layout & Responsive
- Wide data tables may scroll horizontally inside modal bodies.
- Modal content should stay within viewport height and keep actions reachable.
- Dense ERP screens prioritize readability and scan speed over decorative layout.

## Anti-Patterns
- Do not show raw JSON or internal IDs to ordinary users when a readable summary is possible.
- Do not render columns whose values are empty across the displayed dataset.
- Do not add visual decoration that competes with primary business data.
