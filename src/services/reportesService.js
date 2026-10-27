import pool from '../config/db.js';
import { libroDeReporte } from './reporteExcel.js';
import { salidaReal } from '../utils/horarioVuelo.js';

const POR_PAGINA = 20;
const LIMITE_ARCHIVO = 5000;
const DIAS_MAXIMOS = 366;
const TOP_GRAFICA = 8;

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

export class ErrorReporte extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.codigo = 400;
  }
}

const numero = (valor) => Number(valor || 0);

const dinero = (valor) => Math.round(numero(valor) * 100) / 100;

const ocupacion = (confirmados, cupo, fuera) => {
  const vendibles = numero(cupo) - numero(fuera);
  if (vendibles <= 0) {
    return null;
  }
  return Math.round((numero(confirmados) / vendibles) * 1000) / 10;
};

const leerDia = (valor, etiqueta) => {
  const texto = String(valor || '').trim();
  const partes = texto.match(DIA);
  if (!partes) {
    throw new ErrorReporte(`Elige una fecha válida en ${etiqueta}.`);
  }
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    throw new ErrorReporte(`Elige una fecha válida en ${etiqueta}.`);
  }
  return texto;
};

const diaSiguiente = (iso) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + 1)).toISOString().slice(0, 10);
};

const periodoDe = ({ desde, hasta }) => {
  const inicio = leerDia(desde, 'Desde');
  const fin = leerDia(hasta, 'Hasta');
  if (fin < inicio) {
    throw new ErrorReporte('La fecha inicial no puede ser posterior a la final.');
  }
  const dias = Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86400000) + 1;
  if (dias > DIAS_MAXIMOS) {
    throw new ErrorReporte('El periodo puede ser de un año como máximo.');
  }
  return {
    desde: inicio,
    hasta: fin,
    salida: [inicio, fin],
    instante: [`${inicio} 00:00:00`, `${diaSiguiente(fin)} 00:00:00`],
  };
};

const consultar = async (sql, valores) => {
  const [filas] = await pool.query(sql, valores);
  return filas;
};

const paginaDe = (solicitada, total) => {
  const paginas = Math.max(1, Math.ceil(numero(total) / POR_PAGINA));
  let pagina = Number.parseInt(solicitada, 10);
  if (!Number.isInteger(pagina) || pagina < 1) {
    pagina = 1;
  }
  if (pagina > paginas) {
    pagina = paginas;
  }
  return { pagina, paginas, offset: (pagina - 1) * POR_PAGINA };
};

const topSeries = (filas, color, nota) => {
  const utiles = filas
    .filter((fila) => fila.etiqueta && fila.valor != null)
    .map((fila) => ({ etiqueta: fila.etiqueta, valor: dinero(fila.valor), color }));
  return {
    series: utiles.slice(0, TOP_GRAFICA),
    nota: utiles.length > TOP_GRAFICA ? nota : '',
  };
};

const filtroSalida = `DATE(${salidaReal('v')}) >= ? AND DATE(${salidaReal('v')}) <= ?`;

const etiquetaPago = (estado) => ({
  aprobado: 'Pagada',
  reembolsado: 'Cancelada',
  rechazado: 'Rechazada',
  pendiente: 'Pendiente',
}[estado] || 'Pendiente');

const etiquetaFactura = (estado) => ({
  emitida: 'Emitida',
  anulada: 'Anulada',
}[estado] || 'Sin factura');

const etiquetaTipo = (tipo) => ({
  adulto: 'Adulto',
  nino: 'Niño',
  infante: 'Infante',
}[tipo] || 'Adulto');

const etiquetaAccion = (accion) => ({
  login: 'Inicio de sesión',
  pago: 'Pago',
  cancelacion: 'Cancelación',
  restablecer: 'Contraseña',
  checkin: 'Check-in',
  abordaje: 'Abordaje',
  vuelo: 'Vuelo',
}[accion] || accion || 'Registro');

