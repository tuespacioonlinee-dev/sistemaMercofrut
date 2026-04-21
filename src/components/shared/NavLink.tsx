"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface Props {
  href: string
  children: React.ReactNode
  icon?: React.ReactNode
  deshabilitado?: boolean
}

export function NavLink({ href, children, icon, deshabilitado = false }: Props) {
  const pathname = usePathname()
  const activo = pathname === href || pathname.startsWith(href + "/")

  if (deshabilitado) {
    return (
      <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40 cursor-not-allowed">
        {icon && <span className="h-4 w-4 shrink-0">{icon}</span>}
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        activo
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon && <span className="h-4 w-4 shrink-0">{icon}</span>}
      {children}
    </Link>
  )
}
