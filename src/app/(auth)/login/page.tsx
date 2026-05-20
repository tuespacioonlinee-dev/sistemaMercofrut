import { getEmpresa } from "@/lib/empresa"
import { LoginForm } from "./LoginForm"

export default async function LoginPage() {
  const empresa = await getEmpresa()
  return (
    <LoginForm
      nombreFantasia={empresa.nombreFantasia}
      subtitulo={empresa.localidad}
    />
  )
}
