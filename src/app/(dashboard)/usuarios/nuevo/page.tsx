import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FormularioUsuario } from "../FormularioUsuario"

export default async function NuevoUsuarioPage() {
  const session = await auth()
  if (session?.user?.rol !== "ADMIN") redirect("/")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo usuario</h1>
        <p className="text-sm text-muted-foreground">Completá los datos para crear un acceso al sistema.</p>
      </div>
      <FormularioUsuario modo="crear" />
    </div>
  )
}
