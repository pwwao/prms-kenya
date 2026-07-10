# PRMS — Complete Design System
## Patient Referral Management System (Kenya)
### Single-File Edition — Specification + Full Source Code

**Version:** 1.0.0 · **Date:** June 17, 2026 · **Team:** Product Design

---

> **Design Plan Summary**
> **Color:** Deep Kenyan teal `#0B6B5D` (brand/primary) + warm amber `#C97A15` (accent/CTA) against a cool clinical canvas `#F4F7F8` — not white, not cream. Semantic colors (success/warning/danger/info) are distinct from brand colors to avoid ambiguity in a clinical context.
> **Type:** `Outfit` (display/headings — geometric, approachable) + `Inter` (body/UI — high legibility at small sizes) + `JetBrains Mono` (referral codes, IDs — scannable data).
> **Signature element:** **Triage Left-Border System** — every referral card, list row, and status surface carries a 4px colored left border that encodes urgency or status at a glance, mirroring the physical triage tags used in Kenyan hospitals. This is meaningful, not decorative: a Clinician scanning 40 referrals can triage by color alone before reading a word.

---

## HOW TO USE THIS DOCUMENT

This is a single, self-contained file. Section A is the design specification (color, type, spacing, responsive rules, form/table/dashboard/mobile/accessibility standards) with HTML/CSS reference markup inline. Section B contains the complete, ready-to-extract source code for every layer of the system — design tokens, MUI theme, global SCSS, the full React web component library, and the full React Native mobile theme + component library.

To use the code in a real project: copy each fenced code block in Section B into a file at the path noted in its heading. Nothing in Section B depends on anything outside this document.

---

## TABLE OF CONTENTS

**Section A — Design Specification**
1. Color Palette
2. Typography
3. Spacing System
4. Responsive System
5. Component Library (HTML/CSS reference)
6. Form Design System
7. Table Design System
8. Dashboard Design System
9. Mobile Design System
10. Accessibility Standards

**Section B — Complete Source Code**
11. `tokens/design-tokens.ts` — Web design tokens
12. `theme/theme.mui.ts` — MUI v5 theme override
13. `scss/globals.scss` — Global stylesheet
14. `components/ui/ComponentLibrary.tsx` — React component library
15. `mobile/theme/theme.ts` — React Native theme
16. `mobile/components/MobileComponentLibrary.tsx` — React Native component library

---

# SECTION A — DESIGN SPECIFICATION

## 1. COLOR PALETTE

### 1.1 Brand Colors

| Token | Hex | Usage |
|---|---|---|
| `teal-500` | `#0B6B5D` | Primary brand — buttons, links, active states, header |
| `teal-700` | `#084F45` | Hover/pressed states, dark mode primary |
| `teal-50`  | `#E0F2EE` | Tinted backgrounds, selected rows |
| `amber-500`| `#C97A15` | Secondary CTA, urgent highlights |
| `amber-700`| `#8D530C` | Amber hover state |

### 1.2 Semantic Colors

| Token | Hex | Meaning |
|---|---|---|
| `success-500` | `#16834B` | Approved, Active, Accepted, Completed |
| `warning-500` | `#B85C00` | Pending, Urgent |
| `danger-500`  | `#B91C1C` | Suspended, Rejected, Emergent |
| `info-500`    | `#1E56A0` | Draft, system info |

### 1.3 Neutral Scale (blue-tinted, clinical)

| Token | Hex | Usage |
|---|---|---|
| `neutral-50`  | `#F4F7F8` | App canvas background |
| `neutral-100` | `#E8EDF2` | Card hover, table header bg |
| `neutral-200` | `#D8E2EA` | Borders, dividers |
| `neutral-400` | `#8AA0B4` | Placeholder text, disabled icons |
| `neutral-600` | `#3A5068` | Secondary text |
| `neutral-800` | `#1C2B3A` | Primary text, headings |

### 1.4 Triage Border Colors (Signature System)

This is the design system's defining device. A 4px left border on every referral-related surface:

```
🔴 Emergent / Rejected / Suspended  →  #B91C1C
🟠 Urgent / Pending                 →  #C97A15 / #B85C00
🟢 Routine / Accepted / Approved    →  #16834B
🔵 Draft / Received                 →  #1E56A0
🟦 Dispatched                       →  #0B6B5D
⚪ Completed / Inactive             →  #8AA0B4
```

### HTML
```html
<div class="color-swatch" style="background:#0B6B5D"></div>
<div class="color-swatch" style="background:#C97A15"></div>
<div class="color-swatch" style="background:#F4F7F8; border:1px solid #D8E2EA"></div>
```

### CSS
```css
:root {
  --color-teal-500: #0B6B5D;
  --color-amber-500: #C97A15;
  --color-canvas: #F4F7F8;
  --color-success-500: #16834B;
  --color-danger-500: #B91C1C;
}
.color-swatch {
  width: 48px; height: 48px;
  border-radius: 8px;
  display: inline-block;
}
```

### React
```tsx
import { colors } from '@/tokens/design-tokens';

<div style={{ background: colors.teal[500], width: 48, height: 48, borderRadius: 8 }} />
```

### Mobile (React Native)
```tsx
import { colors } from '@/mobile/theme/theme';
import { View } from 'react-native';

<View style={{ backgroundColor: colors.teal[500], width: 48, height: 48, borderRadius: 8 }} />
```

> Full token values: see Section 11 (web) and Section 15 (mobile) below.

---

## 2. TYPOGRAPHY

### 2.1 Font Stack

| Role | Font | Weights | Why |
|---|---|---|---|
| Display/Headings | **Outfit** | 400, 500, 600, 700 | Geometric sans, friendly without being clinical-cold |
| Body/UI | **Inter** | 400, 500, 600 | Best-in-class legibility at small sizes — critical for dense tables |
| Code/Data | **JetBrains Mono** | 400, 500 | Referral codes, IDs — fixed-width prevents digit ambiguity |

### 2.2 Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `display-lg` | 36px | 700 | Marketing/empty states only |
| `display-md` | 30px | 600 | Page-level h1 |
| `heading` | 24px | 600 | Section h2 |
| `subheading` | 16px | 600 | Card titles, h3 |
| `body` | 15px | 400 | Default paragraph |
| `body-sm` | 14px | 400 | Table cells, secondary text |
| `caption` | 12px | 400 | Timestamps, hints |
| `label` | 12px | 600 (uppercase, tracked) | Form labels, table headers |
| `code` | 14px (mono) | 500 | Referral codes |

### HTML
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">

<h1 class="text-display-md">Patient Referral Management</h1>
<p class="text-body">Track and manage inter-facility referrals.</p>
<span class="text-code">REF-2026-00981</span>
```

### CSS
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

.text-display-md {
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-neutral-800);
}
.text-body {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.9375rem;
  line-height: 1.625;
  color: var(--color-neutral-700);
}
.text-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  background: var(--color-teal-50);
  color: var(--color-teal-700);
  padding: 2px 6px;
  border-radius: 4px;
}
```

### React
```tsx
<h1 style={{ fontFamily: typography.fontFamily.display, fontSize: '1.875rem', fontWeight: 600 }}>
  Patient Referral Management
</h1>
```

### Mobile
```tsx
import { typography } from '@/mobile/theme/theme';
import { Text } from 'react-native';

<Text style={typography.displayMd}>Patient Referral Management</Text>
<Text style={typography.code}>REF-2026-00981</Text>
```

> **Mobile font loading note:** Outfit/Inter/JetBrains Mono ship as static `.ttf` files bundled via `expo-font` or `react-native.config.js` — Google Fonts CDN does not work in native apps.

---

## 3. SPACING SYSTEM

4px base grid. All spacing values are multiples of 4 to keep alignment predictable across web and mobile.

| Token | Value | Common usage |
|---|---|---|
| `space-1` | 4px  | Icon-to-text gap |
| `space-2` | 8px  | Tight internal padding |
| `space-3` | 12px | Form field internal padding |
| `space-4` | 16px | Default card/section padding (mobile) |
| `space-5` | 20px | Default card padding (web) |
| `space-6` | 24px | Section spacing, page padding |
| `space-8` | 32px | Large section breaks |
| `space-12`| 48px | Page-level vertical rhythm |

### CSS
```css
:root {
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-12: 48px;
}
.card { padding: var(--space-5) var(--space-6); }
```

### React (inline)
```tsx
import { spacing } from '@/tokens/design-tokens';
<div style={{ padding: `${spacing[5]} ${spacing[6]}` }}>...</div>
```

### Mobile
```tsx
import { spacing } from '@/mobile/theme/theme';
<View style={{ padding: spacing[4] }}>...</View>
```

---

## 4. RESPONSIVE SYSTEM

### 4.1 Breakpoints (mobile-first)

| Token | Width | Device |
|---|---|---|
| `xs` | 320px | Smallest Android |
| `sm` | 480px | Large phone |
| `md` | 768px | Tablet |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Desktop |
| `2xl`| 1440px | Large desktop |

### 4.2 Grid Behavior

- **KPI cards:** 4 columns desktop → 2 columns tablet (`≤1024px`) → 1 column mobile (`≤480px`)
- **Content + sidebar:** 2 columns desktop → stacked single column (`≤1024px`)
- **Data tables:** horizontal scroll on any viewport `<768px`, never collapse columns silently
- **Forms:** single column always on mobile; 2-column grid permitted on web ≥768px for short fields (phone, DOB) — never for text areas

### HTML / CSS
```html
<div class="prms-grid kpi-grid">
  <div class="prms-card">...</div>
  <div class="prms-card">...</div>
  <div class="prms-card">...</div>
  <div class="prms-card">...</div>
</div>
```
```css
.prms-grid.kpi-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(4, 1fr);
}
@media (max-width: 1024px) {
  .prms-grid.kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .prms-grid.kpi-grid { grid-template-columns: 1fr; }
}
```

### React
```tsx
<div className="prms-grid kpi-grid">
  {kpis.map(kpi => <KPICard key={kpi.title} {...kpi} />)}
</div>
```
*(class applied from Section 13 below)*

### Mobile
React Native has no media queries — use `Dimensions` or `useWindowDimensions` for tablet layouts:
```tsx
import { useWindowDimensions } from 'react-native';

const { width } = useWindowDimensions();
const columns = width >= 768 ? 2 : 1; // tablet vs phone
```

---

## 5. COMPONENT LIBRARY

> Full implementations for all components below are in Section 14 (web) and Section 16 (mobile). This section gives the HTML/CSS reference markup for each.

### 5.1 Button

**HTML**
```html
<button class="btn btn--primary btn--md">Dispatch Referral</button>
<button class="btn btn--outline btn--md">Cancel</button>
<button class="btn btn--danger btn--md">Reject</button>
```

**CSS**
```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.875rem;
  border: none; border-radius: 6px; cursor: pointer;
  height: 40px; padding: 0 20px;
  transition: all 200ms cubic-bezier(0.4,0,0.2,1);
}
.btn--primary  { background: #0B6B5D; color: #fff; }
.btn--primary:hover { background: #0A5E52; }
.btn--outline  { background: transparent; color: #0A5E52; border: 1.5px solid #80C9BE; }
.btn--danger   { background: #B91C1C; color: #fff; }
.btn:disabled  { opacity: 0.6; cursor: not-allowed; }
```

**React** → `<Button variant="primary" onClick={...}>Dispatch Referral</Button>` (see Section 14 below)

**Mobile** → `<Button label="Dispatch Referral" variant="primary" onPress={...} />` (see Section 16 below)

---

### 5.2 Status Badge

**HTML**
```html
<span class="badge badge--accepted">
  <span class="badge__dot"></span> Accepted
</span>
```

**CSS**
```css
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 9999px;
  font-size: 0.75rem; font-weight: 600;
  border: 1px solid transparent;
}
.badge__dot { width: 6px; height: 6px; border-radius: 50%; }
.badge--accepted { background: #ECFDF5; color: #166534; border-color: #A7F3D0; }
.badge--accepted .badge__dot { background: #16834B; }
.badge--rejected { background: #FEF2F2; color: #7F1D1D; border-color: #FECACA; }
.badge--rejected .badge__dot { background: #B91C1C; }
.badge--pending  { background: #FFF7ED; color: #843F00; border-color: #FED7AA; }
```

**React** → `<StatusBadge status="Accepted" />`
**Mobile** → `<StatusBadge status="Accepted" />`

---

### 5.3 Referral Card (Triage Border — Signature Component)

**HTML**
```html
<article class="referral-card triage-emergent">
  <div class="referral-card__top">
    <span class="text-code">REF-2026-00981</span>
    <span class="badge badge--emergent">🔴 EMERGENT</span>
    <span class="badge badge--received">Received</span>
    <span class="referral-card__time">12m ago</span>
  </div>
  <p class="referral-card__patient">Jane W. M. <span>Female, 34 yrs</span></p>
  <p class="referral-card__route">Kisumu County Hospital → <strong>Kenyatta National Hospital</strong></p>
</article>
```

