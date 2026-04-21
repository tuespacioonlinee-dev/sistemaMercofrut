import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { obtenerUsuarios } from "@/server/actions/usuarios"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus } from "lucide-react"
import { AccionesUsuario } from "./AccionesUsuario"
import { etiquetasRol } from "@/lib/validaciones/usuarios"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export const dynamic = "force-dynamic"

const coloresRol = {
  ADMIN: "bg-red-100 text-red-700",
  VENDEDOR: "bg-blue-100 text-blue-700",
  COMPRADOR: "bg-orange-100 text-orange-700",
  CONSULTA: "bg-slate-100 text-slate-600",
}

export default async function UsuariosPage() {
  const session = await auth()
  if (session?.user?.rol !== "ADMIN") redirect("/")

  const usuarios = await obtenerUsuarios()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/usuarios/nuevo" className={buttonVariants()}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo usuario
        </Link>
      </div>

      {usuarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
          <p className="text-muted-foreground font-medium">No hay usuarios registrados.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Creado</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{usuario.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{usuario.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${coloresRol[usuario.rol]}`}
                    >
                      {etiquetasRol[usuario.rol]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={usuario.activo ? "default" : "secondary"}>
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(usuario.createdAt), "dd/MM/yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AccionesUsuario
                      id={usuario.id}
                      nombre={usuario.nombre}
                      activo={usuario.activo}
                      esMiMismo={usuario.id === session?.user?.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
