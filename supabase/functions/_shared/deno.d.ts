// Type stubs for Deno globals so VS Code doesn't
// report errors when editing Supabase Edge Functions.

declare namespace Deno {
  const env: {
    get(key: string): string | undefined
  }
  function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void
}

// Map the Deno npm: specifier to the installed Node package
declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

// Stub for npm:web-push used in _shared/push.ts
declare module 'npm:web-push' {
  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  function sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: Record<string, unknown>
  ): Promise<{ statusCode: number; body: string; headers: Record<string, string> }>
  export { setVapidDetails, sendNotification }
  export default { setVapidDetails, sendNotification }
}
