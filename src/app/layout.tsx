import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/shared/Providers"
import { getEmpresa } from "@/lib/empresa"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const empresa = await getEmpresa()
  return {
    title: empresa.nombreFantasia,
    description: "Sistema de gestión comercial",
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
