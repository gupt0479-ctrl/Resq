# Implementation Plan: Loading Screen Catchphrases

## Overview

Additive implementation of a full-screen loading overlay for the OpsPilot SMB survival agent dashboard. All new code lives in dedicated files; only `ConditionalShell` receives a minimal update to wrap authenticated routes with `LoadingProvider`.

## Tasks

- [x] 1. Create catchphrase data file
  - Create `src/lib/catchphrases.ts` exporting the `CATCHPHRASES` readonly string array with all 18 entries from the design
  - This is the single source of truth — no catchphrase logic lives in this file
  - _Requirements: 2.1, 2.5_

- [x] 2. Implement utility hooks
  - [x] 2.1 Create `src/hooks/use-reduced-motion.ts`
    - Return `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
    - Return `false` safely when `window` is unavailable (SSR guard)
    - _Requirements: 6.5_

  - [ ]* 2.2 Write unit tests for `useReducedMotion`
    - Mock `matchMedia` to return `true` and `false`; assert correct boolean return in each case
    - _Requirements: 6.5_

  - [x] 2.3 Create `src/hooks/use-catchphrase.ts`
    - Accept a `trigger: boolean` parameter; advance to next catchphrase on each `false → true` rising edge
    - Maintain an internal shuffled queue; reshuffle on exhaustion
    - Guarantee no two consecutive catchphrases are equal (swap with next item if needed)
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 2.4 Write property test for `useCatchphrase` — Property 1: catchphrase always from pool
    - `// Feature: loading-screen-catchphrases, Property 1: catchphrase always from pool`
    - Generate sequences of N trigger events (N: 1–50); assert every returned catchphrase is in `CATCHPHRASES`
    - **Property 1: Catchphrase always from pool**
    - **Validates: Requirements 2.2**
    - _Requirements: 2.2_

  - [ ]* 2.5 Write property test for `useCatchphrase` — Property 2: no consecutive repeat
    - `// Feature: loading-screen-catchphrases, Property 2: no consecutive repeat`
    - Generate sequences of N trigger events (N: 2–100, including N > pool size); assert no two adjacent catchphrases are equal
    - **Property 2: No consecutive repeat**
    - **Validates: Requirements 2.3, 2.4**
    - _Requirements: 2.3, 2.4_

- [x] 3. Implement `LoadingContext` and `LoadingProvider`
  - [x] 3.1 Create `src/components/loading/loading-provider.tsx`
    - Define `LoadingContext` with `{ isLoading, startLoading, stopLoading }`
    - Maintain a `count` ref (reference counter) and `isVisible` state
    - `startLoading`: increment count, record `startTime`, set `isVisible = true`
    - `stopLoading`: decrement count (floor 0); when count reaches 0, schedule hide after `max(0, 600 - elapsed)` ms
    - `stopLoading` at count=0 is a no-op — no error thrown
    - Render `<LoadingOverlay>` and `<NavigationWatcher>` as siblings to `{children}`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

  - [x] 3.2 Create `src/hooks/use-loading.ts`
    - Thin `useContext(LoadingContext)` wrapper
    - Throw `"useLoading must be used within a LoadingProvider"` if context is null
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 3.3 Write property test for `LoadingProvider` — Property 3: reference-count loading invariant
    - `// Feature: loading-screen-catchphrases, Property 3: reference-count loading invariant`
    - Generate N (1–20); call `startLoading` N times; assert `isLoading` is true after each of the first N−1 `stopLoading` calls; assert `isLoading` becomes false after the Nth `stopLoading` (after 600ms minimum); assert `stopLoading` at count=0 does not throw
    - **Property 3: Reference-count loading invariant**
    - **Validates: Requirements 4.3, 4.4**
    - _Requirements: 4.3, 4.4_

  - [ ]* 3.4 Write property test for `LoadingProvider` — Property 4: minimum display duration
    - `// Feature: loading-screen-catchphrases, Property 4: minimum display duration`
    - Generate `stopDelay` in [0, 1200]ms using fake timers; assert overlay is still visible at `stopDelay` if `stopDelay < 600`, and hidden at `max(stopDelay, 600)`
    - **Property 4: Minimum display duration**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 3.5 Write unit tests for `LoadingProvider` API
    - Assert `startLoading` and `stopLoading` are functions on the context value
    - Assert `useLoading` throws when used outside `LoadingProvider`
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `LoadingOverlay` presentational component
  - [x] 5.1 Create `src/components/loading/loading-overlay.tsx`
    - Accept `{ isVisible: boolean; catchphrase: string }` props
    - Render `fixed inset-0 z-50` container with `bg-background/95 backdrop-blur-sm`
    - Centered flex column: brand image (80×80px) → catchphrase text (Inter, ≥16px) → spinner
    - Toggle visibility via `opacity-0 / opacity-100` + `transition-opacity duration-200` (no layout shift)
    - Use `pointer-events-none` when `!isVisible`, `pointer-events-auto` when visible
    - Spinner: `animate-spin` border element; use `useReducedMotion` to swap to a static pulsing dot
    - Add `onError` handler on `<img>` to hide broken image without breaking overlay
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 5.2 Write unit tests for `LoadingOverlay`
    - Snapshot test; assert `pointer-events-none` when `isVisible=false`; assert catchphrase text is rendered; assert spinner is present; assert brand image is 80×80
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.2, 6.3, 6.4_

- [x] 6. Implement `NavigationWatcher`
  - [x] 6.1 Create `src/components/loading/navigation-watcher.tsx`
    - `"use client"` component that renders `null`
    - Use `usePathname()` from `next/navigation`; on pathname change call `startLoading()` then `stopLoading()` after the new page mounts (via `useEffect` with `pathname` dependency and cleanup)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 6.2 Write integration tests for `NavigationWatcher`
    - Mock `usePathname` to simulate route changes; assert `startLoading` is called on change and `stopLoading` is called after mount
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 7. Wire `LoadingProvider` into `ConditionalShell`
  - Update `src/components/layout/conditional-shell.tsx` to import `LoadingProvider` and wrap the authenticated shell JSX with it (landing page `/` guard remains unchanged)
  - `LoadingProvider` must be the outermost wrapper inside the non-root branch so it covers both shell chrome and page children
  - _Requirements: 1.6, 7.1, 7.2_

  - [ ]* 7.1 Write property test for route-gating invariant — Property 5
    - `// Feature: loading-screen-catchphrases, Property 5: route-gating invariant`
    - Generate arbitrary route strings (including `"/"`, `"/rescue"`, `"/dashboard"`, random paths); assert `ConditionalShell` mounts `LoadingProvider` iff route ≠ `"/"`
    - **Property 5: Route-gating invariant**
    - **Validates: Requirements 7.1, 7.2**
    - _Requirements: 7.1, 7.2_

  - [ ]* 7.2 Write integration smoke test
    - Render full `ConditionalShell` tree on a non-root route; assert `LoadingOverlay` is present in the DOM
    - _Requirements: 1.6, 7.2_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All new files are additive; only `ConditionalShell` receives a minimal update
- Property tests use fast-check (minimum 100 iterations each) and are tagged with design property numbers for traceability
- Fake timers (Vitest) are required for Property 4 tests
- The `CATCHPHRASES` pool in `src/lib/catchphrases.ts` is the single editable source — no logic changes needed to add or remove phrases