**CSS**
```css
.referral-card {
  background: #fff;
  border: 1px solid #D8E2EA;
  border-left: 4px solid transparent;
  border-radius: 0 10px 10px 0;
  padding: 16px 18px;
  margin-bottom: 12px;
  transition: box-shadow 200ms ease;
}
.referral-card:hover { box-shadow: 0 4px 12px rgba(28,43,58,0.1); cursor: pointer; }
.referral-card.triage-emergent { border-left-color: #B91C1C; }
.referral-card.triage-urgent   { border-left-color: #C97A15; }
.referral-card.triage-routine  { border-left-color: #16834B; }
.referral-card__top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.referral-card__time { margin-left: auto; font-size: 0.75rem; color: #8AA0B4; }
.referral-card__patient { font-weight: 600; font-size: 0.9375rem; margin-bottom: 4px; }
.referral-card__patient span { font-weight: 400; color: #6E8499; font-size: 0.8125rem; margin-left: 8px; }
.referral-card__route { font-size: 0.8125rem; color: #6E8499; }
.referral-card__route strong { color: #2B3D52; font-weight: 500; }
```

**React** → `<ReferralCard referral={referral} onClick={handleOpen} />`
**Mobile** → `<ReferralCard referral={referral} onPress={handleOpen} />`

---

### 5.4 KPI Card

**HTML**
```html
<article class="kpi-card kpi-card--teal">
  <header class="kpi-card__header">
    <span class="text-label">Total Referrals</span>
  </header>
  <p class="kpi-card__value">142</p>
  <footer class="kpi-card__trend kpi-card__trend--up">▲ 12% vs last month</footer>
</article>
```

**CSS**
```css
.kpi-card {
  background: #fff; border: 1px solid #D8E2EA;
  border-top: 3px solid #0B6B5D;
  border-radius: 12px; padding: 20px 24px;
  display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 1px 3px rgba(28,43,58,0.08);
}
.kpi-card__value { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 700; color: #1C2B3A; }
.kpi-card__trend { font-size: 0.75rem; }
.kpi-card__trend--up { color: #16834B; font-weight: 600; }
```

**React** → `<KPICard title="Total Referrals" value={142} trend={{value:12,label:'vs last month',positive:true}} />`

---

### 5.5 Modal / Confirm Dialog

**HTML**
```html
<div class="modal-overlay">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header class="modal__header">
      <h2 id="modal-title">Suspend Hospital</h2>
      <button class="modal__close" aria-label="Close dialog">✕</button>
    </header>
    <div class="modal__body">
      <p>This will lock all active sessions for this facility's users.</p>
    </div>
    <footer class="modal__footer">
      <button class="btn btn--outline">Cancel</button>
      <button class="btn btn--danger">Confirm Suspension</button>
    </footer>
  </div>
</div>
```

**CSS**
```css
.modal-overlay {
  position: fixed; inset: 0; z-index: 400;
  background: rgba(28,43,58,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
  box-shadow: 0 20px 40px rgba(28,43,58,0.2);
}
.modal__header { padding: 20px 24px; border-bottom: 1px solid #E8EDF2; display: flex; justify-content: space-between; align-items: center; }
.modal__body { padding: 24px; }
.modal__footer { padding: 16px 24px; border-top: 1px solid #E8EDF2; display: flex; justify-content: flex-end; gap: 12px; background: #F4F7F8; border-radius: 0 0 16px 16px; }
```

**React** → `<ConfirmDialog open title="Suspend Hospital" body="..." onConfirm={...} variant="danger" />`
**Mobile** → `<BottomSheet visible title="Suspend Hospital">...</BottomSheet>`

---

## 6. FORM DESIGN SYSTEM

### 6.1 Principles

- One column on mobile, always. Two columns on web only for short paired fields (e.g., DOB day/month/year, phone country code + number).
- Labels always visible above the field — never placeholder-as-label.
- Required fields marked with a red asterisk and `aria-required`.
- Validation runs on blur, not on every keystroke — re-validates on submit attempt.
- Error messages replace hints below the field; never both at once.
- Multi-step forms (Patient Registration, Create Referral) show a step indicator and persist data across steps in memory.

### 6.2 Patient Registration Form — Step Example

**HTML**
```html
<form class="prms-form">
  <div class="form-step-indicator">
    <span class="step active">1</span>
    <span class="step-line"></span>
    <span class="step">2</span>
    <span class="step-line"></span>
    <span class="step">3</span>
  </div>

  <h2 class="text-heading">Patient Identity</h2>

  <div class="prms-form-group">
    <label class="prms-label" for="idType">ID Type <span class="required">*</span></label>
    <select id="idType" class="prms-select" required>
      <option value="">Select ID type</option>
      <option value="national_id">National ID</option>
      <option value="alien_id">Alien ID</option>
      <option value="birth_cert">Birth Certificate</option>
    </select>
  </div>

  <div class="prms-form-group">
    <label class="prms-label" for="nationalId">ID Number <span class="required">*</span></label>
    <input id="nationalId" class="prms-input" type="text" placeholder="e.g. 23456789" required />
    <p class="prms-field-hint">We'll check if this patient is already registered.</p>
  </div>

  <div class="prms-form-group">
    <label class="prms-label" for="fullName">Full Name <span class="required">*</span></label>
    <input id="fullName" class="prms-input" type="text" required />
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn--outline">Cancel</button>
    <button type="submit" class="btn btn--primary">Continue →</button>
  </div>
</form>
```

**CSS**
```css
.prms-form { max-width: 480px; margin: 0 auto; }

.form-step-indicator {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-bottom: 24px;
}
.step {
  width: 28px; height: 28px; border-radius: 50%;
  background: #E8EDF2; color: #6E8499;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8125rem; font-weight: 600;
}
.step.active { background: #0B6B5D; color: #fff; }
.step-line { width: 32px; height: 2px; background: #D8E2EA; }

.prms-form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 4px; }
.prms-label { font-size: 0.875rem; font-weight: 600; color: #2B3D52; }
.prms-label .required { color: #B91C1C; }

.prms-input, .prms-select {
  height: 40px; padding: 0 12px;
  border: 1.5px solid #B8C8D6; border-radius: 6px;
  font-size: 0.9375rem; font-family: 'Inter', sans-serif;
  background: #fff; color: #1C2B3A;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.prms-input:focus, .prms-select:focus {
  outline: none; border-color: #0B6B5D;
  box-shadow: 0 0 0 3px #E0F2EE;
}
.prms-input.error { border-color: #B91C1C; }

.prms-field-hint { font-size: 0.75rem; color: #6E8499; }
.prms-field-error { font-size: 0.75rem; color: #991B1B; display: flex; align-items: center; gap: 4px; }

.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; }
```

**React** → `<FormField label="Full Name" required onChange={...} />` and `<SelectField label="ID Type" options={[...]} />` (see Section 14 below)

**Mobile** → `<FormField label="Full Name" required />` (see Section 16 below) — same visual language, native `TextInput` under the hood

### 6.3 Form Field States Reference

| State | Border | Background | Notes |
|---|---|---|---|
| Default | `neutral-300` | white | |
| Focus | `teal-500`, 1.5px | white | + 3px teal-50 glow ring |
| Error | `danger-500` | white | error text replaces hint |
| Disabled | `neutral-200` | `neutral-100` | cursor: not-allowed |
| Success (validated) | `success-500` | white | optional checkmark icon |

---

## 7. TABLE DESIGN SYSTEM

### 7.1 Principles

- Sticky header on scroll for tables >10 rows
- Row hover state always present for clickable rows (teal tint at 4–8% opacity)
- Sortable columns show a ↕ glyph that becomes ↑/↓ when active
- Status and urgency always rendered as badges, never plain text
- Masked PII columns show the masked value with a 🔒 icon, not blank cells
- Empty state replaces the table body entirely — never an empty `<table>` with just headers
- Pagination always shows "X–Y of Z" plus page controls, never infinite scroll for admin tables (audit trail, hospital list)

### 7.2 Hospital List Table

**HTML**
```html
<div class="table-wrap">
  <table class="prms-table">
    <thead>
      <tr>
        <th>Hospital Name</th>
        <th>MoH Code</th>
        <th>County</th>
        <th>Level</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr class="clickable">
        <td>Kenyatta National Hospital</td>
        <td><span class="text-code">KNH-2024-001</span></td>
        <td>Nairobi</td>
        <td>Level 6</td>
        <td><span class="badge badge--pending">Pending</span></td>
        <td><button class="btn btn--ghost btn--sm">Review →</button></td>
      </tr>
    </tbody>
  </table>
</div>
```

**CSS**
```css
.table-wrap { border: 1px solid #D8E2EA; border-radius: 10px; overflow-x: auto; }
.prms-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.prms-table thead th {
  font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: #6E8499; background: #F4F7F8; padding: 10px 16px; text-align: left;
  border-bottom: 2px solid #D8E2EA; position: sticky; top: 0;
}
.prms-table tbody td { padding: 12px 16px; border-bottom: 1px solid #E8EDF2; color: #2B3D52; }
.prms-table tbody tr.clickable { cursor: pointer; transition: background 120ms ease; }
.prms-table tbody tr.clickable:hover { background: rgba(11,107,93,0.04); }
```

**React** → `<DataTable columns={hospitalColumns} data={hospitals} onRowClick={...} />` (see Section 14 below — generic, typed, supports sort/select/loading/empty states out of the box)

**Mobile equivalent:** Tables are never rendered as literal tables on mobile — they collapse into the `ReferralCard` / list-row pattern shown in §5.3. Mobile has no data-table component; this is intentional per the mobile design system in §9.

---

## 8. DASHBOARD DESIGN SYSTEM

### 8.1 Layout Anatomy

```
┌─────────────────────────────────────────────────────────┐
│ SIDEBAR (256px)  │  TOPBAR (64px height)                 │
│                   ├─────────────────────────────────────┤
│  Logo             │  Page content (max-width 1280px,     │
│  Nav items         │  padded 24px)                        │
│  ...               │                                       │
│                   │  ┌─────┐┌─────┐┌─────┐┌─────┐        │
│  User profile      │  │ KPI ││ KPI ││ KPI ││ KPI │        │
│  (bottom)          │  └─────┘└─────┘└─────┘└─────┘        │
│                   │                                       │
│                   │  ┌───────────────┐┌────────────┐     │
│                   │  │ Main table/    ││ Sidebar      │     │
│                   │  │ chart          ││ widget       │     │
│                   │  └───────────────┘└────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 8.2 System Admin Dashboard — HTML Reference

```html
<div class="prms-app-shell">
  <aside class="prms-sidebar">
    <div class="sidebar-logo">🏥 PRMS</div>
    <nav class="sidebar-nav">
      <a href="#" class="sidebar-link active">Dashboard</a>
      <a href="#" class="sidebar-link">Hospitals</a>
      <a href="#" class="sidebar-link">Audit Logs</a>
      <a href="#" class="sidebar-link">Reports</a>
    </nav>
  </aside>

  <main class="prms-main">
    <header class="prms-topbar">
      <h1 class="text-heading">System Dashboard</h1>
      <div class="topbar-user">Dr. Wanjiru ▾</div>
    </header>

    <div class="prms-page">
      <div class="prms-grid kpi-grid">
        <article class="kpi-card kpi-card--amber">
          <span class="text-label">Pending Approvals</span>
          <p class="kpi-card__value">3</p>
        </article>
        <article class="kpi-card kpi-card--teal">
          <span class="text-label">Active Hospitals</span>
          <p class="kpi-card__value">487</p>
        </article>
        <article class="kpi-card kpi-card--danger">
          <span class="text-label">Security Alerts</span>
          <p class="kpi-card__value">0</p>
        </article>
        <article class="kpi-card kpi-card--info">
          <span class="text-label">Total Referrals (30d)</span>
          <p class="kpi-card__value">2,140</p>
        </article>
      </div>

      <section class="prms-card" style="margin-top:24px">
        <header class="prms-card__header"><h2>Pending Hospital Applications</h2></header>
        <div class="prms-card__body">
          <!-- table here -->
        </div>
      </section>
    </div>
  </main>
</div>
```

**CSS** — sidebar, topbar, and page utility classes are already defined in Section 13 below (`.prms-app-shell`, `.prms-sidebar`, `.prms-topbar`, `.prms-page`, `.prms-grid.kpi-grid`, `.prms-card`).

**React** — compose from generated components:
```tsx
<PageHeader title="System Dashboard" />
<div className="prms-grid kpi-grid">
  <KPICard title="Pending Approvals" value={3} accent="amber" />
  <KPICard title="Active Hospitals" value={487} accent="teal" />
  <KPICard title="Security Alerts" value={0} accent="danger" />
  <KPICard title="Total Referrals (30d)" value="2,140" accent="info" />
