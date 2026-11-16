/*
 * Eumo presentation motion. No framework or remote runtime is required.
 * Pixel cover / midpoint swap / reveal adapted from React Bits PixelTransition:
 * https://github.com/DavidHDev/react-bits/tree/d01aa914dcbe76da8b2923ebf872b5c8b1066e4c
 * Copyright (c) 2026 David Haz. See vendor/react-bits-LICENSE.txt.
 */
(() => {
  'use strict';

  const swaps = new WeakMap();
  const entrances = new WeakSet();
  const transitions = new WeakMap();
  const running = new Set();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const noop = () => {};
  const canAnimate = () => !reduced?.matches && !document.hidden && Boolean(window.gsap?.timeline);

  /**
   * Cover the artwork with 80 pixels, apply the latest colour, then reveal it.
   * The supplied callback should update artwork only; selected swatch state can
   * update immediately. A new call discards any previous, uncommitted callback.
   * Returns a cancellation function. No content is ever hidden by this helper.
   */
  function pixelSwap(container, commitChange) {
    if (typeof commitChange !== 'function') return noop;
    swaps.get(container)?.cancel();
    if (!container?.isConnected || !canAnimate()) {
      commitChange();
      return noop;
    }

    const oldPosition = container.style.position;
    const addPosition = getComputedStyle(container).position === 'static';
    const overlay = document.createElement('span');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.dataset.pixelWipe = '';
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', zIndex: '3', display: 'grid',
      gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
      pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit'
    });
    const tiles = Array.from({ length: 80 }, () => {
      const tile = document.createElement('span');
      Object.assign(tile.style, { background: '#b9c6a0', opacity: '0' });
      overlay.appendChild(tile);
      return tile;
    });

    let timeline;
    let watchdog;
    let committed = false;
    let disposed = false;
    const apply = () => {
      if (disposed || committed || swaps.get(container) !== state) return;
      committed = true;
      try { commitChange(); } catch (error) { clean(); throw error; }
    };
    const clean = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(watchdog);
      timeline?.kill();
      overlay.remove();
      if (addPosition && container.style.position === 'relative') container.style.position = oldPosition;
      if (swaps.get(container) === state) swaps.delete(container);
      running.delete(state);
    };
    const state = {
      cancel: clean,
      finish() { try { apply(); } finally { clean(); } }
    };
    swaps.set(container, state);
    running.add(state);

    try {
      if (addPosition) container.style.position = 'relative';
      container.appendChild(overlay);
      timeline = window.gsap.timeline({ paused: true, onComplete: clean });
      timeline.to(tiles, {
        opacity: 1, duration: 0.045, ease: 'none', stagger: { amount: 0.12, from: 'random' }
      }, 0);
      timeline.call(apply, [], 0.17);
      timeline.to(tiles, {
        opacity: 0, duration: 0.045, ease: 'none', stagger: { amount: 0.12, from: 'random' }
      }, 0.185);
      // Also settle safely if a runtime error stops the animation ticker.
      watchdog = setTimeout(() => state.finish(), 650);
      timeline.play();
    } catch (error) {
      state.finish();
    }
    return clean;
  }

  // One bounded entrance, only when explicitly requested. The original styles
  // are restored instead of clearing styles that might belong to the product UI.
  function entrance(owner, targets, duration, stagger) {
    transitions.get(owner)?.cancel();
    if (!owner?.isConnected || !canAnimate() || !targets.length) return noop;
    const originals = targets.map(element => ({
      element, transform: element.style.transform, opacity: element.style.opacity,
      visibility: element.style.visibility, translate: element.style.translate,
      scale: element.style.scale, rotate: element.style.rotate
    }));
    let timeline;
    let watchdog;
    let disposed = false;
    const clean = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(watchdog);
      timeline?.kill();
      originals.forEach(({ element, ...style }) => Object.assign(element.style, style));
      if (transitions.get(owner) === state) transitions.delete(owner);
      running.delete(state);
    };
    const state = { cancel: clean, finish: clean };
    transitions.set(owner, state);
    running.add(state);
    try {
      timeline = window.gsap.timeline({ paused: true, onComplete: clean });
      timeline.fromTo(targets, { y: 8, opacity: 0.72 }, {
        y: 0, opacity: 1, duration, stagger, ease: 'power2.out', overwrite: 'auto'
      });
      watchdog = setTimeout(clean, Math.ceil((duration + stagger * targets.length) * 1000) + 250);
      timeline.play();
    } catch (error) {
      clean();
    }
    return clean;
  }

  function enterOverview(root) {
    if (!root || entrances.has(root)) return noop;
    entrances.add(root);
    const marked = Array.from(root.querySelectorAll('[data-enter-item]'));
    return entrance(root, marked.length ? marked.slice(0, 6) : [root], 0.42, 0.05);
  }

  function stageChange(stage, mutate) {
    transitions.get(stage)?.cancel();
    if (typeof mutate === 'function') mutate();
    return entrance(stage, stage ? [stage] : [], 0.22, 0);
  }

  function finishAll() {
    Array.from(running).forEach(state => state.finish());
  }
  window.addEventListener('pagehide', finishAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finishAll(); });
  reduced?.addEventListener?.('change', event => { if (event.matches) finishAll(); });

  window.EumoMotion = Object.freeze({ pixelSwap, enterOverview, stageChange, finishAll });
})();
