import jwt from 'jsonwebtoken';
import {
  crearReservaTransaccion,
  obtenerTodas,
  obtenerPorPNR,
  actualizarPago,
} from '../models/reserva.model.js';

const usuarioDesdeToken = (req) => {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';
  if (!token) {
    return null;
  }
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const obtenerReservas = async (req, res) => {
  try {
    const reservas = await obtenerTodas();
    res.status(200).json(reservas);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener las reservas',
      error: error.message,
    });
  }
};

export const crearReserva = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      documento_identidad,
      email,
      telefono,
      vuelo_id,
      asiento_id,
      monto_total,
      usuario_id,
      pasajero_id,
      equipaje_extra_kg,
      costo_servicios_extra,
      metodo_pago,
    } = req.body;

    const metodo = metodo_pago === 'saldo' ? 'saldo' : 'tarjeta';
    let usuarioCobro = usuario_id;

    if (metodo === 'saldo') {
      let sesion;
      try {
        sesion = usuarioDesdeToken(req);
      } catch (error) {
        return res.status(401).json({ mensaje: 'Sesión no válida' });
      }
      if (!sesion?.id) {
        return res.status(401).json({ mensaje: 'Inicia sesión para pagar con tu saldo' });
      }
      usuarioCobro = sesion.id;
    }

    const llave_idempotencia = req.headers['idempotency-key'];

    const reserva = await crearReservaTransaccion({
      nombre,
      apellido,
      documento_identidad,
      email,
      telefono,
      vuelo_id,
      asiento_id,
      monto_total,
      usuario_id: usuarioCobro,
      pasajero_id,
      equipaje_extra_kg,
      costo_servicios_extra,
      metodo_pago: metodo,
      llave_idempotencia,
    });

    res.status(201).json({
      codigo_pnr: reserva.codigo_pnr,
      id: reserva.id,
    });
  } catch (error) {
    if (error.message === 'El asiento ya no está disponible o no existe' || error.message === 'El vuelo no existe') {
      return res.status(400).json({ mensaje: error.message });
    }
    if (error.message === 'Saldo insuficiente') {
      return res.status(400).json({ mensaje: 'Saldo insuficiente para completar la reserva' });
    }

    res.status(500).json({
      mensaje: 'Error al crear la reserva',
      error: error.message,
    });
  }
};

export const consultarReserva = async (req, res) => {
  try {
    const { pnr } = req.params;
    const reserva = await obtenerPorPNR(pnr);

    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    res.status(200).json(reserva);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al consultar la reserva',
      error: error.message,
    });
  }
};

export const pagarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await actualizarPago(id);
    res.status(200).json({
      mensaje: 'Pago actualizado correctamente',
      saldo_virtual: pago.saldo_virtual,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al actualizar el pago',
      error: error.message,
    });
  }
};
