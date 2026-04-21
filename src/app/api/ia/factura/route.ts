import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
type TipoImagen = (typeof TIPOS_PERMITIDOS)[number]

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const imagen = formData.get("imagen") as File | null
    const productosRaw = formData.get("productos") as string | null

    if (!imagen) return NextResponse.json({ error: "No se recibió imagen." }, { status: 400 })
    if (!TIPOS_PERMITIDOS.includes(imagen.type as TipoImagen)) {
      return NextResponse.json({ error: "Formato no soportado. Usá JPG, PNG o WEBP." }, { status: 400 })
    }

    const productos: Array<{ id: string; nombre: string }> = productosRaw ? JSON.parse(productosRaw) : []

    const bytes = await imagen.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")

    const listaProductos = productos.length
      ? `\n\nProductos disponibles en el sistema (intentá hacer el match más cercano por nombre):\n${productos.map((p) => `- id: "${p.id}" | nombre: "${p.nombre}"`).join("\n")}`
      : ""

    const prompt = `Sos un asistente de extracción de datos de facturas de proveedores argentinos.
Analizá esta imagen de factura y extraé todos los datos disponibles.${listaProductos}

Devolvé ÚNICAMENTE un objeto JSON válido, sin texto adicional, con esta estructura exacta:
{
  "proveedor": {
    "nombre": "nombre completo o razón social",
    "cuit": "XX-XXXXXXXX-X o null si no se ve"
  },
  "comprobante": "número de comprobante (ej: 0001-00004521) o null",
  "fecha": "YYYY-MM-DD o null",
  "condicion": "CONTADO o CUENTA_CORRIENTE (inferí del contexto, default CONTADO)",
  "items": [
    {
      "descripcion": "texto exacto tal como aparece en la factura",
      "productoIdSugerido": "id del producto más parecido del sistema, o null si no encontrás match",
      "cantidad": número,
      "unidad": "kg, u, caja, etc.",
      "precioUnitario": número sin símbolo de moneda,
      "subtotal": número sin símbolo de moneda
    }
  ],
  "descuento": número o 0,
  "total": número sin símbolo de moneda
}

Reglas importantes:
- Los precios son en pesos argentinos, sin símbolo.
- Si un campo no se puede leer claramente, usá null.
- Para el match de productos, buscá similitud en el nombre ignorando mayúsculas/minúsculas.
- Si hay varios ítems similares en la factura, creá una entrada por cada uno.
- No inventes datos que no estén en la imagen.`

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imagen.type as TipoImagen,
                data: base64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    })

    const texto = response.content[0].type === "text" ? response.content[0].text : ""

    // Extraer JSON de la respuesta (puede venir con markdown ```json ... ```)
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "No se pudo interpretar la factura." }, { status: 422 })
    }

    const datos = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, datos })
  } catch (err) {
    console.error("[ia/factura]", err)
    return NextResponse.json({ error: "Error al procesar la imagen. Intentá de nuevo." }, { status: 500 })
  }
}
