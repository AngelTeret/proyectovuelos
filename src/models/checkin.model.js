import pool from '../config/db.js';
import { conTransaccion } from '../utils/transaccion.js';
import { emparejarInfantes, evaluarCheckin } from '../utils/checkinVentana.js';
import { franquiciaDe } from '../utils/franquiciaEquipaje.js';
import { marcarSalidas } from './abordaje.model.js';

const errorCheckin = (mensaje, codigo) => {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
};

const codigoPnr = (valor) => {
  const codigo = String(valor || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(codigo)) {
    throw errorCheckin('El código de reserva no es válido', 400);
  }
  return codigo;
};

const generarCodigoBoleto = () => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 8; i += 1) {
    codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return codigo;
};

const RANGO_CATEGORIA = { Básica: 1, Estándar: 2, Premium: 3 };

const rangoCategoria = (categoria) => RANGO_CATEGORIA[categoria] || 1;

const nombreCompleto = (viajero) => `${viajero.nombre || ''} ${viajero.apellido || ''}`.trim();

const ESTADOS_CON_BOLETO = new Set(['chequeado', 'abordado', 'no_show']);

const tieneBoleto = (viajero) => ESTADOS_CON_BOLETO.has(viajero.estado_checkin);

const presentarViajeros = (filas) => {
  const porAdulto = emparejarInfantes(filas);
  return filas.map((viajero) => {
    const infante = viajero.tipo === 'infante';
    return {
      id: viajero.reserva_pasajero_id,
      nombre: viajero.nombre,
      apellido: viajero.apellido,
      tipo: viajero.tipo,
      documento_identidad: viajero.documento_identidad,
      asiento_id: viajero.asiento_id,
      numero_asiento: viajero.numero_asiento,
      categoria: viajero.categoria,
      maleta_mano: infante ? 0 : (viajero.maleta_mano == null ? 1 : Number(viajero.maleta_mano)),
      maleta_bodega_kg: infante ? 0 : Number(viajero.maleta_bodega_kg) || 0,
      codigo_boleto: tieneBoleto(viajero) ? viajero.codigo_boleto : null,
      estado_checkin: viajero.estado_checkin,
      cambios_asiento: Number(viajero.cambios_asiento) || 0,
      infantes_en_regazo: (porAdulto.get(viajero.reserva_pasajero_id) || []).map(nombreCompleto),
    };
  });
};

