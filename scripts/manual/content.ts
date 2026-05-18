// scripts/manual/content.ts

export interface Paso {
  texto: string;
}

export interface Seccion {
  titulo: string;
  parrafos: string[];
  pasos?: Paso[];
}

export interface Capitulo {
  numero: number;
  titulo: string;
  secciones: Seccion[];
}

export const capitulos: Capitulo[] = [
  {
    numero: 1,
    titulo: "Primeros pasos",
    secciones: [
      {
        titulo: "Cómo entrar al sistema",
        parrafos: [
          "Para usar Mercofrut necesitás un email y una contraseña que te da el administrador del sistema.",
        ],
        pasos: [
          { texto: "Abrí el navegador (Chrome, Firefox, etc.) y entrá a la dirección web que te dieron." },
          { texto: "En el campo \"Email\" escribí tu email. En el campo \"Contraseña\" escribí tu contraseña." },
          { texto: "Hacé click en \"Ingresar\"." },
          { texto: "Si los datos son correctos, vas a ver la pantalla principal. Si son incorrectos, vas a ver el mensaje \"Email o contraseña incorrectos\"." },
        ],
      },
      {
        titulo: "Pantalla principal",
        parrafos: [
          "Después de entrar vas a ver el panel principal con un resumen general del sistema. A la izquierda tenés el menú con todas las secciones.",
        ],
      },
      {
        titulo: "Navegación",
        parrafos: [
          "El menú de la izquierda tiene todas las secciones del sistema: Panel, Productos, Categorías, Unidades, Proveedores, Compras, Precios, Stock, Lotes, Ventas, Clientes, Caja y Reportes.",
          "Para ir a cualquier sección, hacé click en su nombre en el menú.",
          "Para cerrar sesión, hacé click en \"Cerrar sesión\" al final del menú.",
        ],
      },
    ],
  },
  {
    numero: 2,
    titulo: "Caja diaria",
    secciones: [
      {
        titulo: "Abrir la caja",
        parrafos: [
          "Todos los días, antes de empezar a vender, tenés que abrir la caja. Esto registra cuánto dinero hay en la caja al inicio del día.",
        ],
        pasos: [
          { texto: "Hacé click en \"Caja\" en el menú." },
          { texto: "Si no hay caja abierta, vas a ver el mensaje \"No hay caja abierta\" y el formulario para abrir una." },
          { texto: "En \"Saldo inicial ($)\" poné la cantidad de dinero que hay en la caja al empezar (por ejemplo: 5000)." },
          { texto: "Si querés, escribí algo en \"Observaciones\" (es opcional, por ejemplo: \"cambio en efectivo\")." },
          { texto: "Hacé click en \"Abrir caja\"." },
          { texto: "La pantalla va a cambiar y vas a ver los movimientos del día, las tarjetas de Ingresos, Egresos, Debe CC y Haber CC." },
        ],
      },
      {
        titulo: "Ver los movimientos del día",
        parrafos: [
          "Una vez que la caja está abierta, la pantalla de Caja muestra todo lo que pasó en el día.",
          "Arriba tenés 4 tarjetas con los totales: Ingresos (efectivo que entró), Egresos (efectivo que salió), Debe CC (ventas a cuenta corriente) y Haber CC (cobros de cuenta corriente).",
          "Abajo tenés la tabla \"Movimientos del día\" con cada operación del día: ventas, cobros, pagos, gastos, etc.",
          "También podés ver el saldo inicial, el saldo de caja actual y la diferencia del día.",
        ],
      },
      {
        titulo: "Registrar un movimiento manual",
        parrafos: [
          "Si necesitás registrar un gasto, retiro, depósito u otro movimiento que no viene de una venta o cobro, podés hacerlo desde la caja.",
        ],
        pasos: [
          { texto: "En la sección \"Nuevo movimiento\" (a la derecha), elegí la \"Categoría\" del movimiento (Gasto, Retiro, Depósito, Otro)." },
          { texto: "Si corresponde, elegí si es ingreso (HABER) o egreso (DEBE)." },
          { texto: "Poné el monto en \"Monto ($)\"." },
          { texto: "Escribí una descripción en \"Descripción\" (por ejemplo: \"pago luz\")." },
          { texto: "Hacé click en \"Registrar movimiento\"." },
        ],
      },
      {
        titulo: "Cerrar la caja",
        parrafos: [
          "Al terminar el día, cerrás la caja. Tenés que contar el dinero que hay en la caja y cargarlo. El sistema calcula si hay diferencia con lo esperado.",
        ],
        pasos: [
          { texto: "En la sección \"Cerrar caja\" (a la derecha), vas a ver los totales del día separados en Contado y Cuenta Corriente." },
          { texto: "Contá el dinero que hay físicamente en la caja." },
          { texto: "Poné ese número en \"Dinero contado en caja ($)\"." },
          { texto: "El sistema te muestra el \"Saldo esperado\", el \"Dinero contado\" y la \"Diferencia\". Si la diferencia es 0, está todo bien." },
          { texto: "Si querés, escribí algo en \"Observaciones\" (por ejemplo: \"faltaron $200, revisar\")." },
          { texto: "Hacé click en \"Cerrar caja\" (botón rojo). La caja queda cerrada y no se pueden hacer más operaciones hasta abrir una nueva." },
        ],
      },
    ],
  },
  {
    numero: 3,
    titulo: "Ventas",
    secciones: [
      {
        titulo: "Crear una venta",
        parrafos: [
          "Para registrar una venta necesitás tener la caja abierta. Si la caja está cerrada, primero abrila (ver capítulo 2).",
        ],
        pasos: [
          { texto: "Hacé click en \"Ventas\" en el menú." },
          { texto: "Hacé click en \"Nueva venta\"." },
          { texto: "En \"Cliente\" buscá y seleccioná el cliente. Si es un cliente que paga en el momento, elegí cualquier cliente de contado." },
          { texto: "En \"Condición de venta\" elegí \"Contado\" si paga ahora, o \"Cuenta Corriente\" si queda a cuenta." },
          { texto: "Hacé click en \"Agregar producto\" para agregar una línea de producto." },
          { texto: "Seleccioná el producto de la lista. Vas a ver el stock disponible al lado." },
          { texto: "Poné la cantidad que se lleva." },
          { texto: "Si querés agregar más productos, volvé a hacer click en \"Agregar producto\" y repetí." },
          { texto: "Si querés hacer un descuento, usá el campo \"Descuento\" (podés poner un monto en $ o un porcentaje con %)." },
          { texto: "Verificá que el \"Total\" sea correcto." },
          { texto: "Hacé click en \"Confirmar venta\"." },
          { texto: "El sistema te confirma con el mensaje \"Venta registrada correctamente.\" y genera un remito automáticamente." },
        ],
      },
      {
        titulo: "Ver las ventas del día",
        parrafos: [
          "Para ver todas las ventas hechas, hacé click en \"Ventas\" en el menú. Vas a ver el listado con todas las ventas, el cliente, la condición (Contado o CC) y el total.",
        ],
      },
      {
        titulo: "Anular una venta",
        parrafos: [
          "Si te equivocaste en una venta, podés anularla. La anulación devuelve el stock y revierte el movimiento de caja o cuenta corriente.",
          "Entrá al detalle de la venta haciendo click en ella, y usá el botón de anular. El sistema te va a pedir el motivo.",
        ],
      },
    ],
  },
  {
    numero: 4,
    titulo: "Cobros",
    secciones: [
      {
        titulo: "Cobrar a un cliente",
        parrafos: [
          "Cuando un cliente que compra a cuenta corriente viene a pagar lo que debe, registrás un cobro. Necesitás tener la caja abierta.",
        ],
        pasos: [
          { texto: "Hacé click en \"Caja\" en el menú (los cobros se registran desde la sección de caja o cuentas corrientes)." },
          { texto: "Buscá \"Registrar cobro\" o andá a la sección de cobros." },
          { texto: "En \"Cliente / Cuenta\" buscá el cliente escribiendo su nombre. Seleccionalo de la lista." },
          { texto: "Vas a ver el \"Saldo actual\" del cliente (lo que debe)." },
          { texto: "En \"Monto cobrado ($)\" poné cuánto te paga. Puede ser el total o un pago parcial." },
          { texto: "En \"Concepto\" escribí algo como \"Pago factura\" o \"Abono parcial\"." },
          { texto: "Hacé click en \"Registrar cobro\"." },
          { texto: "El saldo del cliente baja por el monto cobrado." },
        ],
      },
    ],
  },
  {
    numero: 5,
    titulo: "Compras",
    secciones: [
      {
        titulo: "Registrar una compra",
        parrafos: [
          "Cuando recibís mercadería de un proveedor, registrás la compra para que el stock se actualice automáticamente.",
        ],
        pasos: [
          { texto: "Hacé click en \"Compras\" en el menú." },
          { texto: "Hacé click en \"Nueva compra\"." },
          { texto: "En \"Proveedor\" seleccioná el proveedor que te vendió la mercadería." },
          { texto: "En \"Condición de pago\" elegí \"Contado\" si le pagaste ya, o \"Cuenta Corriente\" si quedás debiendo." },
          { texto: "Si tenés el comprobante del proveedor, podés elegir el \"Tipo de comprobante\" (Factura A, B, etc.) y el \"N° Comprobante\"." },
          { texto: "Hacé click en \"Agregar fila\" para agregar un producto." },
          { texto: "Seleccioná el producto, poné la cantidad que recibiste y el precio que te cobró el proveedor." },
          { texto: "Si hay más productos, repetí el paso anterior." },
          { texto: "Verificá el total y hacé click en \"Registrar compra\"." },
          { texto: "El sistema confirma con \"Compra registrada. Stock actualizado.\" y el stock de los productos se incrementa automáticamente." },
        ],
      },
      {
        titulo: "Ver las compras",
        parrafos: [
          "Para ver todas las compras registradas, hacé click en \"Compras\" en el menú. Vas a ver el listado con proveedor, fecha, condición y total.",
        ],
      },
    ],
  },
  {
    numero: 6,
    titulo: "Pagos a proveedores",
    secciones: [
      {
        titulo: "Pagar a un proveedor",
        parrafos: [
          "Cuando le pagás a un proveedor que te vendió a cuenta corriente, registrás un pago. Es similar a registrar un cobro, pero al revés.",
        ],
        pasos: [
          { texto: "Buscá la sección de pagos o cuentas corrientes de proveedores." },
          { texto: "Buscá el proveedor al que querés pagarle." },
          { texto: "Vas a ver el saldo que le debés." },
          { texto: "Ingresá el monto que le pagás." },
          { texto: "Hacé click en registrar el pago." },
          { texto: "El saldo con el proveedor baja por el monto pagado." },
        ],
      },
    ],
  },
];
