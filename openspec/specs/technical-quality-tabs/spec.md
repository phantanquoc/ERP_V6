# technical-quality-tabs Specification

## Purpose
TBD - created by archiving change maintenance-single-plan-per-page. Update Purpose after archive.

## Requirements

### Requirement: Bao duong keeps internal pills
The `maintenance` tab SHALL continue to expose two internal pills (Kế hoạch bảo dưỡng / Biên bản BD/SC) via MaintenanceTab without being split into separate top-level tabs. The `plans` pill SHALL render a **single-plan detail view** (one full-width T1–T12 grid per page, navigated by code dropdown + Prev/Next over the filtered set with URL `planId` as source of truth) instead of a paginated multi-card list. The legacy per-page param `planPage` SHALL be ignored in the plans view (records view unchanged).

#### Scenario: Bao duong internal navigation
- **WHEN** user is on tab `maintenance`
- **THEN** two pills for plans and records are visible and switch content within the same tab

#### Scenario: Plans pill is single-plan per page
- **WHEN** user is on `?tab=maintenance&mView=plans`
- **THEN** exactly one plan grid is visible with a code dropdown + Prev/Next navigator; no multi-card pagination controls are shown

#### Scenario: Plans deep-link still works
- **WHEN** user navigates to `?tab=maintenance&mView=plans&planId=<id>&planMonth=5`
- **THEN** the plan for that id is shown and month T5 is highlighted/scrolled into view