const consultarReserva = async (executor, pnr, usuarioId, bloquear) => {
  const [filas] = await executor.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      r.usuario_id,
      r.estado_pago,
      r.vuelo_id,
      r.equipaje_extra_kg,
      p.email,
      v.origen,
      v.destino,
      v.fecha_salida,
      v.duracion_minutos,
      v.estado AS estado_vuelo,
      TIMESTAMPDIFF(SECOND, NOW(), v.fecha_salida) AS segundos_para_salida
    FROM reservas r
    INNER JOIN vuelos v ON v.id = r.vuelo_id
    INNER JOIN pasajeros p ON p.id = r.pasajero_id
    WHERE r.codigo_pnr = ? AND r.usuario_id = ?
    ${bloquear ? 'FOR UPDATE' : ''}`,
    [pnr, usuarioId]
  );
  return filas[0] || null;
};

const consultarViajeros = async (executor, reservaId, bloquear) => {
  const [filas] = await executor.query(
    `SELECT
      rp.id AS reserva_pasajero_id,
      rp.orden,
      p.nombre,
      p.apellido,
      p.tipo,
      p.documento_identidad,
      rp.asiento_id,
      rp.cambios_asiento,
      a.numero_asiento,
      a.categoria,
      c.id AS checkin_id,
      c.codigo_boleto,
      c.estado AS estado_checkin,
      c.maleta_mano,
      c.maleta_bodega_kg
    FROM reserva_pasajeros rp
    INNER JOIN pasajeros p ON p.id = rp.pasajero_id
    LEFT JOIN asientos a ON a.id = rp.asiento_id
    LEFT JOIN checkins c ON c.reserva_pasajero_id = rp.id
    WHERE rp.reserva_id = ?
    ORDER BY rp.orden
    ${bloquear ? 'FOR UPDATE' : ''}`,
    [reservaId]
  );
  return filas;
};

const armarRespuesta = (reserva, filas) => {
  const ventana = evaluarCheckin({
    estadoPago: reserva.estado_pago,
    estadoVuelo: reserva.estado_vuelo,
    segundosParaSalida: reserva.segundos_para_salida,
  });
  return {
    codigo_pnr: reserva.codigo_pnr,
    origen: reserva.origen,
    destino: reserva.destino,
    fecha_salida: reserva.fecha_salida,
    duracion_minutos: Number(reserva.duracion_minutos) || 0,
    vuelo_id: reserva.vuelo_id,
    equipaje_extra_kg: Number(reserva.equipaje_extra_kg) || 0,
    estado_vuelo: reserva.estado_vuelo,
    email: reserva.email,
    abierto: ventana.abierto,
    motivo: ventana.motivo,
    mensaje: ventana.mensaje,
    viajeros: presentarViajeros(filas),
  };
};

const insertarBoleto = async (connection, reservaPasajeroId, maleta) => {
  for (let intento = 0; intento < 5; intento += 1) {
    const codigo = generarCodigoBoleto();
    try {
      await connection.query(
        'INSERT INTO checkins (reserva_pasajero_id, codigo_boleto, maleta_mano, maleta_bodega_kg) VALUES (?, ?, ?, ?)',
        [reservaPasajeroId, codigo, maleta.mano, maleta.bodega]
      );
      return codigo;
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
      if (String(error.sqlMessage || error.message || '').includes('uk_checkin_pasajero')) {
        throw errorCheckin('Ese viajero ya tiene boleto', 400);
      }
    }
  }
  throw errorCheckin('No se pudo emitir el boleto', 500);
};

const exigirVentana = (reserva) => {
  const ventana = evaluarCheckin({
    estadoPago: reserva.estado_pago,
    estadoVuelo: reserva.estado_vuelo,
    segundosParaSalida: reserva.segundos_para_salida,
  });
  if (!ventana.abierto) {
    throw errorCheckin(ventana.mensaje, 400);
  }
};

const cambiosDeAsiento = (cambios, filas) => {
  if (!Array.isArray(cambios) || cambios.length === 0) {
    return [];
  }
  const porId = new Map(filas.map((viajero) => [viajero.reserva_pasajero_id, viajero]));
  const vistos = new Set();
  const destinos = new Set();
  const lista = [];
  cambios.forEach((cambio) => {
    const id = Number(cambio?.id);
    const asientoId = Number(cambio?.asiento_id);
    const viajero = porId.get(id);
    if (!viajero) {
      throw errorCheckin('Ese viajero no está en la reserva', 400);
    }
    if (viajero.tipo === 'infante' || !viajero.asiento_id) {
      throw errorCheckin('El infante viaja en regazo y no cambia de asiento', 400);
    }
    if (asientoId !== Number(viajero.asiento_id) && tieneBoleto(viajero)) {
      throw errorCheckin('El asiento queda fijo después del check-in', 400);
    }
    if (!Number.isInteger(asientoId) || asientoId <= 0) {
      throw errorCheckin('Elige un asiento libre', 400);
    }
    if (vistos.has(id) || destinos.has(asientoId)) {
      throw errorCheckin('Elige un asiento distinto para cada pasajero', 400);
    }
    vistos.add(id);
    destinos.add(asientoId);
    if (asientoId !== Number(viajero.asiento_id)) {
      lista.push({ viajero, asientoId });
    }
  });
  return lista;
};

const aplicarAsientos = async (connection, reserva, cambios) => {
  for (const cambio of cambios) {
    const [destinos] = await connection.query(
      `SELECT id, vuelo_id, estado, categoria, numero_asiento, bloqueo_hasta > NOW() AS vigente
       FROM asientos WHERE id = ? FOR UPDATE`,
      [cambio.asientoId]
    );
    const destino = destinos[0];
    const libre = destino && (
      destino.estado === 'disponible'
      || (destino.estado === 'reservado_temporal' && Number(destino.vigente) !== 1)
    );
    if (!destino || Number(destino.vuelo_id) !== Number(reserva.vuelo_id) || !libre) {
      throw errorCheckin('Ese asiento ya no está libre', 400);
    }
    if (Number(cambio.viajero.cambios_asiento) >= 1) {
      throw errorCheckin('Ya usaste el cambio de asiento', 400);
    }
    if (rangoCategoria(destino.categoria) > rangoCategoria(cambio.viajero.categoria)) {
      throw errorCheckin('Solo puedes pasar a un asiento de la misma categoría o de una menor', 400);
    }
    await connection.query('SELECT id FROM asientos WHERE id = ? FOR UPDATE', [cambio.viajero.asiento_id]);
    const [liberado] = await connection.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE id = ? AND estado = 'confirmado'`,
      [cambio.viajero.asiento_id]
    );
    if (liberado.affectedRows !== 1) {
      throw errorCheckin('No se pudo cambiar el asiento', 400);
    }
    await connection.query(
      `UPDATE asientos
       SET estado = 'confirmado', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE id = ?`,
      [destino.id]
    );
    const [pasajero] = await connection.query(
      'UPDATE reserva_pasajeros SET asiento_id = ?, cambios_asiento = cambios_asiento + 1 WHERE id = ? AND cambios_asiento = 0',
      [destino.id, cambio.viajero.reserva_pasajero_id]
    );
    if (pasajero.affectedRows !== 1) {
      throw errorCheckin('Ya usaste el cambio de asiento', 400);
    }
    await connection.query(
      'UPDATE reservas SET asiento_id = ? WHERE id = ? AND asiento_id = ?',
      [destino.id, reserva.id, cambio.viajero.asiento_id]
    );
    cambio.viajero.asiento_id = destino.id;
    cambio.viajero.numero_asiento = destino.numero_asiento;
    cambio.viajero.categoria = destino.categoria;
    cambio.viajero.cambios_asiento = Number(cambio.viajero.cambios_asiento) + 1;
  }
};

