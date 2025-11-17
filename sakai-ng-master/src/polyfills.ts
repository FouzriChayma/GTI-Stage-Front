// Polyfill for 'global' variable (required by sockjs-client and @stomp/stompjs)
// This must be loaded before any other imports
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

// Also set it on globalThis for better compatibility
if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis;
}

