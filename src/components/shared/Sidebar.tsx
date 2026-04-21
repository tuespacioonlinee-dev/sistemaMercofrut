"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Package,
  Tag,
  Ruler,
  Truck,
  ShoppingCart,
  Receipt,
  Users,
  Wallet,
  BarChart2,
  Settings,
  UserCog,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    titulo: "Panel",
    href: "/",
    icono: LayoutDashboard,
    activo: true,
  },
  {
    titulo: "Productos",
    href: "/productos",
    icono: Package,
    activo: true,
  },
  {
    titulo: "Categorías",
    href: "/categorias",
    icono: Tag,
    activo: true,
  },
  {
    titulo: "Unidades",
    href: "/unidades",
    icono: Ruler,
    activo: true,
  },
  {
    titulo: "Proveedores",
    href: "/proveedores",
    icono: Truck,
    activo: true,
  },
  {
    titulo: "Compras",
    href: "/compras",
    icono: ShoppingCart,
    activo: true,
  },
  { separador: true },
  {
    titulo: "Ventas",
    href: "/ventas",
    icono: Receipt,
    activo: false,
  },
  {
    titulo: "Clientes",
    href: "/clientes",
    icono: Users,
    activo: false,
  },
  {
    titulo: "Caja",
    href: "/caja",
    icono: Wallet,
    activo: false,
  },
  {
    titulo: "Reportes",
    href: "/reportes",
    icono: BarChart2,
    activo: false,
  },
  { separador: true },
  {
    titulo: "Usuarios",
    href: "/usuarios",
    icono: UserCog,
    activo: true,
    soloAdmin: true,
  },
  {
    titulo: "Parámetros",
    href: "/parametros",
    icono: Settings,
    activo: true,
    soloAdmin: true,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const esAdmin = session?.user?.rol === "ADMIN"

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-slate-900 text-slate-100 shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <p className="text-lg font-bold tracking-tight">Sistema Cono</p>
        <p className="text-xs text-slate-400">Mercofrut Tucumán</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item, i) => {
          if ("separador" in item) {
            return <div key={i} className="my-2 border-t border-slate-700" />
          }

          if (item.soloAdmin && !esAdmin) return null

          const activo = pathname === item.href
          const Icono = item.icono

          if (!item.activo) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-500 cursor-not-allowed text-sm"
              >
                <Icono className="w-4 h-4 shrink-0" />
                <span>{item.titulo}</span>
                <span className="ml-auto text-xs bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">
                  pronto
                </span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                activo
                  ? "bg-slate-700 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icono className="w-4 h-4 shrink-0" />
              <span>{item.titulo}</span>
            </Link>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-slate-700 space-y-2">
        <div className="text-sm">
          <p className="font-medium truncate">{session?.user?.name}</p>
          <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
          <p className="text-xs text-slate-500 mt-0.5">{session?.user?.rol}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 px-2"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
