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
