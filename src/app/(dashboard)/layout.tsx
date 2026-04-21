import { NavLink } from "@/components/shared/NavLink"
import {
  Users,
  ShoppingCart,
  FileText,
  Wallet,
  CreditCard,
  BarChart2,
  Package,
  Truck,
  ShoppingBag,
  Settings,
  Leaf,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar flex flex-col">
        {/* Logo / Nombre del sistema */}
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <Leaf className="h-6 w-6 text-primary shrink-0" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-sidebar-foreground">Sistema Cono</p>
            <p className="text-xs text-muted-foreground">Mercofrut Tucumán</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Módulos de Juan B. */}
          <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Comercial
          </p>

          <NavLink href="/clientes" icon={<Users />}>
            Clientes
          </NavLink>
          <NavLink href="/ventas" icon={<ShoppingCart />} deshabilitado>
            Ventas
          </NavLink>
          <NavLink href="/remitos" icon={<FileText />} deshabilitado>
            Remitos
          </NavLink>
          <NavLink href="/caja" icon={<Wallet />} deshabilitado>
            Caja diaria
          </NavLink>
          <NavLink href="/cuentas" icon={<CreditCard />}>
            Cuentas corrientes
          </NavLink>
          <NavLink href="/reportes" icon={<BarChart2 />} deshabilitado>
            Reportes
          </NavLink>

          <Separator className="my-3" />

          {/* Módulos de Carlos */}
          <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Stock y compras
          </p>

          <NavLink href="/productos" icon={<Package />} deshabilitado>
            Productos
          </NavLink>
          <NavLink href="/proveedores" icon={<Truck />} deshabilitado>
            Proveedores
          </NavLink>
          <NavLink href="/compras" icon={<ShoppingBag />} deshabilitado>
            Compras
          </NavLink>

          <Separator className="my-3" />

          <NavLink href="/parametros" icon={<Settings />}>
            Parámetros
          </NavLink>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  )
}
