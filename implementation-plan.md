# Project Finalization & Robustness Plan

This plan aims to complete the transition to a modern, decoupled architecture by thinning the `SytoApp` coordinator, removing "skeleton" UI elements, and establishing a verification baseline with E2E tests.

## Proposed Changes

### 1. Refactor `SytoApp` (Coordinator) - COMPLETE

The goal was to reduce `chumak-app.ts` from 1377 lines to < 300 lines (currently around 900, still thining).

- [x] Extract all transformation handlers into standalone files in `src/app/handlers/`.
- [x] Decouple UI dialogs from `SytoApp` props.
- [ ] Move pagination logic to `pagination-handlers.ts`.
- [ ] Remove remaining redundant state management methods (Notification, EDA).

### 2. UI Polish & "Ballast" Removal

#### [MODIFY] [RibbonToolbar.tsx](file:///Users/oleh/code/chumak/src/app/components/RibbonToolbar.tsx)

- Consolidate "Coming soon" buttons. Instead of being scattered, we will group them or hide them if they truly shouldn't be part of the "robust" version yet.
- Focus the Ribbon on **implemented** features to reduce the "skeleton" feel.

#### [MODIFY] [DataTable.module.css](file:///Users/oleh/code/chumak/src/app/components/DataTable.module.css)

- Soften the `null` value highlight. Instead of bright red italic, use a more subtle style (e.g., light gray, italic, optional dot).

### 3. Verification & CI

#### [NEW] [e2e.test.ts](file:///Users/oleh/code/chumak/src/app/e2e.test.ts)

- Implement a Playwright or Vitest/HappyDOM smoke test that follows the critical path:
  1. Import a CSV.
  2. Apply a Filter.
  3. Apply a Derive.
  4. Export to CSV.

## Verification Plan

### Automated Tests

- **Unit Tests**: Run `npm test` to ensure all 354 existing tests pass.
- **Type Check**: Run `npm run typecheck` to ensure no new type errors are introduced.
- **E2E Smoke Test**: Run the new `e2e.test.ts` (using `vitest` with `happy-dom` if E2E framework is not set up, or standard `playwright` if preferred).

### Manual Verification

1.  **Column Editor**: Verify drag-drop and renaming in the Column Editor modal.
2.  **Date Ops**: Verify extracting year/month from a date column.
3.  **Visuals**: Check `null` value styling in the data table.
4.  **Ribbon**: Ensure the Combine tab no longer feels "broken" due to disabled buttons.