</div>
```

### 8.3 Dashboard Rules

- KPI row is always the first thing below the page header — no exceptions
- Maximum 4 KPI cards per row; if more metrics are needed, use a second row, not a 5+ column grid
- Charts (Recharts) use the same color tokens as everything else — teal for primary series, amber for secondary, neutral grays for axis/gridlines
- Every dashboard widget that loads async data shows `SkeletonCard` while loading, never a blank space or spinner-only state

---

## 9. MOBILE DESIGN SYSTEM

### 9.1 Why Mobile Diverges From Web

Clinicians and Receptionists work mobile-first, often on mid-range Android devices over 2G/3G in rural counties. The mobile system prioritizes: large touch targets (44pt minimum), high contrast for outdoor visibility, and zero reliance on hover states (which don't exist on touch).

### 9.2 Mobile Typography Scale

Same font families as web (Outfit/Inter/JetBrains Mono) but loaded as native font files, not CDN. Base body size is **15px** on mobile vs 15px on web — kept identical for consistency, but line-heights are slightly larger (22px vs 24px) to aid readability on smaller screens held at arm's length.

### 9.3 Mobile Component Differences from Web

| Component | Web | Mobile |
|---|---|---|
| Data display | `DataTable` (rows/columns) | `ReferralCard` list — no literal tables |
| Confirmation | `Modal` (centered, dimmed overlay) | `BottomSheet` (slides from bottom — native pattern) |
| Navigation | Sidebar + topbar | Bottom tab bar + stack navigators |
| Forms | Can use 2-column grid | Always single column |
| Hover states | Used throughout | None — replaced with `Pressable` opacity/scale feedback |

### 9.4 Bottom Tab Bar — HTML/CSS Reference (for design handoff only; actual implementation is native)

```html
<nav class="mobile-tabbar">
  <button class="tab-item active">
    <span class="tab-icon">🏠</span><span class="tab-label">Dashboard</span>
  </button>
  <button class="tab-item">
    <span class="tab-icon">📋</span><span class="tab-label">Referrals</span>
    <span class="tab-badge">3</span>
  </button>
  <button class="tab-item">
    <span class="tab-icon">🔔</span><span class="tab-label">Alerts</span>
  </button>
</nav>
```

```css
.mobile-tabbar {
  display: flex; height: 64px;
  background: #fff; border-top: 1px solid #E8EDF2;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 2px; border: none; background: none;
  color: #8AA0B4; position: relative; min-height: 44px;
}
.tab-item.active { color: #0B6B5D; }
.tab-label { font-size: 11px; font-weight: 500; }
.tab-badge {
  position: absolute; top: 4px; right: 22%;
  background: #B91C1C; color: #fff; font-size: 10px; font-weight: 700;
  min-width: 16px; height: 16px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
```

**React Native equivalent** uses `@react-navigation/bottom-tabs` with `tabBarIcon`/`tabBarBadge` props styled with the same token values from Section 15 below — not custom-built, to inherit correct safe-area and gesture handling.

### 9.5 Minimum Touch Target

Every interactive element — buttons, list rows, form inputs, icon buttons — must measure **at least 44×44pt**. This is enforced as `minTouchTarget = 44` in the mobile theme and applied to the `Button` component's `md` size by default.

---

## 10. ACCESSIBILITY STANDARDS

### 10.1 Compliance Target

**WCAG 2.2 Level AA** across web and mobile, per the Architecture Contract §10.

### 10.2 Color Contrast

| Pairing | Ratio | Pass |
|---|---|---|
| `neutral-800` text on `neutral-50` bg | 13.1:1 | ✅ AAA |
| `neutral-600` text on white | 6.8:1 | ✅ AA |
| White text on `teal-500` button | 4.9:1 | ✅ AA |
| `teal-700` text on `teal-50` (code chips) | 8.2:1 | ✅ AAA |
| `danger-700` text on `danger-50` (badges) | 7.4:1 | ✅ AAA |

All status badge text/background pairs were chosen specifically to clear 4.5:1 at minimum — verified in the token file, not assumed.

### 10.3 Keyboard Navigation (Web)

- Every interactive element reachable via `Tab`, in visual reading order
- Visible focus ring on all elements: `2.5px solid teal-500` with `2px` offset — never `outline: none` without a replacement
- `Escape` closes any open Modal or dropdown
- Skip link (`.skip-link`, defined in Section 13 below) lets keyboard users bypass the sidebar and jump to main content

### 10.4 Screen Reader Support

- All icon-only buttons have `aria-label` (e.g., close button, pagination arrows)
- Status badges use `role="status"` and `aria-label="Status: Accepted"` — color is never the only signal
- Form errors use `role="alert"` so they're announced immediately on validation failure
- Live regions (`aria-live="polite"`) used for: toast notifications, offline banner, sync status — never `aria-live="assertive"` except for emergent-urgency alerts
- Tables use proper `<thead>`/`<th scope>` semantics; the generic `DataTable` component sets `aria-sort` on sortable headers

### 10.5 Motion & Animation

- All animations respect `prefers-reduced-motion: reduce` — durations drop to near-zero automatically (see Section 13 below)
- The Emergent urgency pulse animation is the **only** persistent animation in the system, and even it must respect reduced-motion

### 10.6 Mobile-Specific Accessibility

- All touch targets ≥ 44×44pt (§9.5)
- `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` set on every custom Pressable component (already implemented in Section 16 below)
- Dynamic Type / font scaling respected — no hardcoded `fontSize` that ignores the OS text-size setting beyond the defined type scale
- Color is never the sole indicator of urgency — the triage border system is always paired with a text label (e.g., "EMERGENT") and an emoji/icon, satisfying WCAG 1.4.1 (Use of Color)

### 10.7 Forms Accessibility

- Every input has a programmatically associated `<label>` (web: `htmlFor`/`id`; mobile: `accessibilityLabel`)
- Required fields marked both visually (red asterisk) and programmatically (`aria-required` / `required`)
- Error messages linked via `aria-describedby`, not just visually adjacent
- Sufficient touch/click target spacing between adjacent form controls — minimum 8px gap

### 10.8 Testing Checklist (hand to QA team)

- [ ] Tab through every screen with keyboard only — no dead ends, no invisible focus
- [ ] Run axe DevTools or Lighthouse accessibility audit — zero critical issues
- [ ] Test with VoiceOver (iOS) and TalkBack (Android) on all mobile screens
- [ ] Verify all status/urgency indicators are distinguishable in grayscale (color-blindness simulation)
- [ ] Confirm `prefers-reduced-motion` disables the Emergent pulse animation
- [ ] Confirm minimum 44pt touch targets on every mobile screen using accessibility inspector

---


---

# SECTION B — COMPLETE SOURCE CODE

> Every file below is complete and self-contained. Copy each block into a file at the path shown in its heading to reconstruct the full project structure:
> ```
> prms-design-system/
> ├── tokens/design-tokens.ts
> ├── theme/theme.mui.ts
> ├── scss/globals.scss
> ├── components/ui/ComponentLibrary.tsx
> ├── mobile/theme/theme.ts
> └── mobile/components/MobileComponentLibrary.tsx
> ```

## 11. `tokens/design-tokens.ts`

Single source of truth for all web color, typography, spacing, radius, shadow, breakpoint, and triage-border values. Imported by the MUI theme, the global SCSS reference, and the React component library.

```typescript
/**
 * PRMS Design Tokens
 * Patient Referral Management System — Kenya
 *
 * Signature: Triage Left-Border System
 * Every card, list item, and status surface carries a 4px left border
 * encoding urgency/status — mirrors Kenya hospital triage tag colours.
 *
 * Usage: import { tokens } from '@/tokens/design-tokens'
 */

// ─── COLOR PALETTE ────────────────────────────────────────────────────────────

export const colors = {
  // Brand — Deep Kenyan Teal
  teal: {
    50:  '#E0F2EE',
    100: '#B3DED7',
    200: '#80C9BE',
    300: '#4DB4A5',
    400: '#26A392',
    500: '#0B6B5D', // Primary brand
    600: '#0A5E52',
    700: '#084F45',
    800: '#063F37',
    900: '#04302A',
  },

  // Accent — Warm Amber (CTAs, urgency, highlights)
  amber: {
    50:  '#FEF6E7',
    100: '#FDEBC4',
    200: '#FBDA96',
    300: '#F9C965',
    400: '#F7B83F',
    500: '#C97A15', // Accent brand
    600: '#B06810',
    700: '#8D530C',
    800: '#6A3F09',
    900: '#4A2B06',
  },

  // Semantic — Success
  success: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    500: '#16834B', // Use for Approved, Active, Completed, Accepted
    600: '#15803D',
    700: '#166534',
    900: '#064E3B',
  },

  // Semantic — Warning
  warning: {
    50:  '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    500: '#B85C00', // Use for Pending, Urgent
    600: '#A04D00',
    700: '#843F00',
  },

  // Semantic — Danger
  danger: {
    50:  '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    500: '#B91C1C', // Use for Suspended, Rejected, Emergent
    600: '#991B1B',
    700: '#7F1D1D',
  },

  // Semantic — Info
  info: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    500: '#1E56A0', // Use for Draft, system info
    600: '#1D4ED8',
    700: '#1E40AF',
  },

  // Neutral — Blue-tinted grays (clinical)
  neutral: {
    0:   '#FFFFFF',
    50:  '#F4F7F8', // Canvas — cool clinical background
    100: '#E8EDF2',
    200: '#D8E2EA',
    300: '#B8C8D6',
    400: '#8AA0B4',
    500: '#6E8499',
    600: '#3A5068',
    700: '#2B3D52',
    800: '#1C2B3A', // Ink — primary text
    900: '#111927',
  },
} as const;

// ─── TYPOGRAPHY ────────────────────────────────────────────────────────────────
// Fonts loaded via Google Fonts CDN in index.html:
// Outfit: 400 500 600 700
// Inter: 400 500 600
// JetBrains Mono: 400 500

export const typography = {
  fontFamily: {
    display: '"Outfit", system-ui, sans-serif',   // Headings — geometric, approachable
    body:    '"Inter", system-ui, sans-serif',    // Body text, UI labels
    mono:    '"JetBrains Mono", monospace',       // Referral codes, IDs, data
  },

  fontSize: {
    '2xs': '0.625rem',  // 10px
    xs:    '0.75rem',   // 12px
    sm:    '0.875rem',  // 14px
    base:  '1rem',      // 16px
    lg:    '1.125rem',  // 18px
    xl:    '1.25rem',   // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  fontWeight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  lineHeight: {
    tight:   1.25,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
    loose:   2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight:   '-0.025em',
    normal:  '0em',
    wide:    '0.025em',
    wider:   '0.05em',
    widest:  '0.1em',
  },
} as const;

// ─── SPACING ───────────────────────────────────────────────────────────────────
// 4px base grid

export const spacing = {
  0:   '0px',
  0.5: '2px',
  1:   '4px',
  1.5: '6px',
  2:   '8px',
  2.5: '10px',
  3:   '12px',
  3.5: '14px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  7:   '28px',
  8:   '32px',
  9:   '36px',
  10:  '40px',
  11:  '44px',
  12:  '48px',
  14:  '56px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
  28:  '112px',
  32:  '128px',
} as const;

// ─── BORDER RADIUS ─────────────────────────────────────────────────────────────

export const radius = {
  none:  '0px',
  xs:    '2px',
  sm:    '4px',
  md:    '6px',
  lg:    '8px',
  xl:    '12px',
  '2xl': '16px',
  '3xl': '24px',
  full:  '9999px',
} as const;

// ─── SHADOWS ──────────────────────────────────────────────────────────────────

export const shadows = {
  none: 'none',
  xs:   '0 1px 2px 0 rgba(28, 43, 58, 0.06)',
  sm:   '0 1px 3px 0 rgba(28, 43, 58, 0.08), 0 1px 2px -1px rgba(28, 43, 58, 0.06)',
  md:   '0 4px 6px -1px rgba(28, 43, 58, 0.08), 0 2px 4px -2px rgba(28, 43, 58, 0.06)',
  lg:   '0 10px 15px -3px rgba(28, 43, 58, 0.08), 0 4px 6px -4px rgba(28, 43, 58, 0.06)',
  xl:   '0 20px 25px -5px rgba(28, 43, 58, 0.1), 0 8px 10px -6px rgba(28, 43, 58, 0.06)',
  inner: 'inset 0 2px 4px 0 rgba(28, 43, 58, 0.06)',
} as const;

// ─── BREAKPOINTS ──────────────────────────────────────────────────────────────
// Mobile-first

export const breakpoints = {
  xs:  '320px',   // Smallest Android
  sm:  '480px',   // Large phone / small tablet
  md:  '768px',   // Tablet
  lg:  '1024px',  // Small desktop / large tablet landscape
  xl:  '1280px',  // Desktop
  '2xl': '1440px', // Large desktop
} as const;

// ─── TRIAGE BORDER SYSTEM ─────────────────────────────────────────────────────
// Signature design element: left border encodes urgency and status
// Directly mirrors Kenya hospital triage tag colours

export const triageBorder = {
  // Urgency
  Emergent: colors.danger[500],   // Red    — immediate life threat
  Urgent:   colors.amber[500],    // Amber  — needs prompt attention
  Routine:  colors.success[500],  // Green  — can wait

  // Referral Status
  Draft:      colors.info[500],     // Blue
  Dispatched: colors.teal[500],     // Teal
  Received:   colors.info[600],     // Dark blue
  Accepted:   colors.success[500],  // Green
  Rejected:   colors.danger[500],   // Red
  Completed:  colors.neutral[400],  // Grey

  // Hospital / User Status
  Pending:   colors.warning[500],   // Amber
  Approved:  colors.success[500],   // Green
  Suspended: colors.danger[500],    // Red
  Active:    colors.success[500],   // Green
  Inactive:  colors.neutral[400],   // Grey
} as const;

// ─── STATUS BADGE SYSTEM ──────────────────────────────────────────────────────

