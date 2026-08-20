/**
 * Build-time fallback for `@ventora/ai-cs/react`.
 *
 * The in-app support widget ships from a private Ventora registry. Clones that
 * cannot authenticate against that registry still need `npm install`, `tsc` and
 * `next build` to succeed, so `@ventora/ai-cs` is an optional dependency and
 * this module stands in for it when the real package is absent.
 *
 * The swap is decided once, at config load, by `hasAiCsVendor()` in
 * `lib/vendor-modules.ts`; see the resolve aliases in `next.config.ts` and
 * `vitest.config.ts`. When the real package IS installed nothing here is used.
 *
 * Rendering null is the correct degraded behaviour: the widget is customer
 * support chat, not product functionality, and `AppShell` renders it
 * unconditionally for signed-in users.
 */

/**
 * The props Lextract actually passes to the vendor widget. Deliberately a
 * faithful subset of the vendor's own prop type rather than a re-export, so
 * this file has no dependency on the package it substitutes for.
 */
export interface AiCsWidgetProps {
  api: {
    baseUrl: string
    credentials: RequestCredentials
  }
  session: {
    appId: string
    userId: string
    currentPath?: string
  }
  brand: {
    id: string
  }
}

export function AiCsWidget(_props: AiCsWidgetProps): null {
  return null
}
