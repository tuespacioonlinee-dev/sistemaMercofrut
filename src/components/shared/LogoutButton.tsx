"use client"

import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
    >
      <LogOut className="h-3.5 w-3.5" />
      Cerrar sesión
    </button>
  )
}
