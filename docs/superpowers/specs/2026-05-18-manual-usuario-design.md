# Manual de Usuario PDF — Spec de Diseno

## Resumen

PDF estatico con el manual de usuario completo del sistema Mercofrut. Cubre los 12 modulos del sistema con instrucciones paso a paso en espanol argentino informal. Se genera con un script CLI (`npm run manual`) usando React-PDF.

## Decisiones

| Decision | Eleccion | Alternativas descartadas |
|----------|----------|--------------------------|
| Formato | PDF estatico generado por script | PDF dinamico desde la app, manual online |
| Contenido | Todo el sistema (12 capitulos) | Solo flujos diarios, solo lo basico |
| Capturas | Sin capturas, solo texto | Con screenshots (se desactualiza rapido) |
| Generacion | React-PDF (renderToBuffer) | Markdown + md-to-pdf (dependencia nueva) |
| Idioma | Espanol argentino informal (vos/hace) | Formal (usted) |

## Uso

```bash
npm run manual
```

Genera `manual-usuario-mercofrut.pdf` en el directorio actual.

## Capitulos del manual

### 1. Primeros pasos
- Como entrar al sistema (email + contrasena)
- Pantalla principal (dashboard)
- Navegacion: menu lateral con las secciones

### 2. Caja diaria
- Abrir caja: ir a Caja, cargar saldo inicial, click "Abrir caja"
- Ver movimientos del dia
- Cerrar caja: cargar monto de arqueo, click "Cerrar caja"
- Que pasa si hay diferencia entre arqueo y saldo calculado

### 3. Ventas
- Nueva venta contado: seleccionar cliente, agregar productos con cantidad, confirmar
- Nueva venta cuenta corriente: seleccionar cliente con CC, elegir condicion CC, confirmar
- Ver listado de ventas del dia
- Anular una venta

### 4. Cobros
- Cobrar a un cliente con saldo pendiente
- Buscar el cliente, ingresar monto y concepto, registrar cobro
- Ver que el saldo del cliente bajo

### 5. Compras
- Registrar una compra a proveedor
- Seleccionar proveedor, agregar productos, elegir condicion (contado/CC)
- Ver listado de compras

### 6. Pagos
- Pagar a un proveedor con saldo pendiente
- Buscar proveedor, ingresar monto, registrar pago

### 7. Productos
- Agregar un producto nuevo: codigo, nombre, categoria, unidad, precios
- Editar un producto existente
- Gestionar categorias (agregar/editar)
- Gestionar unidades de medida (agregar/editar)
- Actualizar precios

### 8. Clientes
- Agregar un cliente nuevo: nombre, documento, condicion IVA
- Editar un cliente existente
- Consultar cuenta corriente: ver extracto con movimientos

### 9. Proveedores
- Agregar un proveedor nuevo
- Editar un proveedor existente

### 10. Stock
- Consultar stock actual de todos los productos
- Buscar un producto especifico
- Entender los estados (OK, Bajo minimo, Sin stock)

### 11. Reportes
- Reporte de caja: ver totales del dia por tipo de movimiento
- Reporte de stock diario: ver ingresos y egresos por producto
- Reporte de stock resumido

### 12. Configuracion
- Parametros del negocio: nombre, razon social, CUIT, direccion
- Que es cada campo y cuando se usa

## Archivos nuevos

| Archivo | Proposito |
|---------|-----------|
| `scripts/manual/content.ts` | Texto de los 12 capitulos como datos estructurados |
| `scripts/manual/pdf.tsx` | Componente React-PDF con helpers de tipografia + layout |
| `scripts/generate-manual.tsx` | Orquestador: importa contenido, renderiza, escribe PDF |

## Detalles tecnicos

### content.ts

Exporta un array de capitulos con estructura tipada:

```ts
interface Paso {
  texto: string;
}

interface Seccion {
  titulo: string;
  parrafos: string[];
  pasos?: Paso[];
}

interface Capitulo {
  numero: number;
  titulo: string;
  secciones: Seccion[];
}
```

Cada capitulo tiene secciones, cada seccion tiene parrafos de contexto y opcionalmente pasos numerados. El texto usa espanol argentino informal.

### pdf.tsx

Componente `<ManualPDF>` que recibe los capitulos y renderiza:

- **Portada:** titulo "Mercofrut", subtitulo "Manual de Usuario", fecha de generacion
- **Indice:** lista de capitulos con numero de pagina (si es factible, sino solo lista)
- **Capitulos:** cada uno empieza en pagina nueva con H1 numerado
- **Header:** "Manual de Usuario — Mercofrut" en cada pagina (excepto portada)
- **Footer:** numero de pagina centrado

Helpers internos:
- `H1(texto)` — titulo de capitulo, 16pt bold, con linea separadora
- `H2(texto)` — titulo de seccion, 12pt bold
- `P(texto)` — parrafo, 11pt, interlineado 1.5
- `Paso(numero, texto)` — paso numerado con numero en bold
- `Nota(texto)` — nota en cursiva gris

Tipografia: Helvetica (incluida en React-PDF), cuerpo 11pt, margenes amplios (40pt).

### generate-manual.tsx

Orquestador simple:
1. Importa capitulos de content.ts
2. Renderiza `<ManualPDF>` con renderToBuffer
3. Escribe `manual-usuario-mercofrut.pdf`
4. Imprime confirmacion en consola

## npm script

```json
"manual": "tsx scripts/generate-manual.tsx"
```

## Dependencias nuevas

Ninguna.

## Consideraciones

- El manual se regenera manualmente cuando hay cambios significativos en la UI
- El archivo PDF generado NO se commitea al repo (agregar a .gitignore)
- El lenguaje es deliberadamente simple: frases cortas, sin tecnicismos, instrucciones directas
- Los pasos usan nombres exactos de botones y campos tal como aparecen en la UI
- Tipografia grande (11pt cuerpo) porque los usuarios pueden tener vista cansada
