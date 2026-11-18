import type React from 'react';

/**
 * Props for the dark background behind a window: a tap on the background (outside the window) closes it.
 * Only a tap that both starts and ends on the background counts, so selecting text in a field and
 * letting go outside does not close anything.
 * form: the window has fields — if something is typed, ask before closing so it is not lost.
 */
export function backdropClose(close: () => void, form = false) {
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.dataset.downOnBackdrop = e.target === e.currentTarget ? '1' : ''; },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const started = el.dataset.downOnBackdrop === '1';
      el.dataset.downOnBackdrop = '';
      if (e.target !== el || !started) return;
      if (form) {
        const typed = [...el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([readonly])')]
          .some((f) => f.value.trim() !== '');
        if (typed && !window.confirm('Закрыть окно? Введённые данные не сохранятся.')) return;
      }
      close();
    },
  };
}