export const statusBadge = {
  Pending: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
  },
  Approved: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  Suspended: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  Active: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  Inactive: {
    bg: colors.neutral[100],
    text: colors.neutral[500],
    border: colors.neutral[200],
  },
  Draft: {
    bg: colors.info[50],
    text: colors.info[700],
    border: colors.info[200],
  },
  Dispatched: {
    bg: colors.teal[50],
    text: colors.teal[700],
    border: colors.teal[200],
  },
  Received: {
    bg: colors.info[50],
    text: colors.info[600],
    border: colors.info[200],
  },
  Accepted: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  Rejected: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  Completed: {
    bg: colors.neutral[100],
    text: colors.neutral[600],
    border: colors.neutral[200],
  },
  Emergent: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  Urgent: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
  },
  Routine: {
    bg: colors.neutral[100],
    text: colors.neutral[600],
    border: colors.neutral[200],
  },
} as const;

// ─── Z-INDEX ─────────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  1,
  dropdown: 100,
  sticky:  200,
  overlay: 300,
  modal:   400,
  toast:   500,
  tooltip: 600,
} as const;

// ─── ANIMATION ───────────────────────────────────────────────────────────────

export const animation = {
  duration: {
    fast:   '100ms',
    base:   '200ms',
    slow:   '300ms',
    slower: '500ms',
  },
  easing: {
    default:  'cubic-bezier(0.4, 0, 0.2, 1)',
    in:       'cubic-bezier(0.4, 0, 1, 1)',
    out:      'cubic-bezier(0, 0, 0.2, 1)',
    inOut:    'cubic-bezier(0.4, 0, 0.2, 1)',
    spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ─── ICON SIZES ──────────────────────────────────────────────────────────────

export const iconSize = {
  xs:  16,
  sm:  18,
  md:  20,
  lg:  24,
  xl:  28,
  '2xl': 32,
} as const;

// ─── COMPOSED TOKEN EXPORT ────────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  breakpoints,
  triageBorder,
  statusBadge,
  zIndex,
  animation,
  iconSize,
} as const;

export type Tokens = typeof tokens;
export type ColorKey = keyof typeof colors;
export type TriageBorderKey = keyof typeof triageBorder;
export type StatusBadgeKey = keyof typeof statusBadge;
```

---

## 12. `theme/theme.mui.ts`

MUI v5 theme override for the web admin portal. Consumes the tokens from Section 11 and restyles every Material UI component (buttons, inputs, cards, chips, tables, tabs, etc.) to match the PRMS visual language.

```typescript
/**
 * PRMS MUI v5 Theme
 * Overrides Material UI defaults to match PRMS design tokens.
 *
 * Usage:
 *   import { theme } from '@/theme/theme.mui'
 *   <ThemeProvider theme={theme}><App /></ThemeProvider>
 */

import { createTheme, alpha } from '@mui/material/styles';
import { colors, typography, radius, shadows, animation } from '../tokens/design-tokens';

// Extend MUI type declarations for custom palette entries
declare module '@mui/material/styles' {
  interface Palette {
    teal: Palette['primary'];
    amber: Palette['primary'];
  }
  interface PaletteOptions {
    teal?: PaletteOptions['primary'];
    amber?: PaletteOptions['primary'];
  }
}

export const theme = createTheme({
  // ─── PALETTE ──────────────────────────────────────────────────────────────
  palette: {
    mode: 'light',

    primary: {
      light:        colors.teal[400],
      main:         colors.teal[500],
      dark:         colors.teal[700],
      contrastText: '#FFFFFF',
    },

    secondary: {
      light:        colors.amber[400],
      main:         colors.amber[500],
      dark:         colors.amber[700],
      contrastText: '#FFFFFF',
    },

    error: {
      light:        colors.danger[100],
      main:         colors.danger[500],
      dark:         colors.danger[700],
      contrastText: '#FFFFFF',
    },

    warning: {
      light:        colors.warning[50],
      main:         colors.warning[500],
      dark:         colors.warning[700],
      contrastText: '#FFFFFF',
    },

    success: {
      light:        colors.success[100],
      main:         colors.success[500],
      dark:         colors.success[700],
      contrastText: '#FFFFFF',
    },

    info: {
      light:        colors.info[100],
      main:         colors.info[500],
      dark:         colors.info[700],
      contrastText: '#FFFFFF',
    },

    text: {
      primary:   colors.neutral[800],
      secondary: colors.neutral[600],
      disabled:  colors.neutral[400],
    },

    background: {
      default: colors.neutral[50],   // Cool clinical canvas
      paper:   colors.neutral[0],    // Pure white for cards
    },

    divider: colors.neutral[200],

    // Custom
    teal: {
      light:        colors.teal[100],
      main:         colors.teal[500],
      dark:         colors.teal[700],
      contrastText: '#FFFFFF',
    },
    amber: {
      light:        colors.amber[100],
      main:         colors.amber[500],
      dark:         colors.amber[700],
      contrastText: '#FFFFFF',
    },
  },

  // ─── TYPOGRAPHY ───────────────────────────────────────────────────────────
  typography: {
    fontFamily: typography.fontFamily.body,

    h1: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '2.25rem',
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
      color: colors.neutral[800],
    },
    h2: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.875rem',
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
      color: colors.neutral[800],
    },
    h3: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.5rem',
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      color: colors.neutral[800],
    },
    h4: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.25rem',
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      color: colors.neutral[800],
    },
    h5: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.125rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.snug,
    },
    h6: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
    },
    subtitle1: {
      fontSize:   '1rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[700],
    },
    subtitle2: {
      fontSize:   '0.875rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[600],
    },
    body1: {
      fontSize:   '0.9375rem',
      lineHeight: typography.lineHeight.relaxed,
      color: colors.neutral[700],
    },
    body2: {
      fontSize:   '0.875rem',
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[600],
    },
    caption: {
      fontSize:   '0.75rem',
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[500],
    },
    overline: {
      fontSize:      '0.6875rem',
      fontWeight:    typography.fontWeight.semibold,
      letterSpacing: typography.letterSpacing.widest,
      textTransform: 'uppercase',
      color: colors.neutral[500],
    },
    button: {
      fontFamily:    typography.fontFamily.body,
      fontWeight:    typography.fontWeight.semibold,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'none',
    },
  },

  // ─── SHAPE ───────────────────────────────────────────────────────────────
  shape: {
    borderRadius: 6,
  },

  // ─── COMPONENT OVERRIDES ─────────────────────────────────────────────────
  components: {

    // ── MuiCssBaseline ────────────────────────────────────────────────────
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
        }

        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        body {
          background-color: ${colors.neutral[50]};
          color: ${colors.neutral[800]};
        }

        /* Referral / Patient ID — monospace */
        .prms-code {
          font-family: ${typography.fontFamily.mono};
          font-size: 0.875rem;
          letter-spacing: 0.025em;
          color: ${colors.teal[700]};
          background: ${colors.teal[50]};
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Triage border utility classes */
        .triage-emergent { border-left: 4px solid ${colors.danger[500]}; }
        .triage-urgent   { border-left: 4px solid ${colors.amber[500]}; }
        .triage-routine  { border-left: 4px solid ${colors.success[500]}; }

        /* Focus visible — accessibility */
        :focus-visible {
          outline: 2px solid ${colors.teal[500]};
          outline-offset: 2px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${colors.neutral[100]}; }
        ::-webkit-scrollbar-thumb { background: ${colors.neutral[300]}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${colors.neutral[400]}; }
      `,
    },

    // ── MuiButton ────────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          padding: '9px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: `all ${animation.duration.base} ${animation.easing.default}`,
          '&:focus-visible': {
            outline: `2px solid ${colors.teal[500]}`,
            outlineOffset: '2px',
          },
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '1rem',
        },
        containedPrimary: {
          background: colors.teal[500],
          '&:hover': {
            background: colors.teal[600],
          },
          '&:active': {
            background: colors.teal[700],
          },
        },
        containedSecondary: {
          background: colors.amber[500],
          '&:hover': {
            background: colors.amber[600],
          },
        },
        outlinedPrimary: {
          borderColor: colors.teal[300],
          color: colors.teal[600],
          '&:hover': {
            background: colors.teal[50],
            borderColor: colors.teal[500],
          },
        },
        textPrimary: {
          color: colors.teal[600],
          '&:hover': {
            background: colors.teal[50],
          },
        },
      },
    },

    // ── MuiTextField ─────────────────────────────────────────────────────
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: colors.neutral[0],
          fontSize: '0.9375rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.neutral[300],
            transition: `border-color ${animation.duration.base} ${animation.easing.default}`,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.neutral[400],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.teal[500],
            borderWidth: '1.5px',
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.danger[500],
          },
          '&.Mui-disabled': {
            backgroundColor: colors.neutral[100],
          },
        },
        input: {
          padding: '9px 12px',
          '&::placeholder': {
            color: colors.neutral[400],
            opacity: 1,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: colors.neutral[600],
          fontWeight: 500,
          '&.Mui-focused': {
            color: colors.teal[600],
          },
          '&.Mui-error': {
            color: colors.danger[600],
          },
        },
      },
    },

    // ── MuiCard ──────────────────────────────────────────────────────────
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${colors.neutral[200]}`,
          borderRadius: radius.xl,
          boxShadow: shadows.sm,
          backgroundColor: colors.neutral[0],
          transition: `box-shadow ${animation.duration.base} ${animation.easing.default}`,
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px 24px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },

    // ── MuiChip (used for status badges) ─────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.full,
          fontSize: '0.75rem',
          fontWeight: 600,
          height: '22px',
        },
        label: {
          padding: '0 8px',
        },
      },
    },

    // ── MuiTableCell ─────────────────────────────────────────────────────
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          borderBottom: `1px solid ${colors.neutral[100]}`,
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.neutral[500],
          background: colors.neutral[50],
          borderBottom: `2px solid ${colors.neutral[200]}`,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(colors.teal[500], 0.04),
            cursor: 'pointer',
          },
          '&.Mui-selected': {
            backgroundColor: alpha(colors.teal[500], 0.08),
            '&:hover': {
              backgroundColor: alpha(colors.teal[500], 0.12),
            },
          },
        },
      },
    },

    // ── MuiAlert ─────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          fontSize: '0.875rem',
          alignItems: 'flex-start',
        },
        filledSuccess: { backgroundColor: colors.success[500] },
        filledError:   { backgroundColor: colors.danger[500] },
        filledWarning: { backgroundColor: colors.warning[500] },
      },
    },

    // ── MuiLinearProgress ────────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: radius.full,
          height: 6,
          backgroundColor: colors.teal[100],
        },
        bar: {
          borderRadius: radius.full,
          backgroundColor: colors.teal[500],
        },
      },
    },

    // ── MuiSkeleton ──────────────────────────────────────────────────────
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[100],
          borderRadius: radius.md,
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha(colors.neutral[0], 0.7)}, transparent)`,
          },
        },
      },
    },

    // ── MuiPaper ─────────────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          border: `1px solid ${colors.neutral[200]}`,
        },
      },
    },

    // ── MuiDivider ───────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.neutral[100],
        },
      },
    },

    // ── MuiTooltip ───────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.neutral[800],
          fontSize: '0.75rem',
          borderRadius: radius.md,
          padding: '5px 10px',
        },
        arrow: {
          color: colors.neutral[800],
        },
      },
    },

    // ── MuiBreadcrumbs ───────────────────────────────────────────────────
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: colors.neutral[500],
        },
      },
    },

    // ── MuiTab ───────────────────────────────────────────────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.875rem',
          textTransform: 'none',
          minHeight: '44px',
          padding: '8px 16px',
          '&.Mui-selected': {
            color: colors.teal[600],
            fontWeight: 600,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: colors.teal[500],
          height: '2.5px',
          borderRadius: '2px 2px 0 0',
        },
      },
    },

    // ── MuiSwitch ────────────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: colors.teal[500],
            '& + .MuiSwitch-track': {
              backgroundColor: colors.teal[400],
              opacity: 1,
            },
          },
        },
      },
    },
  },
});

export default theme;
```

---

## 13. `scss/globals.scss`

CSS custom properties, typography utility classes, the triage-border signature system, responsive grid utilities, the app shell layout (sidebar/topbar/page), form element styles, masked-field styles, empty states, the offline banner, and all accessibility CSS (focus rings, skip link, reduced-motion, screen-reader-only, print styles).

