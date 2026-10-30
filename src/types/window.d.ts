/**
 * @fileoverview Global type extensions for browser window APIs.
 */

export {};

declare global {
  interface Window {
    requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  }
}
