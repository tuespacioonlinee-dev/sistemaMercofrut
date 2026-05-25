import { getEmpresa } from "@/lib/empresa"
import { requireSession } from "@/lib/auth-guards"
import { FormCambiarPassword } from "./FormCambiarPassword"

export default async function CambiarPasswordPage() {
  const session = await requireSession()
  const empresa = await getEmpresa()

  return (
    <FormCambiarPassword
      nombreFantasia={empresa.nombreFantasia}
      obligatorio={session.user.debeCambiarPassword === true}
    />
  )
}
