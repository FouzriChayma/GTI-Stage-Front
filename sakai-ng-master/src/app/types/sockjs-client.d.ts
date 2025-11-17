declare module 'sockjs-client' {
  interface SockJSOptions {
    server?: string;
    transports?: string[];
    sessionId?: number | (() => number);
    timeout?: number;
    devel?: boolean;
    debug?: boolean;
    protocols_whitelist?: string[];
    jsessionid?: string;
  }

  class SockJS {
    constructor(url: string, protocols?: string | string[] | null, options?: SockJSOptions);
    url: string;
    protocol: string;
    readyState: number;
    onopen: ((event: any) => void) | null;
    onmessage: ((event: any) => void) | null;
    onclose: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    send(data: string): void;
    close(code?: number, reason?: string): void;
  }

  export = SockJS;
}