const maletasDe = (maletas, filas, extraKg) => {
  if (!Array.isArray(maletas) || maletas.length === 0) {
    return new Map();
  }
  const porId = new Map(filas.map((viajero) => [viajero.reserva_pasajero_id, viajero]));
  const propuestas = new Map();
  maletas.forEach((item) => {
    const id = Number(item?.id);
    const viajero = porId.get(id);
    if (!viajero) {
      throw errorCheckin('Ese viajero no está en la reserva', 400);
    }
    if (viajero.tipo === 'infante') {
      return;
    }
    const bodega = Math.round(Number(item?.maleta_bodega_kg) * 10) / 10;
    if (!Number.isFinite(bodega) || bodega < 0 || bodega > 99) {
      throw errorCheckin('Revisa los kilos de la maleta', 400);
    }
    propuestas.set(id, { mano: franquiciaDe(viajero.categoria).mano ? 1 : 0, bodega });
  });

  let suma = 0;
  filas.forEach((viajero) => {
    if (viajero.tipo === 'infante') {
      return;
    }
    const propuesta = propuestas.get(viajero.reserva_pasajero_id);
    suma += propuesta ? propuesta.bodega : Number(viajero.maleta_bodega_kg) || 0;
  });
  const tope = Number(extraKg) || 0;
  if (Math.round(suma * 10) / 10 > tope) {
    throw errorCheckin(`Los kilos extra de bodega no pueden pasar de ${tope} kg ya pagados`, 400);
  }
  return propuestas;
};

const maletaDeViajero = (propuestas, viajero) => {
  if (viajero.tipo === 'infante') {
    return { mano: 0, bodega: 0 };
  }
  return propuestas.get(viajero.reserva_pasajero_id) || {
    mano: franquiciaDe(viajero.categoria).mano ? 1 : 0,
    bodega: Number(viajero.maleta_bodega_kg) || 0,
  };
};

const guardarMaletas = async (connection, filas, propuestas, omitir) => {
  let guardadas = 0;
  for (const [id, maleta] of propuestas) {
    if (omitir.has(id)) {
      continue;
    }
    const viajero = filas.find((item) => item.reserva_pasajero_id === id);
    if (!viajero?.checkin_id || viajero.estado_checkin !== 'chequeado') {
      continue;
    }
    await connection.query(
      `UPDATE checkins
       SET maleta_mano = ?, maleta_bodega_kg = ?
       WHERE reserva_pasajero_id = ? AND estado = 'chequeado'`,
      [maleta.mano, maleta.bodega, id]
    );
    guardadas += 1;
  }
  return guardadas;
};

export const anularCheckinsDeReserva = async (connection, reservaId) => {
  await connection.query(
    `UPDATE checkins c
     INNER JOIN reserva_pasajeros rp ON rp.id = c.reserva_pasajero_id
     SET c.estado = 'anulado', c.fecha_anulacion = NOW()
     WHERE rp.reserva_id = ? AND c.estado <> 'anulado'`,
    [reservaId]
  );
};

export const obtenerElegibilidad = async (pnr, usuarioId) => {
  await marcarSalidas();
  const codigo = codigoPnr(pnr);
  const reserva = await consultarReserva(pool, codigo, usuarioId, false);
  if (!reserva) {
    throw errorCheckin('Reserva no encontrada', 404);
  }
  const viajeros = await consultarViajeros(pool, reserva.id, false);
  return armarRespuesta(reserva, viajeros);
};

