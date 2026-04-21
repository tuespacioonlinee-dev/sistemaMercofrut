import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { obtenerUsuarioPorId } from "@/server/actions/usuarios"
import { FormularioUsuario } from "../../FormularioUsuario"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarUsuarioPage({ params }: Props) {
  const session = await auth()
  if (session?.user?.rol !== "ADMIN") redirect("/")

  const { id } = await params
  const usuario = await obtenerUsuarioPorId(id)
  if (!usuario) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar usuario</h1>
        <p className="text-sm text-muted-foreground">{usuario.email}</p>
      </div>
      <FormularioUsuario
        modo="editar"
        id={usuario.id}
        defaults={{
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          activo: usuario.activo,
        }}
      />
    </div>
  )
}