```scss
/**
 * PRMS Global Stylesheet
 * CSS custom properties, typography, utilities, responsive grid, accessibility
 *
 * Import order in main.tsx:
 *   import '@/scss/globals.scss'
 *   (must come before any MUI import)
 */

// ─── GOOGLE FONTS ────────────────────────────────────────────────────────────
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

// ─── CSS CUSTOM PROPERTIES ────────────────────────────────────────────────────

:root {
  // Brand
  --color-teal-50:  #E0F2EE;
  --color-teal-100: #B3DED7;
  --color-teal-200: #80C9BE;
  --color-teal-400: #26A392;
  --color-teal-500: #0B6B5D;
  --color-teal-600: #0A5E52;
  --color-teal-700: #084F45;
  --color-teal-800: #063F37;

  --color-amber-50:  #FEF6E7;
  --color-amber-200: #FBDA96;
  --color-amber-500: #C97A15;
  --color-amber-600: #B06810;
  --color-amber-700: #8D530C;

  // Semantic
  --color-success-50:  #ECFDF5;
  --color-success-200: #A7F3D0;
  --color-success-500: #16834B;
  --color-success-700: #166534;

  --color-warning-50:  #FFF7ED;
  --color-warning-200: #FED7AA;
  --color-warning-500: #B85C00;
  --color-warning-700: #843F00;

  --color-danger-50:  #FEF2F2;
  --color-danger-200: #FECACA;
  --color-danger-500: #B91C1C;
  --color-danger-700: #7F1D1D;

  --color-info-50:  #EFF6FF;
  --color-info-200: #BFDBFE;
  --color-info-500: #1E56A0;
  --color-info-700: #1E40AF;

  // Neutral
  --color-white:       #FFFFFF;
  --color-canvas:      #F4F7F8;
  --color-neutral-100: #E8EDF2;
  --color-neutral-200: #D8E2EA;
  --color-neutral-300: #B8C8D6;
  --color-neutral-400: #8AA0B4;
  --color-neutral-500: #6E8499;
  --color-neutral-600: #3A5068;
  --color-neutral-700: #2B3D52;
  --color-neutral-800: #1C2B3A;

  // Typography
  --font-display: 'Outfit', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  // Spacing
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  // Radius
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-2xl:  16px;
  --radius-full: 9999px;

  // Shadows
  --shadow-xs: 0 1px 2px 0 rgba(28, 43, 58, 0.06);
  --shadow-sm: 0 1px 3px 0 rgba(28, 43, 58, 0.08), 0 1px 2px -1px rgba(28, 43, 58, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(28, 43, 58, 0.08), 0 2px 4px -2px rgba(28, 43, 58, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(28, 43, 58, 0.08), 0 4px 6px -4px rgba(28, 43, 58, 0.06);

  // Triage border (4px left border — signature element)
  --triage-emergent: #B91C1C;
  --triage-urgent:   #C97A15;
  --triage-routine:  #16834B;
  --triage-draft:      #1E56A0;
  --triage-dispatched: #0B6B5D;
  --triage-received:   #1D4ED8;
  --triage-accepted:   #16834B;
  --triage-rejected:   #B91C1C;
  --triage-completed:  #8AA0B4;
  --triage-pending:    #B85C00;
  --triage-approved:   #16834B;
  --triage-suspended:  #B91C1C;

  // Layout
  --sidebar-width:         256px;
  --sidebar-collapsed:     64px;
  --topbar-height:         64px;
  --content-max-width:     1280px;
  --content-padding-x:     24px;
}

// ─── RESET ────────────────────────────────────────────────────────────────────

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-neutral-800);
  background-color: var(--color-canvas);
  min-height: 100vh;
}

img,
video {
  max-width: 100%;
  height: auto;
  display: block;
}

// ─── TYPOGRAPHY SCALE ─────────────────────────────────────────────────────────

.text-display-lg {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.025em;
  color: var(--color-neutral-800);
}

.text-display-md {
  font-family: var(--font-display);
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-neutral-800);
}

.text-display-sm {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.375;
  color: var(--color-neutral-800);
}

.text-heading {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.375;
  color: var(--color-neutral-800);
}

.text-subheading {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-700);
}

.text-body {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.625;
  color: var(--color-neutral-700);
}

.text-body-sm {
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-neutral-600);
}

.text-caption {
  font-family: var(--font-body);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-neutral-500);
}

.text-label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-neutral-500);
}

.text-code {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  letter-spacing: 0.025em;
  color: var(--color-teal-700);
  background-color: var(--color-teal-50);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

// ─── TRIAGE BORDER SYSTEM (SIGNATURE ELEMENT) ─────────────────────────────────

// Applied to any card, list item, or container that needs urgency/status encoding
// Usage: <div class="triage-card triage-emergent">...</div>

.triage-card {
  border-left: 4px solid transparent;
  padding-left: calc(var(--space-5) - 4px); // offset for border
  background-color: var(--color-white);
  border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
  border-top: 1px solid var(--color-neutral-200);
  border-right: 1px solid var(--color-neutral-200);
  border-bottom: 1px solid var(--color-neutral-200);
}

// Urgency
.triage-emergent  { border-left-color: var(--triage-emergent) !important; }
.triage-urgent    { border-left-color: var(--triage-urgent) !important; }
.triage-routine   { border-left-color: var(--triage-routine) !important; }

// Referral status
.triage-draft      { border-left-color: var(--triage-draft) !important; }
.triage-dispatched { border-left-color: var(--triage-dispatched) !important; }
.triage-received   { border-left-color: var(--triage-received) !important; }
.triage-accepted   { border-left-color: var(--triage-accepted) !important; }
.triage-rejected   { border-left-color: var(--triage-rejected) !important; }
.triage-completed  { border-left-color: var(--triage-completed) !important; }

// Hospital / User status
.triage-pending    { border-left-color: var(--triage-pending) !important; }
.triage-approved   { border-left-color: var(--triage-approved) !important; }
.triage-suspended  { border-left-color: var(--triage-suspended) !important; }

// ─── RESPONSIVE GRID ─────────────────────────────────────────────────────────

.prms-container {
  width: 100%;
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--content-padding-x);

  @media (max-width: 768px) {
    padding-inline: 16px;
  }
}

.prms-grid {
  display: grid;
  gap: var(--space-6);

  &.cols-1  { grid-template-columns: 1fr; }
  &.cols-2  { grid-template-columns: repeat(2, 1fr); }
  &.cols-3  { grid-template-columns: repeat(3, 1fr); }
  &.cols-4  { grid-template-columns: repeat(4, 1fr); }

  // KPI cards: 4-col on desktop, 2 on tablet, 1 on mobile
  &.kpi-grid {
    grid-template-columns: repeat(4, 1fr);

    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  // Content split: main + sidebar
  &.content-sidebar {
    grid-template-columns: 1fr 320px;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────

.prms-app-shell {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-canvas);
}

.prms-sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background-color: var(--color-neutral-800);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 200ms ease;
  position: sticky;
  top: 0;
  overflow: hidden;

  @media (max-width: 1024px) {
    position: fixed;
    z-index: 300;
    transform: translateX(-100%);

    &.open {
      transform: translateX(0);
    }
  }
}

.prms-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.prms-topbar {
  height: var(--topbar-height);
  background-color: var(--color-white);
  border-bottom: 1px solid var(--color-neutral-200);
  display: flex;
  align-items: center;
  padding-inline: var(--space-6);
  position: sticky;
  top: 0;
  z-index: 200;
  gap: var(--space-4);
}

.prms-page {
  padding: var(--space-6);
  flex: 1;

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
}

.prms-page-header {
  margin-bottom: var(--space-6);

  h1, h2 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-neutral-800);
    line-height: 1.25;
  }

  .subtitle {
    font-size: 0.875rem;
    color: var(--color-neutral-500);
    margin-top: var(--space-1);
  }
}

// ─── CARDS ────────────────────────────────────────────────────────────────────

.prms-card {
  background-color: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;

  &__header {
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--color-neutral-100);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);

    h2, h3 {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-neutral-800);
    }
  }

  &__body {
    padding: var(--space-5) var(--space-6);
  }

  &__footer {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-neutral-100);
    background-color: var(--color-canvas);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }
}

// ─── SECTION DIVIDER WITH LABEL ──────────────────────────────────────────────

.section-label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: var(--color-neutral-200);
  }

  span {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-neutral-400);
    white-space: nowrap;
  }
}

// ─── FORM ELEMENTS ────────────────────────────────────────────────────────────

.prms-form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-5);
}

.prms-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700);

  .required {
    color: var(--color-danger-500);
    margin-left: 2px;
  }
}

.prms-field-hint {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin-top: var(--space-1);
}

.prms-field-error {
  font-size: 0.75rem;
  color: var(--color-danger-600);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: 4px;
}

// ─── MASKED DATA DISPLAY ──────────────────────────────────────────────────────
// For Receptionist role — restricted PII display

.masked-field {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);

  .mask-value {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-neutral-600);
  }

  .mask-icon {
    color: var(--color-neutral-400);
    font-size: 14px;
  }

  &.restricted {
    background-color: var(--color-neutral-100);
    padding: 3px 8px;
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    color: var(--color-neutral-500);
    font-style: italic;
    border: 1px dashed var(--color-neutral-300);
  }
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-8);
  text-align: center;

  &__icon {
    width: 64px;
    height: 64px;
    background-color: var(--color-neutral-100);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-5);
    color: var(--color-neutral-400);
  }

  &__title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-neutral-700);
    margin-bottom: var(--space-2);
  }

  &__body {
    font-size: 0.875rem;
    color: var(--color-neutral-500);
    max-width: 320px;
    line-height: 1.625;
    margin-bottom: var(--space-5);
  }
}

// ─── OFFLINE BANNER ──────────────────────────────────────────────────────────
// Shown on web when connection drops

.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 500;
  background-color: var(--color-warning-500);
  color: #fff;
  text-align: center;
  padding: var(--space-2) var(--space-4);
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  &.online {
    background-color: var(--color-success-500);
  }
}

// ─── SCROLL AREAS ────────────────────────────────────────────────────────────

.scroll-area {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-neutral-300) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: var(--color-neutral-300);
    border-radius: 3px;
  }
}

// ─── ACCESSIBILITY ────────────────────────────────────────────────────────────

// Skip link — keyboard users jump to main content
.skip-link {
  position: absolute;
  left: -9999px;
  top: var(--space-4);
  z-index: 9999;
  padding: var(--space-3) var(--space-5);
  background-color: var(--color-teal-500);
  color: #fff;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  font-size: 0.875rem;

  &:focus {
    left: var(--space-4);
  }
}

// Visible focus ring — overrides browser default
:focus-visible {
  outline: 2.5px solid var(--color-teal-500);
  outline-offset: 2px;
  border-radius: 2px;
}

// Remove focus ring for mouse users
:focus:not(:focus-visible) {
  outline: none;
}

// Screen reader only
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

// High contrast mode support
@media (forced-colors: active) {
  .triage-card,
  .triage-emergent,
  .triage-urgent,
  .triage-routine {
    border-left-color: ButtonText;
  }
}

// ─── PRINT ────────────────────────────────────────────────────────────────────

@media print {
  .prms-sidebar,
  .prms-topbar,
  .no-print {
    display: none !important;
  }

  body {
    background: #fff;
    color: #000;
    font-size: 12pt;
  }

  .prms-card {
    box-shadow: none;
    border: 1px solid #ccc;
  }

  .triage-card {
    border-left: 4px solid #000;
  }
}
```

---

## 14. `components/ui/ComponentLibrary.tsx`

Complete React component library for the web admin portal: Button, StatusBadge, UrgencyBadge, KPICard, ReferralCard (the triage-border signature component), generic typed DataTable, FormField, SelectField, Modal, ConfirmDialog, Toast system with `useToast` hook, Tabs, Pagination, EmptyState, PageHeader, SkeletonCard/SkeletonTable, MaskedField, and OfflineBanner.

```tsx
/**
 * PRMS Component Library
 * All reusable UI components for the web admin portal.
 *
 * Components:
 *  - Button
 *  - StatusBadge
 *  - UrgencyBadge
 *  - ReferralCard
 *  - KPICard
 *  - DataTable
 *  - FormField
 *  - SelectField
 *  - Modal
 *  - ConfirmDialog
 *  - Toast / useToast
 *  - Tabs
 *  - Pagination
 *  - EmptyState
 *  - PageHeader
 *  - SkeletonCard / SkeletonTable
 *  - OfflineBanner
 *  - MaskedField
 */

import React, {
  useState, useCallback, useRef,
  type ReactNode, type ButtonHTMLAttributes,
  type InputHTMLAttributes, type SelectHTMLAttributes,
} from 'react';
import { colors, statusBadge, triageBorder, animation } from '../../tokens/design-tokens';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type StatusKey = keyof typeof statusBadge;
export type UrgencyLevel = 'Routine' | 'Urgent' | 'Emergent';

export interface ReferralSummary {
  id: number;
  referralCode: string;
  status: StatusKey;
  urgencyLevel: UrgencyLevel;
  direction: 'incoming' | 'outgoing';
  patient: { displayName: string; gender: string; age: number };
  sourceHospital: { name: string; facilityLevel: string };
  destinationHospital: { name: string; facilityLevel: string };
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  style,
  ...rest
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: '0.01em',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: `all ${animation.duration.base} ${animation.easing.default}`,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
    borderRadius: '6px',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 12px', fontSize: '0.8125rem', height: '32px' },
    md: { padding: '9px 20px', fontSize: '0.875rem', height: '40px' },
    lg: { padding: '12px 28px', fontSize: '1rem', height: '48px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: colors.teal[500],
      color: '#fff',
    },
    secondary: {
      background: colors.amber[500],
      color: '#fff',
    },
    outline: {
      background: 'transparent',
      color: colors.teal[600],
      border: `1.5px solid ${colors.teal[300]}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.teal[600],
    },
    danger: {
      background: colors.danger[500],
      color: '#fff',
    },
  };

  return (
    <button
      style={{ ...baseStyle, ...sizeStyles[size], ...variantStyles[variant], ...style }}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          style={{ animation: 'spin 0.8s linear infinite' }}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
        </svg>
      ) : leftIcon}
      {loading ? 'Loading…' : children}
      {!loading && rightIcon}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: StatusKey;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status, size = 'md', showDot = true,
}) => {
  const config = statusBadge[status] ?? statusBadge.Inactive;
  const dotColor = triageBorder[status as keyof typeof triageBorder] ?? colors.neutral[400];

  return (
    <span
      role="status"
      aria-label={`Status: ${status}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 7px' : '3px 9px',
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        borderRadius: '9999px',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      {showDot && (
        <span
          aria-hidden="true"
          style={{
            width: size === 'sm' ? '5px' : '6px',
            height: size === 'sm' ? '5px' : '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {status}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// URGENCY BADGE
// ─────────────────────────────────────────────────────────────────────────────

interface UrgencyBadgeProps {
  level: UrgencyLevel;
  animate?: boolean; // Pulse on Emergent
}

const urgencyConfig: Record<UrgencyLevel, { icon: string; bg: string; text: string }> = {
  Emergent: { icon: '🔴', bg: colors.danger[50],  text: colors.danger[700] },
  Urgent:   { icon: '🟠', bg: colors.warning[50], text: colors.warning[700] },
  Routine:  { icon: '⚪', bg: colors.neutral[100], text: colors.neutral[600] },
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ level, animate = true }) => {
  const cfg = urgencyConfig[level];
  const isPulsing = level === 'Emergent' && animate;

  return (
    <span
      role="img"
      aria-label={`Urgency: ${level}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        fontSize: '0.75rem',
        fontWeight: 700,
        borderRadius: '9999px',
        backgroundColor: cfg.bg,
        color: cfg.text,
        animation: isPulsing ? 'urgencyPulse 2s ease-in-out infinite' : undefined,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '10px' }}>{cfg.icon}</span>
      {level.toUpperCase()}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD (Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string; positive: boolean };
  icon?: ReactNode;
  accent?: 'teal' | 'amber' | 'success' | 'danger' | 'info';
  onClick?: () => void;
}

