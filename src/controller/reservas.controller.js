import {
  crearReservaTransaccion,
  obtenerPorPNR,
  actualizarPago,
} from '../models/reserva.model.js';

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
    } = req.body;

    const reserva = await crearReservaTransaccion({
      nombre,
      apellido,
      documento_identidad,
      email,
      telefono,
      vuelo_id,
      asiento_id,
      monto_total,
      usuario_id,
    });

    res.status(201).json({
      codigo_pnr: reserva.codigo_pnr,
      id: reserva.id,
    });
  } catch (error) {
    if (error.message === 'El asiento ya no está disponible o no existe') {
      return res.status(400).json({ mensaje: error.message });
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