export const emitirCheckin = async ({ pnr, usuarioId, viajeros, maletas = [], asientos = [] }) => {
  const codigo = codigoPnr(pnr);
  if (!Array.isArray(viajeros) || viajeros.length === 0) {
    throw errorCheckin('Elige al menos un viajero', 400);
  }
  const elegidos = [...new Set(viajeros.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (elegidos.length === 0) {
    throw errorCheckin('Elige al menos un viajero', 400);
  }

  return conTransaccion(async (connection) => {
    const reserva = await consultarReserva(connection, codigo, usuarioId, true);
    if (!reserva) {
      throw errorCheckin('Reserva no encontrada', 404);
    }
    const filas = await consultarViajeros(connection, reserva.id, true);
    const porId = new Map(filas.map((viajero) => [viajero.reserva_pasajero_id, viajero]));
    if (elegidos.some((id) => !porId.has(id))) {
      throw errorCheckin('Ese viajero no está en la reserva', 400);
    }

    const pendientes = new Set(
      filas
        .filter((viajero) => !tieneBoleto(viajero) && elegidos.includes(viajero.reserva_pasajero_id))
        .map((viajero) => viajero.reserva_pasajero_id)
    );
    filas
      .filter((viajero) => viajero.tipo === 'infante' && !tieneBoleto(viajero))
      .forEach((viajero) => pendientes.add(viajero.reserva_pasajero_id));

    const cambios = cambiosDeAsiento(asientos, filas);
    const hayMaletas = Array.isArray(maletas) && maletas.length > 0;
    if (pendientes.size > 0 || cambios.length > 0 || hayMaletas) {
      exigirVentana(reserva);
    }

    await aplicarAsientos(connection, reserva, cambios);
    const propuestas = maletasDe(maletas, filas, reserva.equipaje_extra_kg);
    const creados = [];
    for (const id of pendientes) {
      const viajero = porId.get(id);
      if (viajero.checkin_id) {
        throw errorCheckin('Ese viajero no puede hacer check-in', 400);
      }
      const codigoBoleto = await insertarBoleto(connection, id, maletaDeViajero(propuestas, viajero));
      creados.push({ id, codigo_boleto: codigoBoleto });
    }
    await guardarMaletas(connection, filas, propuestas, pendientes);

    const frescas = await consultarViajeros(connection, reserva.id, false);
    return {
      ...armarRespuesta(reserva, frescas),
      creados: creados.length,
      nuevos: creados,
    };
  });
};

export const ajustarCheckin = async ({ pnr, usuarioId, maletas = [], asientos = [] }) => {
  const codigo = codigoPnr(pnr);
  return conTransaccion(async (connection) => {
    const reserva = await consultarReserva(connection, codigo, usuarioId, true);
    if (!reserva) {
      throw errorCheckin('Reserva no encontrada', 404);
    }
    const filas = await consultarViajeros(connection, reserva.id, true);
    const cambios = cambiosDeAsiento(asientos, filas);
    const hayMaletas = Array.isArray(maletas) && maletas.length > 0;
    if (cambios.length === 0 && !hayMaletas) {
      throw errorCheckin('No hay cambios para guardar', 400);
    }
    exigirVentana(reserva);
    await aplicarAsientos(connection, reserva, cambios);
    const propuestas = maletasDe(maletas, filas, reserva.equipaje_extra_kg);
    const guardadas = await guardarMaletas(connection, filas, propuestas, new Set());
    if (cambios.length === 0 && guardadas === 0) {
      throw errorCheckin('La maleta se guarda al confirmar el check-in', 400);
    }
    const frescas = await consultarViajeros(connection, reserva.id, false);
    return armarRespuesta(reserva, frescas);
  });
};

export const obtenerAsientosCheckin = async (pnr, usuarioId) => {
  const datos = await obtenerElegibilidad(pnr, usuarioId);
  const [asientos] = await pool.query(
    `SELECT
      a.id,
      a.numero_asiento,
      a.categoria,
      a.estado,
      a.bloqueo_hasta > NOW() AS vigente,
      rp.id AS reserva_pasajero_id
    FROM asientos a
    LEFT JOIN reserva_pasajeros rp ON rp.asiento_id = a.id AND rp.reserva_id = (
      SELECT id FROM reservas WHERE codigo_pnr = ? AND usuario_id = ?
    )
    WHERE a.vuelo_id = ?
    ORDER BY CAST(a.numero_asiento AS UNSIGNED), a.numero_asiento`,
    [datos.codigo_pnr, usuarioId, datos.vuelo_id]
  );
  return {
    equipaje_extra_kg: datos.equipaje_extra_kg,
    asientos: asientos.map((asiento) => ({
      id: asiento.id,
      numero: asiento.numero_asiento,
      categoria: asiento.categoria,
      rango: rangoCategoria(asiento.categoria),
      libre: asiento.estado === 'disponible' || (asiento.estado === 'reservado_temporal' && Number(asiento.vigente) !== 1),
      reserva_pasajero_id: asiento.reserva_pasajero_id,
    })),
  };
};

export const obtenerBoletosEmitidos = async (pnr, usuarioId) => {
  const datos = await obtenerElegibilidad(pnr, usuarioId);
  const boletos = datos.viajeros.filter((viajero) => viajero.codigo_boleto);
  if (boletos.length === 0) {
    throw errorCheckin('Todavía no hay boletos para esta reserva', 400);
  }
  return { ...datos, viajeros: boletos };
};
