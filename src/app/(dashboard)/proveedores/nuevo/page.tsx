import { FormProveedor } from "../FormProveedor"

export default function NuevoProveedorPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nuevo Proveedor</h1>
        <p className="text-sm text-slate-500">Completá los datos del proveedor</p>
      </div>
      <FormProveedor />
    </div>
  )
}
