/**
 * Shared user-facing disclaimer copy.
 *
 * Kept in one place so every surface that shows extraction results uses the
 * same wording. Mirrors the backend `EXPORT_DISCLAIMER` constant used by the
 * Word, Excel, and PDF exporters. Plain, third-grade-level sentences by design.
 */

/**
 * Accuracy and liability fine print shown beneath extraction results (the
 * pre-payment teaser preview and the paid full results view). Tells the reader
 * the output is AI-generated, may contain errors, must be checked against the
 * source lease, and that Lextract is not liable for errors or for decisions
 * made from the results.
 */
export const RESULTS_ACCURACY_DISCLAIMER =
  'AI can make mistakes. Check each field against your lease before you ' +
  'rely on it. Lextract is not responsible for errors. It is not ' +
  'responsible for choices you make from these results.'