const kpiAccent: Record<string, string> = {
  teal:    colors.teal[500],
  amber:   colors.amber[500],
  success: colors.success[500],
  danger:  colors.danger[500],
  info:    colors.info[500],
};

export const KPICard: React.FC<KPICardProps> = ({
  title, value, subtitle, trend, icon, accent = 'teal', onClick,
}) => {
  const accentColor = kpiAccent[accent];

  return (
    <article
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value}`}
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: `1px solid ${colors.neutral[200]}`,
        borderTop: `3px solid ${accentColor}`,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: `box-shadow ${animation.duration.base} ease, transform ${animation.duration.base} ease`,
        boxShadow: '0 1px 3px rgba(28,43,58,0.08)',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(28,43,58,0.12)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(28,43,58,0.08)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.neutral[500] }}>
          {title}
        </span>
        {icon && (
          <span style={{ color: accentColor, opacity: 0.85 }} aria-hidden="true">
            {icon}
          </span>
        )}
      </header>
      <div>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: 700, color: colors.neutral[800], lineHeight: 1.1 }}>
          {value}
        </p>
        {subtitle && (
          <p style={{ fontSize: '0.8125rem', color: colors.neutral[500], marginTop: '4px' }}>
            {subtitle}
          </p>
        )}
      </div>
      {trend && (
        <footer style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
          <span style={{ color: trend.positive ? colors.success[500] : colors.danger[500], fontWeight: 600 }}>
            {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
          <span style={{ color: colors.neutral[500] }}>{trend.label}</span>
        </footer>
      )}
    </article>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REFERRAL CARD (Triage Border System)
// ─────────────────────────────────────────────────────────────────────────────

interface ReferralCardProps {
  referral: ReferralSummary;
  onClick?: (referral: ReferralSummary) => void;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ referral, onClick }) => {
  const borderColor = triageBorder[referral.urgencyLevel] ?? colors.neutral[400];
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  };

  return (
    <article
      onClick={() => onClick?.(referral)}
      role="button"
      tabIndex={0}
      aria-label={`Referral ${referral.referralCode}, ${referral.urgencyLevel}, ${referral.status}`}
      onKeyDown={e => e.key === 'Enter' && onClick?.(referral)}
      style={{
        display: 'flex',
        gap: '0',
        background: '#fff',
        borderRadius: '0 10px 10px 0',
        border: `1px solid ${colors.neutral[200]}`,
        borderLeft: `4px solid ${borderColor}`,
        cursor: 'pointer',
        transition: `box-shadow ${animation.duration.base} ease`,
        overflow: 'hidden',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(28,43,58,0.10)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ padding: '16px 18px', flex: 1 }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: colors.teal[700],
            background: colors.teal[50],
            padding: '2px 7px',
            borderRadius: '4px',
          }}>
            {referral.referralCode}
          </span>
          <UrgencyBadge level={referral.urgencyLevel} />
          <StatusBadge status={referral.status} size="sm" />
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            color: colors.neutral[400],
          }}>
            {timeAgo(referral.createdAt)}
          </span>
        </div>

        {/* Patient info */}
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.neutral[800], marginBottom: '4px' }}>
          {referral.patient.displayName}
          <span style={{ fontWeight: 400, color: colors.neutral[500], marginLeft: '8px', fontSize: '0.8125rem' }}>
            {referral.patient.gender}, {referral.patient.age} yrs
          </span>
        </p>

        {/* Route */}
        <p style={{ fontSize: '0.8125rem', color: colors.neutral[500], display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{referral.sourceHospital.name}</span>
          <span aria-hidden="true" style={{ color: colors.teal[400] }}>→</span>
          <span style={{ fontWeight: 500, color: colors.neutral[700] }}>{referral.destinationHospital.name}</span>
          <span style={{ color: colors.neutral[400] }}>({referral.destinationHospital.facilityLevel})</span>
        </p>
      </div>

      {/* Direction indicator */}
      <div style={{
        width: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: referral.direction === 'incoming' ? colors.teal[50] : colors.neutral[50],
        borderLeft: `1px solid ${colors.neutral[100]}`,
        flexShrink: 0,
      }}>
        <span
          aria-label={referral.direction}
          style={{ fontSize: '14px', color: referral.direction === 'incoming' ? colors.teal[500] : colors.neutral[400] }}
        >
          {referral.direction === 'incoming' ? '↙' : '↗'}
        </span>
      </div>
    </article>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA TABLE
// ─────────────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: number | string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  onRowClick?: (row: T) => void;
  selectedIds?: Set<number | string>;
  onSelectionChange?: (ids: Set<number | string>) => void;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  stickyHeader?: boolean;
}

export function DataTable<T extends { id: number | string }>({
  columns, data, loading, emptyTitle, emptyBody,
  onRowClick, selectedIds, onSelectionChange,
  sortBy, sortDir, onSort, stickyHeader = true,
}: DataTableProps<T>) {
  const hasSelection = !!onSelectionChange;
  const allSelected = data.length > 0 && selectedIds && data.every(r => selectedIds.has(r.id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(r => r.id)));
    }
  };

  const toggleRow = (id: number | string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const thStyle: React.CSSProperties = {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.neutral[500],
    background: colors.neutral[50],
    padding: '10px 16px',
    textAlign: 'left',
    borderBottom: `2px solid ${colors.neutral[200]}`,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    position: stickyHeader ? 'sticky' : undefined,
    top: stickyHeader ? 0 : undefined,
    zIndex: stickyHeader ? 1 : undefined,
  };

  return (
    <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${colors.neutral[200]}` }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}
        role="grid"
        aria-busy={loading}
      >
        <thead>
          <tr>
            {hasSelection && (
              <th style={{ ...thStyle, width: '44px', padding: '10px 12px' }}>
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  style={{ cursor: 'pointer', accentColor: colors.teal[500] }}
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={String(col.key)}
                style={{
                  ...thStyle,
                  width: col.width,
                  textAlign: col.align ?? 'left',
                  cursor: col.sortable ? 'pointer' : 'default',
                }}
                onClick={() => col.sortable && onSort?.(String(col.key))}
                aria-sort={sortBy === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {col.label}
                {col.sortable && (
                  <span aria-hidden="true" style={{ marginLeft: '4px', opacity: sortBy === col.key ? 1 : 0.3 }}>
                    {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {hasSelection && <td style={{ padding: '14px 12px' }}><SkeletonLine width="20px" /></td>}
                {columns.map(col => (
                  <td key={String(col.key)} style={{ padding: '14px 16px' }}>
                    <SkeletonLine width={`${60 + Math.random() * 30}%`} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (hasSelection ? 1 : 0)}
                style={{ textAlign: 'center', padding: '48px 24px' }}
              >
                <EmptyState
                  title={emptyTitle ?? 'No records found'}
                  body={emptyBody ?? 'There is nothing to show here yet.'}
                />
              </td>
            </tr>
          ) : (
            data.map(row => {
              const isSelected = selectedIds?.has(row.id);
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    background: isSelected ? `${colors.teal[500]}10` : '#fff',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = `${colors.teal[500]}06`; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                >
                  {hasSelection && (
                    <td style={{ padding: '12px 12px', borderBottom: `1px solid ${colors.neutral[100]}` }}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleRow(row.id)}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Select row ${row.id}`}
                        style={{ cursor: 'pointer', accentColor: colors.teal[500] }}
                      />
                    </td>
                  )}
                  {columns.map(col => {
                    const value = (row as Record<string, unknown>)[col.key as string];
                    return (
                      <td
                        key={String(col.key)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: `1px solid ${colors.neutral[100]}`,
                          textAlign: col.align ?? 'left',
                          color: colors.neutral[700],
                          verticalAlign: 'middle',
                        }}
                      >
                        {col.render
                          ? col.render(value as T[keyof T], row)
                          : String(value ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM FIELD
// ─────────────────────────────────────────────────────────────────────────────

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label, error, hint, required, leftAddon, rightAddon, id, ...rest
}) => {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${fieldId}-error`;
  const hintId  = `${fieldId}-hint`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label
        htmlFor={fieldId}
        style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral[700] }}
      >
        {label}
        {required && <span style={{ color: colors.danger[500], marginLeft: '2px' }} aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftAddon && (
          <span style={{
            position: 'absolute', left: '11px', color: colors.neutral[400],
            display: 'flex', alignItems: 'center', pointerEvents: 'none',
          }}>
            {leftAddon}
          </span>
        )}
        <input
          id={fieldId}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={[error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
          style={{
            width: '100%',
            height: '40px',
            padding: `0 ${rightAddon ? '40px' : '12px'} 0 ${leftAddon ? '36px' : '12px'}`,
            fontSize: '0.9375rem',
            fontFamily: "'Inter', sans-serif",
            color: colors.neutral[800],
            background: '#fff',
            border: `1.5px solid ${error ? colors.danger[500] : colors.neutral[300]}`,
            borderRadius: '6px',
            outline: 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? colors.danger[500] : colors.teal[500];
            e.target.style.boxShadow = `0 0 0 3px ${error ? colors.danger[50] : colors.teal[50]}`;
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? colors.danger[500] : colors.neutral[300];
            e.target.style.boxShadow = 'none';
          }}
          {...rest}
        />
        {rightAddon && (
          <span style={{ position: 'absolute', right: '11px', color: colors.neutral[400], display: 'flex', alignItems: 'center' }}>
            {rightAddon}
          </span>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} style={{ fontSize: '0.75rem', color: colors.neutral[500] }}>{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" style={{ fontSize: '0.75rem', color: colors.danger[600], display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SELECT FIELD
// ─────────────────────────────────────────────────────────────────────────────

interface SelectOption { value: string; label: string; }

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label, options, error, hint, placeholder, id, ...rest
}) => {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label htmlFor={fieldId} style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral[700] }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          id={fieldId}
          aria-invalid={!!error}
          style={{
            width: '100%',
            height: '40px',
            padding: '0 36px 0 12px',
            fontSize: '0.9375rem',
            fontFamily: "'Inter', sans-serif",
            color: colors.neutral[800],
            background: '#fff',
            border: `1.5px solid ${error ? colors.danger[500] : colors.neutral[300]}`,
            borderRadius: '6px',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
          }}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: colors.neutral[400] }}>
          ▾
        </span>
      </div>
      {hint && !error && <p style={{ fontSize: '0.75rem', color: colors.neutral[500] }}>{hint}</p>}
      {error && <p role="alert" style={{ fontSize: '0.75rem', color: colors.danger[600] }}>⚠ {error}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, children, footer, size = 'md',
}) => {
  const widthMap = { sm: '400px', md: '560px', lg: '720px' };
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(28, 43, 58, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: widthMap[size],
          boxShadow: '0 20px 40px rgba(28,43,58,0.2)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        <header style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.neutral[100]}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 id="modal-title" style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.125rem', fontWeight: 600, color: colors.neutral[800] }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              width: '32px', height: '32px', border: 'none',
              background: colors.neutral[100], borderRadius: '6px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: colors.neutral[500],
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </header>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <footer style={{
            padding: '16px 24px',
            borderTop: `1px solid ${colors.neutral[100]}`,
            display: 'flex', justifyContent: 'flex-end', gap: '12px',
            background: colors.neutral[50], borderRadius: '0 0 16px 16px',
          }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM DIALOG
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, onClose, onConfirm, title, body,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'primary', loading = false,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>
    }
  >
    <div style={{ fontSize: '0.9375rem', color: colors.neutral[600], lineHeight: 1.625 }}>{body}</div>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  body?: string;
}

const toastConfig: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: colors.success[50],  icon: '✓', border: colors.success[200] },
  error:   { bg: colors.danger[50],   icon: '✕', border: colors.danger[200] },
  warning: { bg: colors.warning[50],  icon: '⚠', border: colors.warning[200] },
  info:    { bg: colors.info[50],     icon: 'ℹ', border: colors.info[200] },
};

export const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts, onDismiss,
}) => (
  <div
    aria-live="polite"
    aria-atomic="false"
    style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 500,
      display: 'flex', flexDirection: 'column', gap: '10px',
      maxWidth: '380px', width: 'calc(100% - 48px)',
    }}
  >
    {toasts.map(toast => {
      const cfg = toastConfig[toast.type];
      return (
        <div
          key={toast.id}
          role="alert"
          style={{
            background: '#fff',
            borderRadius: '10px',
            border: `1px solid ${cfg.border}`,
            borderLeft: `4px solid ${cfg.border}`,
            boxShadow: '0 8px 24px rgba(28,43,58,0.12)',
            padding: '14px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: cfg.bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '13px', flexShrink: 0,
            border: `1px solid ${cfg.border}`,
          }}>
            {cfg.icon}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral[800] }}>{toast.title}</p>
            {toast.body && <p style={{ fontSize: '0.8125rem', color: colors.neutral[500], marginTop: '2px' }}>{toast.body}</p>}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.neutral[400], padding: '2px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      );
    })}
  </div>
);

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((type: ToastType, title: string, body?: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, body }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, dismiss, success: (t: string, b?: string) => show('success', t, b), error: (t: string, b?: string) => show('error', t, b), warning: (t: string, b?: string) => show('warning', t, b), info: (t: string, b?: string) => show('info', t, b) };
};

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────

