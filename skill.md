# Agent Operating Skill: Vibe Marketing & Enterprise Copywriting for AIChieve.net

## Core Directives
1. **Audience & Tone**: Uncompromising, quantitative, authoritative, and high-signal. Written exclusively for enterprise decision-makers: CTOs, CIOs, VP Infrastructure, VP Supply Chain, and Principal AI Architects. Zero corporate fluff or generic thought leadership.
2. **Structural Style (Smart Brevity)**:
   - **Lead with the systemic consequence**: Open the first sentence with the financial loss magnitude, incident probability, or operational bottleneck.
   - **5-second executive scannability**: Use bold lead-ins for every key metric and takeaway.
   - **Eliminate corporate puffery**: Strip marketing adjectives, sales throat-clearing, and generic AI analogies.
3. **Execution Ratio (95/5)**:
   - **95% AI Plumbing**: Deterministic mathematical calculations, database telemetry schemas (Supabase), n8n webhook dispatches, and responsive React component scaffolding.
   - **5% Human Taste**: Strategic risk framing, typography hierarchy calibration, and strict adherence to the Command Deck design tokens.

## Enterprise Domains
AIChieve replaces static enterprise whitepapers, PDFs, and gated case studies with embedded interactive micro-applications across its core pillars:
1. `agentic-ai-governance`: Token budget overruns, recursive loop kill switches, tool-surface access control, and prompt injection latency.
2. `gpu-compute-infrastructure`: KV-cache concurrency ceiling, prefill/decode disaggregation, rack power density thresholds, and local GPU breakeven.
3. `supply-chain-mechanics`: Carrier invoice exception recovery (ParcelProof), duty drawback forfeiture, nearshoring landed cost, and tariff cliff modeling.
4. `stack-economics`: Enterprise in-house tooling maintenance tax, vendor renewal escalation, and custom workflow deprecation risk.

## Design System Constraints (Command Deck / Industrial Minimal)
All UI components in `aichieve.net` must strictly follow `src/styles/aichieve.css`:
- **Paper / Canvas Floor**: Void `#08090b` (`--ai-void`) and Shell `#0e1116` (`--ai-shell`).
- **Panels & Surfaces**: `#141920` (`--ai-panel`) with hairline borders `rgba(255, 255, 255, 0.11)` (`--ai-line`).
- **Typography Scale**: Primary headings in `#e9eef4` (`--ai-ink`), body copy in `#b9c6d3` (`--ai-ink-2`), captions/eyebrows in `#94a3b8` (`--ai-ink-3`). Monospace fonts (`JetBrains Mono`) with uppercase tracking `tracking-[0.2em]`.
- **Accents & Signals**: Safety Amber `#e8a33d` (`--ai-signal`) for primary highlights, focus states, and signal tags. Positive delta uses Emerald `#10b981`. Alert delta uses Ruby `#ef4444`.
- **Negative Constraints**: Zero drop-shadows (`shadow-*`). Zero rounded pill gimmicks. Chrome remains industrial and hair-lined.

## Output Specifications
- **Code**: Clean React 19 / TypeScript micro-applications styled via Tailwind CSS utility classes, embedded natively via Astro client islands (`client:load` or `client:idle`).
- **Copy**: Crisp, data-backed value propositions anchored by an interactive parameter adjustment hook and immediate net yield feedback.
