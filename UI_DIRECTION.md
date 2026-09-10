# UI Visual Direction — Smart Agent Experiment

## 1. Design Concept & Visual Point of View

The Smart Agent Experiment is an **Arabic-first, academic entrepreneurial learning environment** designed for university educational-technology students acting as novice digital entrepreneurs exploring business opportunities with an AI advisor.

The visual identity follows the concept of a **"Venture Research Workspace"**:
- **A contemporary, intelligent digital workbench:** Replacing floating narrow cards and generic chat bubbles with an expansive, grounded research desk that feels deliberate, calm, and intellectually credible.
- **Architectural depth without clutter:** Personality and dignity come from disciplined proportions, generous workspace framing (1080px–1160px desktop width), high-contrast Arabic typography, and selective material surfaces.
- **Dialogue as an evolving case inquiry:** The conversational interaction unfolds like an executive case tutorial or research notebook—where the active mentor challenge acts as the visual anchor of the workspace.

---

## 2. Layout Philosophy & Spatial Geometry

- **Grounded Workspace Desk (`.workspace-frame`):**
  - Desktop max-width: approximately **1080px–1160px**, framed against a deep, tranquil green-charcoal outer canvas (`#141B1E`).
  - The working surface is a warm mineral/stone desk (`#F2EFE9`), housing soft paper reading surfaces (`#FAF8F4`) and quiet note materials.
  - Eliminates the floating, unanchored appearance on wide screens without resorting to generic dashboard sidebars or widget clutter.
- **Asymmetric Desktop Composition:**
  - **Start Screen (`/`):** Two-zone asymmetric layout. The right zone introduces the study context, scenario premise, and research assurance; the left zone holds the focused participant code interaction desk.
  - **Guided Chat Workspace (`/chat`):** Varied horizontal rhythms. The mentor prompt commands visual authority, the student reflection sits as an indented working note, the mentor feedback reads as a coaching marginalia note, and the composer is integrated directly into the workspace base.
- **Fluid Responsive Adaptation:**
  - On tablet and mobile (< 840px), the multi-zone compositions collapse cleanly into a single vertical sequence maintaining strict semantic and reading order.

---

## 3. Arabic & RTL Architecture

- **Native RTL-First:** Conceived natively for Right-to-Left (`dir="rtl"`, `lang="ar"`).
- **CSS Logical Properties:** Structural margins, paddings, and borders prioritize logical properties (`margin-inline`, `padding-inline`, `border-inline-start`, `border-inline-end`) ensuring correct natural eye tracking.
- **Generous Leading:** Arabic script ascenders and descenders breathe comfortably with line-heights calibrated between `1.75` and `1.95`.

---

## 4. Typography Strategy

- **Primary Family:** **IBM Plex Sans Arabic** loaded via Next.js native `next/font/google` (self-hosted, zero external runtime dependencies).
- **Typographic Scale & Roles:**
  - **Workspace & Screen Titles:** Bold, confident charcoal slate (`#151C20`), fluid clamp sizing (`1.75rem`–`2.125rem`).
  - **Active Mentor Prompt:** Prominent, high-contrast, authoritative typography (`1.125rem`–`1.1875rem`, `1.9` line-height).
  - **Student Reflection & Body Copy:** Crisp, readable ink (`1.0625rem`, `1.8` line-height).
  - **Coaching Notes & Captions:** Refined, slightly lighter tone (`0.95rem`–`1rem`).
  - **Role & Context Labels:** Small, bold labels with intentional letter spacing (`0.02em`).
- **Zero Faux Treatments:** No artificial letter-spacing on Arabic text, no illegible decorative calligraphy, no tiny unreadable helper text.

---

## 5. Color System & Surface Hierarchy

A deep, tranquil, and scholarly palette:
- **Outer Viewport Canvas:** Deep ink / green-charcoal (`#141B1E`) framing the workspace.
- **Workspace Desk Surface:** Warm mineral/stone (`#F2EFE9` to `#EFECE5`), providing high visual restfulness and zero screen glare.
- **Primary Reading Surface:** Soft paper (`#FAF8F4`), never harsh pure `#FFFFFF`.
- **Active Mentor Prompt Anchor (The One Bold Moment):** Rich, deep ink-forest surface (`#152420` or `#12201C`) with warm high-contrast text (`#FAF7F0`), immediately commanding intellectual focus.
- **Student Reflection Surface:** Warm quiet sand note (`#EAE5DC` to `#EFEBE2`).
- **Primary Accent:** Muted deep forest (`#1B4D3E`, hover `#143D31`).
- **Secondary Micro-Accent:** Restrained muted brass / ochre (`#9E7B3B`), used with extreme discipline for subtle boundary points.
- **Accessible Contrast:** All text/background combinations meet or exceed WCAG 2.2 AA (>= 4.5:1 for normal body text, >= 3:1 for large display elements).

---

## 6. Anti-Patterns & Prohibitions

- **NO** floating chat bubbles, rounded speech tails, or consumer messaging layouts.
- **NO** avatars for student or AI mentor.
- **NO** glowing AI orbs, neon halos, or futuristic sci-fi visual tropes.
- **NO** SaaS dashboard layouts (no side navigation, metric cards, user avatars, or notification bells).
- **NO** gamified badges, XP bars, star ratings, or congratulatory popups.
- **NO** stacked bordered rectangular cards for every turn.
- **NO RESEARCH-CUE LEAKAGE:** The UI must never introduce pedagogical hints, criteria keywords (e.g. "العميل", "المشكلة", "القيمة"), or mastery cues that could alter experimental validity.
