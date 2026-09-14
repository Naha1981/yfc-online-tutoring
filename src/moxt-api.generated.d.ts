declare global {
  interface Window {
    moxt?: {
      db?: { fetch: typeof fetch }
    }
  }
}
export {}
