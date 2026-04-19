# Requirements Document

## Introduction

OpsPilot is an SMB survival agent dashboard built on Next.js (App Router). During page transitions, data fetching, and async operations, the UI can appear frozen or unresponsive. This feature introduces a full-screen loading overlay that displays a fixed brand image alongside rotating, business-rescue-themed catchphrases. The overlay appears on every buffer moment across the entire application, keeping users engaged and reinforcing the OpsPilot brand voice while the app works in the background.

## Glossary

- **Loading_Overlay**: The full-screen UI component that renders during any loading or buffering state.
- **Catchphrase**: A short, business-rescue-themed text string displayed beneath the brand image during loading.
- **Catchphrase_Pool**: The complete collection of catchphrases available for rotation.
- **Brand_Image**: The fixed image asset displayed at the top of the Loading_Overlay on every appearance.
- **Page_Transition**: A navigation event between routes in the Next.js App Router that triggers a loading state.
- **Async_Operation**: Any data fetch, server action, or API call that causes the UI to wait for a response.
- **Loading_Context**: The React context that exposes the global loading state to all components.
- **ConditionalShell**: The existing root layout wrapper component (`src/components/layout/conditional-shell.tsx`) that wraps all authenticated pages.

---

## Requirements

### Requirement 1: Global Loading Overlay Rendering

**User Story:** As an OpsPilot user, I want a full-screen loading overlay to appear whenever the app is processing, so that I know the system is working and I stay engaged instead of thinking the app is broken.

#### Acceptance Criteria

1. THE Loading_Overlay SHALL render as a full-screen layer positioned above all other page content.
2. WHEN the Loading_Overlay is active, THE Loading_Overlay SHALL prevent interaction with the underlying page content.
3. THE Loading_Overlay SHALL display the Brand_Image in a fixed position at the top-center of the overlay.
4. THE Loading_Overlay SHALL display one Catchphrase beneath the Brand_Image.
5. WHEN the loading state ends, THE Loading_Overlay SHALL disappear and restore full page interactivity.
6. THE Loading_Overlay SHALL be accessible from every authenticated route in the application via the ConditionalShell.

---

### Requirement 2: Catchphrase Rotation

**User Story:** As an OpsPilot user, I want the catchphrase to change on each loading appearance, so that repeated loading moments feel fresh and I stay entertained.

#### Acceptance Criteria

1. THE Catchphrase_Pool SHALL contain a minimum of 15 distinct catchphrases written in a fintech/business-rescue tone.
2. WHEN the Loading_Overlay becomes visible, THE Loading_Overlay SHALL select one Catchphrase from the Catchphrase_Pool.
3. THE Loading_Overlay SHALL NOT display the same Catchphrase on two consecutive loading appearances.
4. WHEN the Catchphrase_Pool is exhausted without a non-repeating option, THE Loading_Overlay SHALL reset the rotation order before selecting the next Catchphrase.
5. THE Catchphrase_Pool SHALL be defined in a single, editable source file so that catchphrases can be added or modified without changing component logic.

---

### Requirement 3: Page Transition Detection

**User Story:** As an OpsPilot user, I want the loading overlay to appear during every page navigation, so that route changes never leave me staring at a blank or partially rendered screen.

#### Acceptance Criteria

1. WHEN a Next.js App Router navigation event begins, THE Loading_Context SHALL set the loading state to active.
2. WHEN the navigated-to page has fully mounted, THE Loading_Context SHALL set the loading state to inactive.
3. THE Loading_Overlay SHALL respond to loading state changes within 50ms of the state update.
4. WHEN a navigation event is cancelled before completion, THE Loading_Context SHALL set the loading state to inactive.

---

### Requirement 4: Async Operation Loading State

**User Story:** As an OpsPilot user, I want the loading overlay to appear during data fetches and server actions, so that I know the system is retrieving or processing information on my behalf.

#### Acceptance Criteria

1. THE Loading_Context SHALL expose a `startLoading` function that any component or hook can call to activate the Loading_Overlay.
2. THE Loading_Context SHALL expose a `stopLoading` function that any component or hook can call to deactivate the Loading_Overlay.
3. WHEN `startLoading` is called multiple times before `stopLoading`, THE Loading_Context SHALL keep the loading state active until `stopLoading` has been called a matching number of times (reference-counted).
4. IF `stopLoading` is called when the loading count is already zero, THEN THE Loading_Context SHALL take no action and SHALL NOT produce a runtime error.
5. THE Loading_Context SHALL be available to all components within the React component tree without requiring prop drilling.

---

### Requirement 5: Minimum Display Duration

**User Story:** As an OpsPilot user, I want the loading overlay to stay visible for a minimum amount of time, so that very fast operations don't cause a jarring flash of the overlay.

#### Acceptance Criteria

1. WHEN the Loading_Overlay becomes active, THE Loading_Overlay SHALL remain visible for a minimum of 600ms before it is eligible to disappear.
2. IF the loading state ends before the 600ms minimum has elapsed, THEN THE Loading_Overlay SHALL remain visible until the 600ms minimum is reached before hiding.
3. WHEN the loading state is still active after 600ms, THE Loading_Overlay SHALL remain visible until the loading state ends.

---

### Requirement 6: Overlay Visual Design

**User Story:** As an OpsPilot user, I want the loading overlay to look polished and on-brand, so that it feels like a deliberate part of the product rather than a generic spinner.

#### Acceptance Criteria

1. THE Loading_Overlay SHALL use a dark, semi-opaque background consistent with the OpsPilot dark theme (`bg-background` or equivalent).
2. THE Brand_Image SHALL be displayed at a fixed size of 80×80px on all screen sizes.
3. THE Catchphrase SHALL be rendered in the Inter font at a minimum font size of 16px.
4. THE Loading_Overlay SHALL include a visible animated loading indicator (e.g., a spinner or pulsing element) in addition to the Brand_Image and Catchphrase.
5. WHERE the user's device has `prefers-reduced-motion` enabled, THE Loading_Overlay SHALL display a static indicator instead of an animated one.
6. THE Loading_Overlay SHALL be centered both horizontally and vertically on the viewport.

---

### Requirement 7: Landing Page Exclusion

**User Story:** As an OpsPilot user, I want the loading overlay to not interfere with the public landing page, so that the marketing experience remains unaffected.

#### Acceptance Criteria

1. WHEN the current route is `/`, THE Loading_Overlay SHALL NOT render.
2. THE Loading_Overlay SHALL render on all routes other than `/`.
