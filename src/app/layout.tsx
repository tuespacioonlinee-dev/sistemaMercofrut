import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/shared/Providers"
import { getEmpresa } from "@/lib/empresa"

export const viewport: Viewport = {
  themeColor: "#0f172a",
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const empresa = await getEmpresa()
  return {
    title: empresa.nombreFantasia,
    description: "Sistema de gestión comercial",
    // Manifest del PWA — el SW se registra solo cuando NODE_ENV=production
    // (ver next.config.ts). El manifest también funciona sin SW activo.
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg" },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
