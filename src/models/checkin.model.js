import pool from '../config/db.js';
import { conTransaccion } from '../utils/transaccion.js';
import { emparejarInfantes, evaluarCheckin } from '../utils/checkinVentana.js';

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

const nombreCompleto = (viajero) => `${viajero.nombre || ''} ${viajero.apellido || ''}`.trim();

const presentarViajeros = (filas) => {
  const porAdulto = emparejarInfantes(filas);
  return filas.map((viajero) => ({
    id: viajero.reserva_pasajero_id,
    nombre: viajero.nombre,
    apellido: viajero.apellido,
    tipo: viajero.tipo,
    documento_identidad: viajero.documento_identidad,
    numero_asiento: viajero.numero_asiento,
    codigo_boleto: viajero.estado_checkin === 'chequeado' ? viajero.codigo_boleto : null,
    estado_checkin: viajero.estado_checkin,
    infantes_en_regazo: (porAdulto.get(viajero.reserva_pasajero_id) || []).map(nombreCompleto),
  }));
};

const consultarReserva = async (executor, pnr, usuarioId, bloquear) => {
  const [filas] = await executor.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      r.usuario_id,
      r.estado_pago,
      p.email,
      v.origen,
      v.destino,
      v.fecha_salida,
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
      a.numero_asiento,
      c.id AS checkin_id,
      c.codigo_boleto,
      c.estado AS estado_checkin
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
    email: reserva.email,
    abierto: ventana.abierto,
    motivo: ventana.motivo,
    mensaje: ventana.mensaje,
    viajeros: presentarViajeros(filas),
  };
};

const insertarBoleto = async (connection, reservaPasajeroId) => {
  for (let intento = 0; intento < 5; intento += 1) {
    const codigo = generarCodigoBoleto();
    try {
      await connection.query(
        'INSERT INTO checkins (reserva_pasajero_id, codigo_boleto) VALUES (?, ?)',
        [reservaPasajeroId, codigo]
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
  const codigo = codigoPnr(pnr);
  const reserva = await consultarReserva(pool, codigo, usuarioId, false);
  if (!reserva) {
    throw errorCheckin('Reserva no encontrada', 404);
  }
  const viajeros = await consultarViajeros(pool, reserva.id, false);
  return armarRespuesta(reserva, viajeros);
};

export const emitirCheckin = async ({ pnr, usuarioId, viajeros }) => {
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
        .filter((viajero) => viajero.estado_checkin !== 'chequeado' && elegidos.includes(viajero.reserva_pasajero_id))
        .map((viajero) => viajero.reserva_pasajero_id)
    );
    filas
      .filter((viajero) => viajero.tipo === 'infante' && viajero.estado_checkin !== 'chequeado')
      .forEach((viajero) => pendientes.add(viajero.reserva_pasajero_id));

    const ventana = evaluarCheckin({
      estadoPago: reserva.estado_pago,
      estadoVuelo: reserva.estado_vuelo,
      segundosParaSalida: reserva.segundos_para_salida,
    });
    if (pendientes.size > 0 && !ventana.abierto) {
      throw errorCheckin(ventana.mensaje, 400);
    }

    const creados = [];
    for (const id of pendientes) {
      const viajero = porId.get(id);
      if (viajero.checkin_id) {
        throw errorCheckin('Ese viajero no puede hacer check-in', 400);
      }
      const codigoBoleto = await insertarBoleto(connection, id);
      creados.push({ id, codigo_boleto: codigoBoleto });
      viajero.estado_checkin = 'chequeado';
      viajero.codigo_boleto = codigoBoleto;
    }

    return {
      ...armarRespuesta(reserva, filas),
      creados: creados.length,
      nuevos: creados,
    };
  });
};

export const obtenerBoletosEmitidos = async (pnr, usuarioId) => {
  const datos = await obtenerElegibilidad(pnr, usuarioId);
  const boletos = datos.viajeros.filter((viajero) => viajero.codigo_boleto);
  if (boletos.length === 0) {
    throw errorCheckin('Todavía no hay boletos para esta reserva', 400);
  }
  return { ...datos, viajeros: boletos };
};
