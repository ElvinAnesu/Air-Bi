import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { cn } from "@/lib/utils"
import { Providers } from "@/components/providers"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "AirBI",
  description: "AI-powered conversational ERP intelligence",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("dark", geist.variable)} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
