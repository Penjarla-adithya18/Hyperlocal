'use client'

import AIChatbot from '@/components/worker/AIChatbot'

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIChatbot />
    </>
  )
}
