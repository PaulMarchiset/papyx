/**
 * Moves one item of a list to another index, returning a new list.
 *
 * Shared by the file tray and the page grid so a dragged row and a dragged page
 * behave identically — including the off-by-one that catches everyone: after
 * lifting the item out, every index above it has already shifted down by one,
 * which `splice` handles for us as long as the removal happens first.
 */
export function reorder<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
  return next;
}
