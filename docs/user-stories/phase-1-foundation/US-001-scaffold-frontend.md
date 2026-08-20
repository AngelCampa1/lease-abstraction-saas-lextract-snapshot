# US-001: Scaffold Frontend

**Phase:** 1 — Foundation | **Depends on:** None | **Blocks:** US-011, US-012, US-013, US-033, US-035a, US-036, US-037, US-039, US-040
**Type:** Frontend
**Estimated session size:** Medium

## Description

Initialize the Next.js 16 frontend application with all foundational tooling. This is the base every frontend story builds on — routing, type safety, styling, component library, and core dependencies. Nothing user-facing ships in this story; it exists to unblock all of Phase 2's frontend work.

## Required Skills

- `superpowers:test-driven-development` — write tests for utility functions and config validation

## Acceptance Criteria

- [ ] Next.js 16 app created with App Router and React 19
- [ ] TypeScript strict mode enabled (no `any`, no implicit returns)
- [ ] Tailwind CSS 4 configured and working
- [ ] Shadcn UI initialized with base components (Button, Card, Input, Dialog, DropdownMenu, Tabs, Badge, Skeleton, Sonner)
- [ ] Directory structure matches ARCHITECTURE.md: `app/(app)/`, `app/(auth)/`, `app/(marketing)/`, `components/ui/`, `lib/`, `hooks/`, `types/`
- [ ] Core dependencies installed: TanStack Query, React Hook Form, Zod, react-dropzone, next-themes, motion (v11+)
- [ ] ESLint + Prettier configured with consistent rules
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] Animation design tokens file created at `frontend/lib/animations.ts` with shared motion variants, spring configs, and duration constants
- [ ] Shared animation components created in `frontend/components/motion/`: `FadeIn`, `StaggerChildren`, `PageTransition`
- [ ] Basic test infrastructure (Vitest or Jest) with one passing smoke test

## Technical Details

### Files to Create/Modify

- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json` (strict: true, paths aliases)
- Create: `frontend/next.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/app/layout.tsx` (root layout shell)
- Create: `frontend/app/(app)/layout.tsx` (protected routes layout placeholder)
- Create: `frontend/app/(auth)/layout.tsx` (auth routes layout placeholder)
- Create: `frontend/app/(marketing)/layout.tsx` (marketing routes layout placeholder)
- Create: `frontend/app/(marketing)/page.tsx` (landing page placeholder)
- Create: `frontend/components/ui/` (Shadcn components)
- Create: `frontend/lib/utils.ts` (cn helper, etc.)
- Create: `frontend/types/index.ts` (shared type exports)
- Create: `frontend/lib/animations.ts` (shared motion variants, spring configs, duration constants)
- Create: `frontend/components/motion/fade-in.tsx` (scroll-triggered fade-in wrapper using motion.div + whileInView)
- Create: `frontend/components/motion/stagger-children.tsx` (staggered entrance wrapper for lists/grids)
- Create: `frontend/components/motion/page-transition.tsx` (route-level fade transition wrapper with AnimatePresence)
- Create: `frontend/hooks/.gitkeep`
- Create: `frontend/.eslintrc.json`
- Create: `frontend/.prettierrc`
- Test: `frontend/__tests__/smoke.test.ts`

### Key Implementation Notes

- Use `npx create-next-app@latest` with App Router, TypeScript, Tailwind, ESLint flags
- Run `npx shadcn@latest init` to bootstrap component library
- TypeScript config must set `"strict": true` — this is a project-wide convention per CLAUDE.md
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`
- Do NOT add any auth, API client, or data fetching logic — those come in US-011 and US-012

### Integration Points

- Every Phase 2 frontend story (US-011, US-012, US-013, US-035a) imports from this scaffold
- US-033 adds Sentry/PostHog providers to the root layout created here
- The directory structure must match what ARCHITECTURE.md specifies exactly

## Verification

```bash
cd frontend
npm run build    # Exit code 0, zero errors
npm run lint     # Exit code 0, zero warnings
npm test         # At least 1 passing test
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Frontend" section: directory structure, route groups, tooling
- `docs/PRD.md` — Section 11.1: Tech stack requirements
