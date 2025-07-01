// Trigger the error shake animation on the given element
export function shake(el: HTMLElement | null): void {
  if (!el) return;
  el.classList.remove('animate-error');
  void el.offsetWidth; // force reflow
  el.classList.add('animate-error');
}
