import { Leaf } from "lucide-react"

export default function DashboardHome() {
  return (
    <div className="flex flex-1 items-center justify-center text-center px-8">
      <div className="space-y-3">
        <div className="flex justify-center">
          <Leaf className="h-12 w-12 text-muted-foreground/30" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido al Sistema Cono
        </h1>
        <p className="text-muted-foreground">
          Seleccioná un módulo del menú para empezar.
        </p>
      </div>
    </div>
  )
}