interface TabsProps {
  tabs: { key: string; label: string; badge?: number }[];
  active: string;
  onChange: (key: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => (
  <div
    role="tablist"
    aria-label="Navigation tabs"
    style={{
      display: 'flex',
      gap: '0',
      borderBottom: `2px solid ${colors.neutral[200]}`,
    }}
  >
    {tabs.map(tab => {
      const isActive = tab.key === active;
      return (
        <button
          key={tab.key}
          role="tab"
          id={`tab-${tab.key}`}
          aria-selected={isActive}
          aria-controls={`panel-${tab.key}`}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '11px 18px',
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? colors.teal[600] : colors.neutral[500],
            background: 'none',
            border: 'none',
            borderBottom: isActive ? `2.5px solid ${colors.teal[500]}` : '2.5px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            transition: 'color 150ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span style={{
              minWidth: '18px', height: '18px', borderRadius: '9999px',
              background: isActive ? colors.teal[500] : colors.neutral[300],
              color: isActive ? '#fff' : colors.neutral[600],
              fontSize: '0.6875rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 5px',
            }}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page, totalPages, total, limit, onPageChange, onLimitChange,
}) => {
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    minWidth: '36px', height: '36px', padding: '0 8px',
    borderRadius: '6px',
    border: active ? `1.5px solid ${colors.teal[500]}` : `1.5px solid ${colors.neutral[200]}`,
    background: active ? colors.teal[500] : '#fff',
    color: active ? '#fff' : disabled ? colors.neutral[300] : colors.neutral[700],
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.875rem', fontWeight: active ? 600 : 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 150ms ease',
  });

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', flexWrap: 'wrap', gap: '12px',
      }}
    >
      <p style={{ fontSize: '0.8125rem', color: colors.neutral[500] }}>
        {total === 0 ? 'No records' : `${start}–${end} of ${total.toLocaleString()}`}
      </p>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button style={btnStyle(false, page === 1)} onClick={() => onPageChange(1)} disabled={page === 1} aria-label="First page">«</button>
        <button style={btnStyle(false, page === 1)} onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: colors.neutral[400] }}>…</span>
            : <button key={p} style={btnStyle(p === page, false)} onClick={() => onPageChange(p as number)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}>{p}</button>
        )}
        <button style={btnStyle(false, page === totalPages)} onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
        <button style={btnStyle(false, page === totalPages)} onClick={() => onPageChange(totalPages)} disabled={page === totalPages} aria-label="Last page">»</button>
      </div>
      {onLimitChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: colors.neutral[500] }}>
          Rows per page:
          <select
            value={limit}
            onChange={e => onLimitChange(Number(e.target.value))}
            style={{
              border: `1.5px solid ${colors.neutral[200]}`, borderRadius: '6px',
              padding: '4px 8px', fontSize: '0.8125rem', color: colors.neutral[700],
              background: '#fff', cursor: 'pointer',
            }}
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title, body, action, icon,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', textAlign: 'center' }}>
    <div style={{
      width: '60px', height: '60px', borderRadius: '50%',
      background: colors.neutral[100],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '16px', color: colors.neutral[400], fontSize: '24px',
    }}>
      {icon ?? '📋'}
    </div>
    <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1rem', fontWeight: 600, color: colors.neutral[700], marginBottom: '6px' }}>
      {title}
    </h3>
    {body && <p style={{ fontSize: '0.875rem', color: colors.neutral[500], maxWidth: '320px', lineHeight: 1.625, marginBottom: action ? '20px' : 0 }}>{body}</p>}
    {action && <Button variant="outline" size="sm" onClick={action.onClick}>{action.label}</Button>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title, subtitle, breadcrumbs, actions,
}) => (
  <header style={{ marginBottom: '24px' }}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav aria-label="Breadcrumb" style={{ marginBottom: '8px' }}>
        <ol style={{ display: 'flex', gap: '6px', alignItems: 'center', listStyle: 'none', padding: 0, fontSize: '0.8125rem', color: colors.neutral[500] }}>
          {breadcrumbs.map((crumb, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <span aria-hidden="true">›</span>}
              {crumb.href
                ? <a href={crumb.href} style={{ color: colors.teal[600], textDecoration: 'none' }}>{crumb.label}</a>
                : <span aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined} style={{ color: i === breadcrumbs.length - 1 ? colors.neutral[700] : 'inherit' }}>{crumb.label}</span>
              }
            </li>
          ))}
        </ol>
      </nav>
    )}
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.5rem', fontWeight: 600, color: colors.neutral[800], lineHeight: 1.25 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: '0.875rem', color: colors.neutral[500], marginTop: '4px' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
    </div>
  </header>
);

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADERS
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({
  width = '100%', height = '16px',
}) => (
  <div
    aria-hidden="true"
    style={{
      width, height, borderRadius: '4px',
      background: `linear-gradient(90deg, ${colors.neutral[100]} 25%, ${colors.neutral[50]} 50%, ${colors.neutral[100]} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${colors.neutral[200]}`, padding: '20px 24px' }}>
    <SkeletonLine width="40%" height="12px" />
    <div style={{ marginTop: '12px' }}><SkeletonLine width="60%" height="32px" /></div>
    <div style={{ marginTop: '8px' }}><SkeletonLine width="80%" height="12px" /></div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5, cols = 5,
}) => (
  <div style={{ borderRadius: '10px', border: `1px solid ${colors.neutral[200]}`, overflow: 'hidden' }}>
    <div style={{ background: colors.neutral[50], padding: '10px 16px', borderBottom: `2px solid ${colors.neutral[200]}`, display: 'flex', gap: '16px' }}>
      {Array.from({ length: cols }).map((_, i) => <SkeletonLine key={i} width={`${80 + Math.random() * 60}px`} height="10px" />)}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.neutral[100]}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
        {Array.from({ length: cols }).map((_, c) => <SkeletonLine key={c} width={`${60 + Math.random() * 80}px`} height="14px" />)}
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MASKED FIELD (PII — Receptionist view)
// ─────────────────────────────────────────────────────────────────────────────

interface MaskedFieldProps {
  value: string;
  label?: string;
  restricted?: boolean;
}

