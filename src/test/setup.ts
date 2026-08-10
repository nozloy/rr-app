import "@testing-library/jest-dom/vitest";

class ResizeObserverMock implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverMock;
}

if (typeof HTMLElement.prototype.hasPointerCapture !== "function") {
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { value: () => false },
    releasePointerCapture: { value: () => undefined },
    setPointerCapture: { value: () => undefined },
  });
}

if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: () => undefined,
  });
}