const reporteVuelos = async (periodo, limite, offset) => {
  const donde = filtroSalida;
  const [conteo] = await consultar(
    `SELECT COUNT(*) AS total FROM vuelos v WHERE ${donde}`,
    periodo.salida,
  );
  const [totales] = await consultar(
    `SELECT
       COUNT(*) AS vuelos,
       COALESCE(SUM(cupo), 0) AS cupo,
       COALESCE(SUM(confirmados), 0) AS confirmados,
       COALESCE(SUM(fuera), 0) AS fuera
     FROM (
       SELECT
         v.id,
         v.capacidad_asientos AS cupo,
         COALESCE(SUM(a.estado = 'confirmado'), 0) AS confirmados,
         COALESCE(SUM(a.estado = 'bloqueado_mantenimiento'), 0) AS fuera
       FROM vuelos v
       LEFT JOIN asientos a ON a.vuelo_id = v.id
       WHERE ${donde}
       GROUP BY v.id, v.capacidad_asientos
     ) resumen`,
    periodo.salida,
  );
  const rutas = await consultar(
    `SELECT CONCAT(origen, ' → ', destino) AS etiqueta,
            ROUND(SUM(confirmados) / NULLIF(SUM(cupo - fuera), 0) * 100, 1) AS valor
     FROM (
       SELECT
         v.origen,
         v.destino,
         v.capacidad_asientos AS cupo,
         COALESCE(SUM(a.estado = 'confirmado'), 0) AS confirmados,
         COALESCE(SUM(a.estado = 'bloqueado_mantenimiento'), 0) AS fuera
       FROM vuelos v
       LEFT JOIN asientos a ON a.vuelo_id = v.id
       WHERE ${donde}
       GROUP BY v.id, v.origen, v.destino, v.capacidad_asientos
     ) vuelos
     GROUP BY origen, destino
     ORDER BY valor DESC
     LIMIT ?`,
    [...periodo.salida, TOP_GRAFICA + 1],
  );
  const filas = await consultar(
    `SELECT
       DATE_FORMAT(${salidaReal('v')}, '%d/%m/%Y %H:%i') AS salida,
       CONCAT(v.origen, ' → ', v.destino) AS ruta,
       v.estado,
       v.capacidad_asientos AS cupo,
       COALESCE(SUM(a.estado = 'confirmado'), 0) AS confirmados,
       COALESCE(SUM(a.estado = 'reservado_temporal' AND a.bloqueo_hasta > NOW()), 0) AS apartados,
       COALESCE(SUM(
         a.estado = 'disponible'
         OR (a.estado = 'reservado_temporal' AND (a.bloqueo_hasta IS NULL OR a.bloqueo_hasta <= NOW()))
       ), 0) AS libres,
       COALESCE(SUM(a.estado = 'bloqueado_mantenimiento'), 0) AS fuera
     FROM vuelos v
     LEFT JOIN asientos a ON a.vuelo_id = v.id
     WHERE ${donde}
     GROUP BY v.id
     ORDER BY ${salidaReal('v')}, v.id
     LIMIT ? OFFSET ?`,
    [...periodo.salida, limite, offset],
  );
  const grafica = topSeries(rutas, 'azul', `Se muestran las ${TOP_GRAFICA} rutas con mayor ocupación.`);
  return {
    titulo: 'Vuelos y ocupación',
    descripcion: 'Vuelos que salen en el periodo. La ocupación compara los asientos confirmados con los que siguen a la venta.',
    resumen: [
      { etiqueta: 'Vuelos', valor: numero(totales.vuelos).toLocaleString('es-GT') },
      { etiqueta: 'Asientos confirmados', valor: numero(totales.confirmados).toLocaleString('es-GT') },
      { etiqueta: 'Ocupación', valor: ocupacion(totales.confirmados, totales.cupo, totales.fuera) == null ? '—' : `${ocupacion(totales.confirmados, totales.cupo, totales.fuera)} %` },
      { etiqueta: 'Fuera de servicio', valor: numero(totales.fuera).toLocaleString('es-GT') },
    ],
    grafica: {
      titulo: 'Ocupación por ruta',
      unidad: 'porcentaje',
      series: grafica.series,
      nota: grafica.nota,
    },
    columnas: [
      { clave: 'salida', titulo: 'Salida' },
      { clave: 'ruta', titulo: 'Ruta' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'cupo', titulo: 'Cupo', tipo: 'numero' },
      { clave: 'confirmados', titulo: 'Confirmados', tipo: 'numero' },
      { clave: 'apartados', titulo: 'Apartados', tipo: 'numero' },
      { clave: 'libres', titulo: 'Libres', tipo: 'numero' },
      { clave: 'fuera', titulo: 'Fuera de servicio', tipo: 'numero' },
      { clave: 'ocupacion', titulo: 'Ocupación %', tipo: 'porcentaje' },
    ],
    filas: filas.map((fila) => ({
      salida: fila.salida,
      ruta: fila.ruta,
      estado: fila.estado,
      cupo: numero(fila.cupo),
      confirmados: numero(fila.confirmados),
      apartados: numero(fila.apartados),
      libres: numero(fila.libres),
      fuera: numero(fila.fuera),
      ocupacion: ocupacion(fila.confirmados, fila.cupo, fila.fuera),
    })),
    total: numero(conteo.total),
  };
};