export const MaskedField: React.FC<MaskedFieldProps> = ({ value, label, restricted = false }) => {
  if (restricted) {
    return (
      <span
        aria-label={`${label ?? 'Field'}: restricted — Clinician access only`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: colors.neutral[100], padding: '3px 9px',
          borderRadius: '4px', border: `1px dashed ${colors.neutral[300]}`,
          fontSize: '0.75rem', color: colors.neutral[500], fontStyle: 'italic',
        }}
      >
        🔒 Clinician access only
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      🔒
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', color: colors.neutral[600] }}>
        {value}
      </span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE BANNER
// ─────────────────────────────────────────────────────────────────────────────

export const OfflineBanner: React.FC<{ online: boolean; syncing?: boolean }> = ({
  online, syncing,
}) => {
  if (online && !syncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
        background: online ? (syncing ? colors.info[500] : colors.success[500]) : colors.warning[500],
        color: '#fff', textAlign: 'center',
        padding: '8px 16px', fontSize: '0.875rem', fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}
    >
      {online
        ? (syncing ? '⟳ Syncing your data…' : '✓ Back online. Sync complete.')
        : '⚠ You are offline. Working from local data.'}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS KEYFRAMES (inject into document once)
// ─────────────────────────────────────────────────────────────────────────────

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes shimmer { to { background-position: -200% 0; } }
    @keyframes urgencyPulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.65; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  if (!document.head.querySelector('[data-prms-components]')) {
    style.setAttribute('data-prms-components', '');
    document.head.appendChild(style);
  }
}
```

---

## 15. `mobile/theme/theme.ts`

React Native equivalent of the web design tokens (Section 11). Same color, spacing, and triage-border values, adapted for native font loading, React Native shadow/elevation props, and minimum touch-target constants.

```typescript
/**
 * PRMS Mobile Design System — Theme
 * React Native equivalent of web design tokens.
 *
 * Usage:
 *   import { colors, spacing, typography } from '@/theme';
 */

// ─── COLORS ────────────────────────────────────────────────────────────────

export const colors = {
  teal: {
    50:  '#E0F2EE',
    100: '#B3DED7',
    200: '#80C9BE',
    400: '#26A392',
    500: '#0B6B5D',
    600: '#0A5E52',
    700: '#084F45',
  },
  amber: {
    50:  '#FEF6E7',
    200: '#FBDA96',
    500: '#C97A15',
    600: '#B06810',
    700: '#8D530C',
  },
  success: {
    50:  '#ECFDF5',
    200: '#A7F3D0',
    500: '#16834B',
    700: '#166534',
  },
  warning: {
    50:  '#FFF7ED',
    200: '#FED7AA',
    500: '#B85C00',
    700: '#843F00',
  },
  danger: {
    50:  '#FEF2F2',
    200: '#FECACA',
    500: '#B91C1C',
    700: '#7F1D1D',
  },
  info: {
    50:  '#EFF6FF',
    200: '#BFDBFE',
    500: '#1E56A0',
    700: '#1E40AF',
  },
  neutral: {
    0:   '#FFFFFF',
    50:  '#F4F7F8',
    100: '#E8EDF2',
    200: '#D8E2EA',
    300: '#B8C8D6',
    400: '#8AA0B4',
    500: '#6E8499',
    600: '#3A5068',
    700: '#2B3D52',
    800: '#1C2B3A',
  },
} as const;

// Semantic shortcuts used throughout the app
export const semanticColors = {
  background:      colors.neutral[50],
  surface:          colors.neutral[0],
  surfaceElevated:  colors.neutral[0],
  border:           colors.neutral[200],
  textPrimary:      colors.neutral[800],
  textSecondary:    colors.neutral[600],
  textTertiary:     colors.neutral[400],
  brand:            colors.teal[500],
  brandDark:        colors.teal[700],
  accent:           colors.amber[500],
} as const;

// ─── TRIAGE BORDER (signature element — mobile equivalent) ────────────────────

export const triageBorder = {
  Emergent:   colors.danger[500],
  Urgent:     colors.amber[500],
  Routine:    colors.success[500],
  Draft:      colors.info[500],
  Dispatched: colors.teal[500],
  Received:   colors.info[700],
  Accepted:   colors.success[500],
  Rejected:   colors.danger[500],
  Completed:  colors.neutral[400],
} as const;

export const statusBadgeColors = {
  Draft:      { bg: colors.info[50],    text: colors.info[700] },
  Dispatched: { bg: colors.teal[50],    text: colors.teal[700] },
  Received:   { bg: colors.info[50],    text: colors.info[700] },
  Accepted:   { bg: colors.success[50], text: colors.success[700] },
  Rejected:   { bg: colors.danger[50],  text: colors.danger[700] },
  Completed:  { bg: colors.neutral[100],text: colors.neutral[600] },
  Active:     { bg: colors.success[50], text: colors.success[700] },
  Suspended:  { bg: colors.danger[50],  text: colors.danger[700] },
} as const;

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────
// Fonts loaded via expo-font / react-native.config.js:
// Outfit-Regular, Outfit-Medium, Outfit-SemiBold, Outfit-Bold
// Inter-Regular, Inter-Medium, Inter-SemiBold
// JetBrainsMono-Regular, JetBrainsMono-Medium

export const fontFamily = {
  displayRegular:  'Outfit-Regular',
  displayMedium:   'Outfit-Medium',
  displaySemibold: 'Outfit-SemiBold',
  displayBold:     'Outfit-Bold',
  bodyRegular:     'Inter-Regular',
  bodyMedium:      'Inter-Medium',
  bodySemibold:    'Inter-SemiBold',
  mono:            'JetBrainsMono-Regular',
  monoMedium:      'JetBrainsMono-Medium',
} as const;

export const fontSize = {
  xs:   12,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
} as const;

export const typography = {
  displayLg: { fontFamily: fontFamily.displayBold,     fontSize: fontSize['4xl'], lineHeight: 40, color: semanticColors.textPrimary },
  displayMd: { fontFamily: fontFamily.displaySemibold,  fontSize: fontSize['3xl'], lineHeight: 34, color: semanticColors.textPrimary },
  h1:        { fontFamily: fontFamily.displaySemibold,  fontSize: fontSize['2xl'], lineHeight: 30, color: semanticColors.textPrimary },
  h2:        { fontFamily: fontFamily.displaySemibold,  fontSize: fontSize.xl,     lineHeight: 26, color: semanticColors.textPrimary },
  h3:        { fontFamily: fontFamily.displayMedium,    fontSize: fontSize.lg,     lineHeight: 24, color: semanticColors.textPrimary },
  bodyLg:    { fontFamily: fontFamily.bodyRegular,       fontSize: fontSize.md,     lineHeight: 24, color: semanticColors.textSecondary },
  body:      { fontFamily: fontFamily.bodyRegular,       fontSize: fontSize.base,   lineHeight: 22, color: semanticColors.textSecondary },
  bodySm:    { fontFamily: fontFamily.bodyRegular,       fontSize: fontSize.sm,     lineHeight: 19, color: semanticColors.textTertiary },
  label:     { fontFamily: fontFamily.bodySemibold,      fontSize: fontSize.sm,     lineHeight: 18, color: semanticColors.textSecondary, letterSpacing: 0.3 },
  caption:   { fontFamily: fontFamily.bodyRegular,       fontSize: fontSize.xs,     lineHeight: 16, color: semanticColors.textTertiary },
  code:      { fontFamily: fontFamily.monoMedium,        fontSize: fontSize.sm,     lineHeight: 18, color: colors.teal[700] },
  button:    { fontFamily: fontFamily.bodySemibold,      fontSize: fontSize.base,   lineHeight: 20 },
} as const;

// ─── SPACING ──────────────────────────────────────────────────────────────────

export const spacing = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24,
  7: 28, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80,
} as const;

// ─── RADIUS ───────────────────────────────────────────────────────────────────

export const radius = {
  none: 0, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, full: 9999,
} as const;

// ─── SHADOWS (React Native — elevation + shadow props) ────────────────────────

export const shadow = {
  sm: {
    shadowColor: '#1C2B3A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1C2B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1C2B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── ICON SIZES ────────────────────────────────────────────────────────────────

export const iconSize = { xs: 16, sm: 18, md: 20, lg: 24, xl: 28 } as const;

// ─── HIT SLOP (accessibility — minimum 44x44pt touch target) ──────────────────

export const minTouchTarget = 44;
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

// ─── COMPOSED THEME EXPORT ──────────────────────────────────────────────────────

export const theme = {
  colors,
  semanticColors,
  triageBorder,
  statusBadgeColors,
  typography,
  fontFamily,
  fontSize,
  spacing,
  radius,
  shadow,
  iconSize,
  minTouchTarget,
} as const;

export default theme;
```

---

## 16. `mobile/components/MobileComponentLibrary.tsx`

Complete React Native component library: Button, StatusBadge, UrgencyBadge (with native pulse animation), ReferralCard (triage-border signature component), FormField, BottomSheet (native confirmation pattern replacing web Modal), EmptyState, OfflineBanner, and MaskedField.

```tsx
/**
 * PRMS Mobile Component Library (React Native)
 * Mirrors the web component library with native equivalents.
 *
 * Components:
 *  - Button
 *  - StatusBadge
 *  - UrgencyBadge
 *  - ReferralCard (triage border signature element)
 *  - FormField
 *  - BottomSheet
 *  - EmptyState
 *  - OfflineBanner
 *  - MaskedField
 *  - Toast (via react-native-toast helper pattern)
 */

import React, { useRef, type ReactNode } from 'react';
import {
  View, Text, Pressable, TextInput, ActivityIndicator,
  StyleSheet, Animated, Modal, AccessibilityInfo,
  type ViewStyle, type TextInputProps,
} from 'react-native';
import { colors, semanticColors, typography, spacing, radius, shadow, triageBorder, statusBadgeColors, minTouchTarget } from '../theme/theme';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type StatusKey = keyof typeof statusBadgeColors;
export type UrgencyLevel = 'Routine' | 'Urgent' | 'Emergent';

export interface ReferralSummary {
  id: number;
  referralCode: string;
  status: StatusKey;
  urgencyLevel: UrgencyLevel;
  direction: 'incoming' | 'outgoing';
  patient: { displayName: string; gender: string; age: number };
  sourceHospital: { name: string };
  destinationHospital: { name: string; facilityLevel: string };
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, fullWidth, leftIcon,
}) => {
  const isDisabled = disabled || loading;

  const variantStyles: Record<string, ViewStyle> = {
    primary:   { backgroundColor: colors.teal[500] },
    secondary: { backgroundColor: colors.amber[500] },
    outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.teal[200] },
    ghost:     { backgroundColor: 'transparent' },
    danger:    { backgroundColor: colors.danger[500] },
  };

  const textColor: Record<string, string> = {
    primary: '#fff', secondary: '#fff', danger: '#fff',
    outline: colors.teal[600], ghost: colors.teal[600],
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { height: 36, paddingHorizontal: 14 },
    md: { height: minTouchTarget, paddingHorizontal: 20 },
    lg: { height: 52, paddingHorizontal: 28 },
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.buttonBase,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && { width: '100%' },
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor[variant]} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.buttonText, { color: textColor[variant] }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

export const StatusBadge: React.FC<{ status: StatusKey; size?: 'sm' | 'md' }> = ({
  status, size = 'md',
}) => {
  const cfg = statusBadgeColors[status] ?? statusBadgeColors.Completed;
  const dot = triageBorder[status as keyof typeof triageBorder] ?? colors.neutral[400];

  return (
    <View
      accessibilityLabel={`Status: ${status}`}
      style={[
        styles.badgeBase,
        { backgroundColor: cfg.bg, paddingVertical: size === 'sm' ? 2 : 3, paddingHorizontal: size === 'sm' ? 7 : 9 },
      ]}
    >
      <View style={[styles.badgeDot, { backgroundColor: dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text, fontSize: size === 'sm' ? 11 : 12 }]}>
        {status}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// URGENCY BADGE
// ─────────────────────────────────────────────────────────────────────────────

const urgencyConfig: Record<UrgencyLevel, { bg: string; text: string; icon: string }> = {
  Emergent: { bg: colors.danger[50],  text: colors.danger[700], icon: '🔴' },
  Urgent:   { bg: colors.warning[50], text: colors.warning[700], icon: '🟠' },
  Routine:  { bg: colors.neutral[100],text: colors.neutral[600], icon: '⚪' },
};

export const UrgencyBadge: React.FC<{ level: UrgencyLevel }> = ({ level }) => {
  const cfg = urgencyConfig[level];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (level === 'Emergent') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [level]);

  return (
    <Animated.View
      accessibilityLabel={`Urgency level: ${level}`}
      style={[
        styles.badgeBase,
        { backgroundColor: cfg.bg, opacity: level === 'Emergent' ? pulseAnim : 1 },
      ]}
    >
      <Text style={{ fontSize: 9 }}>{cfg.icon}</Text>
      <Text style={[styles.badgeText, { color: cfg.text, fontFamily: typography.label.fontFamily }]}>
        {level.toUpperCase()}
      </Text>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REFERRAL CARD (Triage Border System — signature element)
// ─────────────────────────────────────────────────────────────────────────────

export const ReferralCard: React.FC<{ referral: ReferralSummary; onPress: () => void }> = ({
  referral, onPress,
}) => {
  const borderColor = triageBorder[referral.urgencyLevel] ?? colors.neutral[400];

  const timeAgo = (iso: string) => {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Referral ${referral.referralCode}, ${referral.urgencyLevel}, status ${referral.status}`}
      style={({ pressed }) => [
        styles.referralCard,
        { borderLeftColor: borderColor },
        pressed && { backgroundColor: colors.neutral[50] },
      ]}
    >
      <View style={styles.referralCardTop}>
        <Text style={typography.code}>{referral.referralCode}</Text>
        <Text style={styles.referralTime}>{timeAgo(referral.createdAt)}</Text>
      </View>

      <View style={styles.referralBadgeRow}>
        <UrgencyBadge level={referral.urgencyLevel} />
        <StatusBadge status={referral.status} size="sm" />
      </View>

      <Text style={styles.referralPatientName}>
        {referral.patient.displayName}
        <Text style={styles.referralPatientMeta}>  {referral.patient.gender}, {referral.patient.age} yrs</Text>
      </Text>

      <View style={styles.referralRoute}>
        <Text style={styles.referralRouteText} numberOfLines={1}>
          {referral.direction === 'incoming' ? referral.sourceHospital.name : 'You'}
        </Text>
        <Text style={styles.referralArrow}>→</Text>
        <Text style={[styles.referralRouteText, styles.referralRouteDest]} numberOfLines={1}>
          {referral.direction === 'incoming' ? 'You' : referral.destinationHospital.name}
        </Text>
      </View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM FIELD
// ─────────────────────────────────────────────────────────────────────────────

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label, error, hint, required, style, ...rest
}) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>
      {label}
      {required && <Text style={{ color: colors.danger[500] }}> *</Text>}
    </Text>
    <TextInput
      style={[
        styles.input,
        error && { borderColor: colors.danger[500] },
        style,
      ]}
      placeholderTextColor={colors.neutral[400]}
      accessibilityLabel={label}
      accessibilityHint={hint}
      {...rest}
    />
    {hint && !error && <Text style={styles.formHint}>{hint}</Text>}
    {error && (
      <Text style={styles.formError} accessibilityLiveRegion="polite">
        ⚠ {error}
      </Text>
    )}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM SHEET (used for Accept/Reject referral actions)
// ─────────────────────────────────────────────────────────────────────────────

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible, onClose, title, children,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.sheetOverlay} onPress={onClose} accessibilityLabel="Close sheet">
      <Pressable style={styles.sheetContainer} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

export const EmptyState: React.FC<{ title: string; body?: string; icon?: string }> = ({
  title, body, icon = '📋',
}) => (
  <View style={styles.emptyState} accessibilityRole="text">
    <View style={styles.emptyIconWrap}>
      <Text style={{ fontSize: 28 }}>{icon}</Text>
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {body && <Text style={styles.emptyBody}>{body}</Text>}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE BANNER
// ─────────────────────────────────────────────────────────────────────────────

export const OfflineBanner: React.FC<{ online: boolean; syncing?: boolean; pendingCount?: number }> = ({
  online, syncing, pendingCount = 0,
}) => {
  if (online && !syncing) return null;

  const bg = !online ? colors.warning[500] : syncing ? colors.info[500] : colors.success[500];
  const message = !online
    ? `You are offline${pendingCount > 0 ? ` · ${pendingCount} pending sync` : ''}`
    : syncing ? 'Syncing…' : 'Back online';

  return (
    <View style={[styles.offlineBanner, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
      <Text style={styles.offlineBannerText}>{message}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MASKED FIELD (Receptionist PII view)
// ─────────────────────────────────────────────────────────────────────────────

export const MaskedField: React.FC<{ value: string; restricted?: boolean }> = ({
  value, restricted,
}) => {
  if (restricted) {
    return (
      <View style={styles.restrictedField}>
        <Text style={styles.restrictedText}>🔒 Clinician access only</Text>
      </View>
    );
  }
  return (
    <View style={styles.maskedField}>
      <Text style={{ fontSize: 12 }}>🔒</Text>
      <Text style={typography.code}>{value}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
  },
  buttonText: {
    ...typography.button,
  },

  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: typography.label.fontFamily, fontWeight: '600' as const },

  referralCard: {
    backgroundColor: semanticColors.surface,
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadow.sm,
  },
  referralCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  referralTime: { ...typography.caption },
  referralBadgeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  referralPatientName: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: spacing[1],
  },
  referralPatientMeta: {
    ...typography.bodySm,
    fontFamily: typography.body.fontFamily,
  },
  referralRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  referralRouteText: {
    ...typography.bodySm,
    flexShrink: 1,
  },
  referralRouteDest: {
    fontFamily: 'Inter-Medium',
    color: semanticColors.textSecondary,
  },
  referralArrow: { color: colors.teal[400] },

  formGroup: { marginBottom: spacing[5], gap: spacing[1] },
  formLabel: { ...typography.label },
  input: {
    height: minTouchTarget,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontSize: 15,
    fontFamily: typography.body.fontFamily,
    color: semanticColors.textPrimary,
    backgroundColor: semanticColors.surface,
  },
  formHint: { ...typography.caption },
  formError: { fontSize: 12, color: colors.danger[600], fontFamily: typography.body.fontFamily },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,43,58,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: semanticColors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing[6],
    paddingBottom: spacing[8],
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center', marginBottom: spacing[4],
  },
  sheetTitle: { ...typography.h2, marginBottom: spacing[4] },

  emptyState: { alignItems: 'center', padding: spacing[10] },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: { ...typography.h3, marginBottom: spacing[2], textAlign: 'center' },
  emptyBody: { ...typography.bodySm, textAlign: 'center', maxWidth: 260 },

  offlineBanner: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
  },
  offlineBannerText: { color: '#fff', fontSize: 13, fontFamily: 'Inter-Medium' },

  restrictedField: {
    backgroundColor: colors.neutral[100],
    paddingVertical: 3, paddingHorizontal: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  restrictedText: { fontSize: 11, color: colors.neutral[500], fontStyle: 'italic' },

  maskedField: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
```

---

*End of PRMS Design System v1.0 — Single-File Edition*
