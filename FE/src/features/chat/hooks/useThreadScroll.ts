import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type TouchEvent, type WheelEvent } from "react";

// Keep only the chat viewport at the end; never scroll the surrounding page.
export default function useThreadScroll(revision: unknown, ready: boolean) {
  const thread = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const anchor = useRef<{ node: HTMLElement; top: number } | null>(null);
  const lastTop = useRef(0);
  const intentUntil = useRef(0);
  const touchY = useRef(0);
  function rememberAnchor() {
    const viewport = thread.current; const rows = content.current?.children;
    if (!viewport || !rows?.length) return;
    const top = viewport.getBoundingClientRect().top;
    // Rows are in order. Binary search avoids measuring the entire loaded history on scroll.
    let low = 0, high = rows.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (rows[middle].getBoundingClientRect().bottom <= top) low = middle + 1;
      else high = middle;
    }
    const node = rows[low] as HTMLElement;
    anchor.current = { node, top: node.getBoundingClientRect().top - top };
  }
  function align() {
    const viewport = thread.current; if (!viewport) return;
    if (following.current) viewport.scrollTop = viewport.scrollHeight;
    else if (anchor.current?.node.isConnected && viewport.contains(anchor.current.node)) {
      const offset = anchor.current.node.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
      viewport.scrollTop += offset - anchor.current.top;
    }
    lastTop.current = viewport.scrollTop;
  }
  useLayoutEffect(() => { if (ready) align(); }, [revision, ready]);
  useEffect(() => {
    if (!ready || !thread.current || !content.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame); frame = requestAnimationFrame(align);
    });
    observer.observe(thread.current); observer.observe(content.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [ready]);
  function intent() { intentUntil.current = performance.now() + 1000; }
  function pause() { following.current = false; rememberAnchor(); }
  const handlers = {
    onScroll() {
      const viewport = thread.current; if (!viewport) return;
      const atEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
      if (atEnd) { following.current = true; anchor.current = null; }
      else if (performance.now() < intentUntil.current && viewport.scrollTop < lastTop.current - 1) following.current = false;
      if (!following.current) rememberAnchor();
      lastTop.current = viewport.scrollTop;
    },
    onWheel(event: WheelEvent<HTMLDivElement>) { intent(); if (event.deltaY < 0) pause(); },
    onPointerDown: intent,
    onTouchStart(event: TouchEvent<HTMLDivElement>) { intent(); touchY.current = event.touches[0]?.clientY ?? 0; },
    onTouchMove(event: TouchEvent<HTMLDivElement>) {
      intent(); const next = event.touches[0]?.clientY ?? touchY.current;
      if (next > touchY.current) pause(); touchY.current = next;
    },
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      intent(); if (["ArrowUp", "PageUp", "Home"].includes(event.key)) pause();
    },
  };
  return { thread, content, handlers, holdPosition: pause,
    followLatest() { following.current = true; anchor.current = null; } };
}
