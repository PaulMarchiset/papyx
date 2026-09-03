/**
 * Progress reporting for the PDF operations.
 *
 * The callback is awaited rather than fired and forgotten: every operation here
 * runs on the UI thread (pdf-lib and the pdf.js canvas path both need the DOM),
 * so a tight page loop would otherwise hold the thread for the whole job and
 * the progress bar would jump straight from 0 to 100. Awaiting lets the runner
 * yield a macrotask between pages, which is what makes the bar move.
 *
 * It is also where cancellation happens: the runner throws {@link Cancelled}
 * out of the callback, which unwinds whichever page loop is running. That is
 * why no operation catches around its own `onProgress` call.
 */
export type ProgressCallback = (done: number, total: number) => void | Promise<void>;

/** Thrown out of the progress callback when the user cancels a run. */
export class Cancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "Cancelled";
  }
}

/** Hands the thread back to the browser so pending renders can paint. */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Splits one progress callback across several sub-jobs of known weight, so a
 * batch of five documents reports 0→100 once instead of five times.
 */
export function subProgress(
  onProgress: ProgressCallback,
  index: number,
  count: number,
): ProgressCallback {
  return async (done, total) => {
    const fraction = total > 0 ? done / total : 0;
    await onProgress(Math.round((index + fraction) * 1000), count * 1000);
  };
}
