import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Import global styles
import '@/app/globals.css'

const ChatbotEmbed = dynamic(() => import('../components/ChatBotEmbed'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center p-4">
      <div className="animate-pulse text-muted-foreground">Loading chatbot...</div>
    </div>
  )
})

export default function ChatbotEmbedPage() {
  return (
    <div className="h-screen z-50 w-full p-4 bg-background text-foreground">
      <Suspense fallback={<div>Loading...</div>}>
        <ChatbotEmbed />
      </Suspense>
    </div>
  )
}