const reporteIngresos = async (periodo, limite, offset) => {
  const donde = 'r.fecha_creacion >= ? AND r.fecha_creacion < ?';
  const [conteo] = await consultar(
    `SELECT COUNT(*) AS total FROM reservas r WHERE ${donde}`,
    periodo.instante,
  );
  const [totales] = await consultar(
    `SELECT
       COALESCE(SUM(CASE WHEN r.estado_pago IN ('aprobado', 'reembolsado') THEN r.monto_total - r.monto_reembolsado ELSE 0 END), 0) AS neto,
       COALESCE(SUM(r.monto_reembolsado), 0) AS devuelto,
       COALESCE(SUM(r.estado_pago = 'aprobado'), 0) AS pagadas,
       COALESCE(SUM(r.estado_pago = 'reembolsado'), 0) AS canceladas,
       COALESCE(SUM(f.estado = 'emitida'), 0) AS emitidas,
       COALESCE(SUM(f.estado = 'anulada'), 0) AS anuladas
     FROM reservas r
     LEFT JOIN facturas f ON f.reserva_id = r.id
     WHERE ${donde}`,
    periodo.instante,
  );
  const rutas = await consultar(
    `SELECT CONCAT(v.origen, ' → ', v.destino) AS etiqueta,
            SUM(CASE WHEN r.estado_pago IN ('aprobado', 'reembolsado') THEN r.monto_total - r.monto_reembolsado ELSE 0 END) AS valor
     FROM reservas r
     INNER JOIN vuelos v ON v.id = r.vuelo_id
     WHERE ${donde}
     GROUP BY v.origen, v.destino
     HAVING valor > 0
     ORDER BY valor DESC
     LIMIT ?`,
    [...periodo.instante, TOP_GRAFICA + 1],
  );
  const filas = await consultar(
    `SELECT
       DATE_FORMAT(r.fecha_creacion, '%d/%m/%Y %H:%i') AS fecha,
       r.codigo_pnr AS pnr,
       f.numero AS factura,
       f.estado AS estado_factura,
       CONCAT(p.nombre, ' ', p.apellido) AS cliente,
       u.email AS cuenta,
       CONCAT(v.origen, ' → ', v.destino) AS ruta,
       r.estado_pago,
       r.monto_total AS total,
       r.monto_reembolsado AS devuelto,
       CASE WHEN r.estado_pago IN ('aprobado', 'reembolsado') THEN r.monto_total - r.monto_reembolsado ELSE 0 END AS neto
     FROM reservas r
     INNER JOIN pasajeros p ON p.id = r.pasajero_id
     INNER JOIN vuelos v ON v.id = r.vuelo_id
     LEFT JOIN facturas f ON f.reserva_id = r.id
     LEFT JOIN usuarios u ON u.id = r.usuario_id
     WHERE ${donde}
     ORDER BY r.fecha_creacion DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...periodo.instante, limite, offset],
  );
  const grafica = topSeries(rutas, 'verde', `Se muestran las ${TOP_GRAFICA} rutas con mayor ingreso.`);
  return {
    titulo: 'Ingresos',
    descripcion: 'Cobros del periodo, ya restando lo devuelto por cancelación. Cada reserva sigue en Finanzas.',
    nota: `Facturas emitidas: ${numero(totales.emitidas).toLocaleString('es-GT')} · Anuladas: ${numero(totales.anuladas).toLocaleString('es-GT')}`,
    resumen: [
      { etiqueta: 'Ingresos netos', valor: `Q ${dinero(totales.neto).toFixed(2)}` },
      { etiqueta: 'Devuelto', valor: `Q ${dinero(totales.devuelto).toFixed(2)}` },
      { etiqueta: 'Reservas pagadas', valor: numero(totales.pagadas).toLocaleString('es-GT') },
      { etiqueta: 'Reservas canceladas', valor: numero(totales.canceladas).toLocaleString('es-GT') },
    ],
    grafica: {
      titulo: 'Ingreso neto por ruta',
      unidad: 'dinero',
      series: grafica.series,
      nota: grafica.nota,
    },
    columnas: [
      { clave: 'fecha', titulo: 'Compra' },
      { clave: 'pnr', titulo: 'Reserva' },
      { clave: 'factura', titulo: 'Factura' },
      { clave: 'estado_factura', titulo: 'Estado de factura' },
      { clave: 'cliente', titulo: 'Pasajero' },
      { clave: 'cuenta', titulo: 'Cuenta' },
      { clave: 'ruta', titulo: 'Ruta' },
      { clave: 'pago', titulo: 'Pago' },
      { clave: 'total', titulo: 'Total', tipo: 'dinero' },
      { clave: 'devuelto', titulo: 'Devuelto', tipo: 'dinero' },
      { clave: 'neto', titulo: 'Neto', tipo: 'dinero' },
    ],
    filas: filas.map((fila) => ({
      fecha: fila.fecha,
      pnr: fila.pnr,
      factura: fila.factura || 'Sin factura',
      estado_factura: etiquetaFactura(fila.estado_factura),
      cliente: fila.cliente,
      cuenta: fila.cuenta || 'Sin cuenta',
      ruta: fila.ruta,
      pago: etiquetaPago(fila.estado_pago),
      total: dinero(fila.total),
      devuelto: dinero(fila.devuelto),
      neto: dinero(fila.neto),
    })),
    total: numero(conteo.total),
  };
};

const desdePasajeros = `
  FROM reserva_pasajeros rp
  INNER JOIN reservas r ON r.id = rp.reserva_id
  INNER JOIN pasajeros p ON p.id = rp.pasajero_id
  INNER JOIN vuelos v ON v.id = r.vuelo_id
  LEFT JOIN asientos a ON a.id = rp.asiento_id
`;

const reportePasajeros = async (periodo, limite, offset) => {
  const donde = `r.estado_pago = 'aprobado' AND ${filtroSalida}`;
  const [conteo] = await consultar(
    `SELECT COUNT(*) AS total ${desdePasajeros} WHERE ${donde}`,
    periodo.salida,
  );
  const [totales] = await consultar(
    `SELECT
       COUNT(*) AS pasajeros,
       COALESCE(SUM(p.tipo = 'adulto'), 0) AS adultos,
       COALESCE(SUM(p.tipo = 'nino'), 0) AS ninos,
       COALESCE(SUM(p.tipo = 'infante'), 0) AS infantes
     ${desdePasajeros}
     WHERE ${donde}`,
    periodo.salida,
  );
  const rutas = await consultar(
    `SELECT CONCAT(v.origen, ' → ', v.destino) AS etiqueta, COUNT(*) AS valor
     ${desdePasajeros}
     WHERE ${donde}
     GROUP BY v.origen, v.destino
     ORDER BY valor DESC
     LIMIT ?`,
    [...periodo.salida, TOP_GRAFICA + 1],
  );
  const filas = await consultar(
    `SELECT
       DATE_FORMAT(${salidaReal('v')}, '%d/%m/%Y %H:%i') AS salida,
       CONCAT(v.origen, ' → ', v.destino) AS ruta,
       r.codigo_pnr AS pnr,
       CONCAT(p.nombre, ' ', p.apellido) AS pasajero,
       p.documento_identidad AS documento,
       p.tipo,
       p.nacionalidad,
       a.numero_asiento,
       p.email,
       p.telefono
     ${desdePasajeros}
     WHERE ${donde}
     ORDER BY ${salidaReal('v')}, r.codigo_pnr, rp.orden
     LIMIT ? OFFSET ?`,
    [...periodo.salida, limite, offset],
  );
  const grafica = topSeries(rutas, 'azul', `Se muestran las ${TOP_GRAFICA} rutas con más pasajeros.`);
  return {
    titulo: 'Pasajeros',
    descripcion: 'Personas con reserva pagada en vuelos que salen en el periodo.',
    resumen: [
      { etiqueta: 'Pasajeros', valor: numero(totales.pasajeros).toLocaleString('es-GT') },
      { etiqueta: 'Adultos', valor: numero(totales.adultos).toLocaleString('es-GT') },
      { etiqueta: 'Niños', valor: numero(totales.ninos).toLocaleString('es-GT') },
      { etiqueta: 'Infantes', valor: numero(totales.infantes).toLocaleString('es-GT') },
    ],
    grafica: {
      titulo: 'Pasajeros por ruta',
      unidad: 'numero',
      series: grafica.series,
      nota: grafica.nota,
    },
    columnas: [
      { clave: 'salida', titulo: 'Salida' },
      { clave: 'ruta', titulo: 'Ruta' },
      { clave: 'pnr', titulo: 'Reserva' },
      { clave: 'pasajero', titulo: 'Pasajero' },
      { clave: 'documento', titulo: 'Documento' },
      { clave: 'tipo', titulo: 'Tipo' },
      { clave: 'nacionalidad', titulo: 'Nacionalidad' },
      { clave: 'asiento', titulo: 'Asiento' },
      { clave: 'correo', titulo: 'Correo' },
      { clave: 'telefono', titulo: 'Teléfono' },
    ],
    filas: filas.map((fila) => ({
      salida: fila.salida,
      ruta: fila.ruta,
      pnr: fila.pnr,
      pasajero: fila.pasajero,
      documento: fila.documento,
      tipo: etiquetaTipo(fila.tipo),
      nacionalidad: fila.nacionalidad || null,
      asiento: fila.numero_asiento || 'Sin asiento',
      correo: fila.email,
      telefono: fila.telefono,
    })),
    total: numero(conteo.total),
  };
};

const desdeCheckin = `
  FROM reserva_pasajeros rp
  INNER JOIN reservas r ON r.id = rp.reserva_id
  INNER JOIN pasajeros p ON p.id = rp.pasajero_id
  INNER JOIN vuelos v ON v.id = r.vuelo_id
  LEFT JOIN asientos a ON a.id = rp.asiento_id
  LEFT JOIN checkins c ON c.reserva_pasajero_id = rp.id
`;

const reporteCheckin = async (periodo, limite, offset) => {
  const donde = `r.estado_pago = 'aprobado' AND ${filtroSalida}`;
  const [conteo] = await consultar(
    `SELECT COUNT(*) AS total ${desdeCheckin} WHERE ${donde}`,
    periodo.salida,
  );
  const [totales] = await consultar(
    `SELECT
       COALESCE(SUM(c.estado IN ('chequeado', 'abordado', 'no_show')), 0) AS emitidos,
       COALESCE(SUM(c.estado = 'abordado'), 0) AS abordados,
       COALESCE(SUM(c.estado = 'no_show'), 0) AS ausentes,
       COALESCE(SUM(c.id IS NULL), 0) AS sin_checkin,
       COALESCE(SUM(c.estado = 'chequeado'), 0) AS con_boleto,
       COALESCE(SUM(c.estado = 'anulado'), 0) AS anulados
     ${desdeCheckin}
     WHERE ${donde}`,
    periodo.salida,
  );
  const series = [
    { etiqueta: 'Sin check-in', valor: numero(totales.sin_checkin), color: 'slate' },
    { etiqueta: 'Con boleto', valor: numero(totales.con_boleto), color: 'azul' },
    { etiqueta: 'Abordó', valor: numero(totales.abordados), color: 'verde' },
    { etiqueta: 'No se presentó', valor: numero(totales.ausentes), color: 'ambar' },
    { etiqueta: 'Anulado', valor: numero(totales.anulados), color: 'rojo' },
  ].filter((serie) => serie.valor > 0);
  const filas = await consultar(
    `SELECT
       DATE_FORMAT(${salidaReal('v')}, '%d/%m/%Y %H:%i') AS salida,
       CONCAT(v.origen, ' → ', v.destino) AS ruta,
       r.codigo_pnr AS pnr,
       CONCAT(p.nombre, ' ', p.apellido) AS pasajero,
       a.numero_asiento,
       c.codigo_boleto,
       c.estado,
       c.id AS checkin_id,
       c.maleta_mano,
       c.maleta_bodega_kg,
       DATE_FORMAT(c.fecha_checkin, '%d/%m/%Y %H:%i') AS fecha_checkin
     ${desdeCheckin}
     WHERE ${donde}
     ORDER BY ${salidaReal('v')}, r.codigo_pnr, rp.orden
     LIMIT ? OFFSET ?`,
    [...periodo.salida, limite, offset],
  );
  const estadoDe = (fila) => {
    if (!fila.checkin_id) {
      return 'Sin check-in';
    }
    return {
      chequeado: 'Con boleto',
      abordado: 'Abordó',
      no_show: 'No se presentó',
      anulado: 'Anulado',
    }[fila.estado] || 'Sin check-in';
  };
  return {
    titulo: 'Check-in y abordaje',
    descripcion: 'Situación de cada pasajero con reserva pagada, según el vuelo que sale en el periodo.',
    resumen: [
      { etiqueta: 'Boletos emitidos', valor: numero(totales.emitidos).toLocaleString('es-GT') },
      { etiqueta: 'Abordaron', valor: numero(totales.abordados).toLocaleString('es-GT') },
      { etiqueta: 'No se presentaron', valor: numero(totales.ausentes).toLocaleString('es-GT') },
      { etiqueta: 'Sin check-in', valor: numero(totales.sin_checkin).toLocaleString('es-GT') },
    ],
    grafica: {
      titulo: 'Situación de los pasajeros',
      unidad: 'numero',
      series,
      nota: '',
    },
    columnas: [
      { clave: 'salida', titulo: 'Salida' },
      { clave: 'ruta', titulo: 'Ruta' },
      { clave: 'pnr', titulo: 'Reserva' },
      { clave: 'pasajero', titulo: 'Pasajero' },
      { clave: 'asiento', titulo: 'Asiento' },
      { clave: 'boleto', titulo: 'Boleto' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'mano', titulo: 'Maleta de mano' },
      { clave: 'bodega', titulo: 'Bodega (kg)', tipo: 'numero' },
      { clave: 'checkin', titulo: 'Check-in' },
    ],
    filas: filas.map((fila) => ({
      salida: fila.salida,
      ruta: fila.ruta,
      pnr: fila.pnr,
      pasajero: fila.pasajero,
      asiento: fila.numero_asiento || 'Sin asiento',
      boleto: fila.codigo_boleto || null,
      estado: estadoDe(fila),
      mano: fila.checkin_id ? (Number(fila.maleta_mano) ? 'Sí' : 'No') : null,
      bodega: fila.checkin_id ? numero(fila.maleta_bodega_kg) : null,
      checkin: fila.fecha_checkin || null,
    })),
    total: numero(conteo.total),
  };
};

const reporteBitacora = async (periodo, limite, offset) => {
  const donde = 'b.creado_en >= ? AND b.creado_en < ?';
  const [conteo] = await consultar(
    `SELECT COUNT(*) AS total FROM bitacora b WHERE ${donde}`,
    periodo.instante,
  );
  const [totales] = await consultar(
    `SELECT
       COUNT(*) AS registros,
       COUNT(DISTINCT b.usuario_id) AS cuentas,
       COALESCE(SUM(b.accion = 'pago'), 0) AS pagos,
       COALESCE(SUM(b.accion = 'checkin'), 0) AS checkins
     FROM bitacora b
     WHERE ${donde}`,
    periodo.instante,
  );
  const acciones = await consultar(
    `SELECT b.accion AS etiqueta, COUNT(*) AS valor
     FROM bitacora b
     WHERE ${donde}
     GROUP BY b.accion
     ORDER BY valor DESC`,
    periodo.instante,
  );
  const filas = await consultar(
    `SELECT
       DATE_FORMAT(b.creado_en, '%d/%m/%Y %H:%i') AS fecha,
       u.nombre,
       u.email,
       b.accion,
       b.detalle,
       b.ip
     FROM bitacora b
     LEFT JOIN usuarios u ON u.id = b.usuario_id
     WHERE ${donde}
     ORDER BY b.creado_en DESC, b.id DESC
     LIMIT ? OFFSET ?`,
    [...periodo.instante, limite, offset],
  );
  return {
    titulo: 'Bitácora',
    descripcion: 'Acciones registradas en el periodo. No incluye contraseñas ni datos de pago internos.',
    resumen: [
      { etiqueta: 'Registros', valor: numero(totales.registros).toLocaleString('es-GT') },
      { etiqueta: 'Cuentas distintas', valor: numero(totales.cuentas).toLocaleString('es-GT') },
      { etiqueta: 'Pagos', valor: numero(totales.pagos).toLocaleString('es-GT') },
      { etiqueta: 'Check-in', valor: numero(totales.checkins).toLocaleString('es-GT') },
    ],
    grafica: {
      titulo: 'Acciones registradas',
      unidad: 'numero',
      series: acciones.map((fila) => ({
        etiqueta: etiquetaAccion(fila.etiqueta),
        valor: numero(fila.valor),
        color: 'azul',
      })),
      nota: '',
    },
    columnas: [
      { clave: 'fecha', titulo: 'Fecha' },
      { clave: 'quien', titulo: 'Quién' },
      { clave: 'correo', titulo: 'Correo' },
      { clave: 'accion', titulo: 'Acción' },
      { clave: 'detalle', titulo: 'Detalle' },
      { clave: 'direccion', titulo: 'Dirección' },
    ],
    filas: filas.map((fila) => ({
      fecha: fila.fecha,
      quien: fila.nombre || 'Sin cuenta',
      correo: fila.email || null,
      accion: etiquetaAccion(fila.accion),
      detalle: fila.detalle,
      direccion: fila.ip || null,
    })),
    total: numero(conteo.total),
  };
};

const ARMADORES = {
  vuelos: reporteVuelos,
  ingresos: reporteIngresos,
  pasajeros: reportePasajeros,
  checkin: reporteCheckin,
  bitacora: reporteBitacora,
};

const NOMBRES = {
  vuelos: 'vuelos',
  ingresos: 'ingresos',
  pasajeros: 'pasajeros',
  checkin: 'check-in',
  bitacora: 'bitacora',
};

const construir = async (tipo, consulta, paraArchivo) => {
  const armar = ARMADORES[tipo];
  if (!armar) {
    throw new ErrorReporte('Ese reporte no existe.');
  }
  const periodo = periodoDe(consulta);
  const sonda = await armar(periodo, 1, 0);
  if (paraArchivo && sonda.total > LIMITE_ARCHIVO) {
    throw new ErrorReporte('Hay demasiadas filas para un archivo. Acorta el rango de fechas.');
  }
  const pagina = paginaDe(consulta.pagina, sonda.total);
  const limite = paraArchivo ? LIMITE_ARCHIVO : POR_PAGINA;
  const offset = paraArchivo ? 0 : pagina.offset;
  const reporte = sonda.total === 0 ? sonda : await armar(periodo, limite, offset);
  return {
    tipo,
    archivo: `reporte-${NOMBRES[tipo]}-${periodo.desde}-a-${periodo.hasta}.xlsx`,
    desde: periodo.desde,
    hasta: periodo.hasta,
    por_pagina: POR_PAGINA,
    pagina: paraArchivo ? 1 : pagina.pagina,
    paginas: pagina.paginas,
    ...reporte,
    total: sonda.total,
  };
};

export const generarReporte = (tipo, consulta) => construir(tipo, consulta, false);

export const exportarReporteExcel = async (tipo, consulta) => {
  const reporte = await construir(tipo, consulta, true);
  return {
    nombre: reporte.archivo,
    contenido: await libroDeReporte(reporte),
  };
};
