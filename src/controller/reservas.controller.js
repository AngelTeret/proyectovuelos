import jwt from 'jsonwebtoken';
import {
  crearReservaTransaccion,
  obtenerTodas,
  obtenerHistorialPorUsuario,
  obtenerComprobantePorUsuario,
  obtenerDatosCorreoReserva,
  obtenerPorPNR,
  actualizarPago,
  cancelarReservaUsuario,
} from '../models/reserva.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';
import { crearPdfBoleto } from '../utils/boletoPdf.js';
import { enviarBoleto } from '../services/emailService.js';
import { generarTemplateBoleto, generarTemplateCancelacion } from '../services/ticketTemplate.js';

const enviarPaseDeAbordar = async (reservaId, codigoPnr) => {
  try {
    const datos = await obtenerDatosCorreoReserva(reservaId);
    if (!datos?.email) {
      console.log(`La reserva ${codigoPnr} no tiene correo para el comprobante.`);
      return false;
    }
    await enviarBoleto(
      datos.email,
      `Comprobante de reserva ${datos.codigo_pnr} - Quetzal Airlines`,
      generarTemplateBoleto(datos),
    );
    return true;
  } catch (error) {
    console.log(`La reserva ${codigoPnr} quedó confirmada, pero el comprobante no se envió: ${error.message}`);
    return false;
  }
};

const enviarAvisoCancelacion = async (reservaId, resultado) => {
  try {
    const datos = await obtenerDatosCorreoReserva(reservaId);
    if (!datos?.email) {
      console.log(`La reserva ${reservaId} no tiene correo para el aviso de cancelación.`);
      return false;
    }
    await enviarBoleto(
      datos.email,
      `Reserva ${datos.codigo_pnr} cancelada - Quetzal Airlines`,
      generarTemplateCancelacion({
        ...datos,
        reembolso: resultado.reembolso,
        parcial: resultado.parcial,
      }),
    );
    return true;
  } catch (error) {
    console.log(`La reserva ${reservaId} quedó cancelada, pero el aviso no se envió: ${error.message}`);
    return false;
  }
};

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
    responderErrorInterno(res, error);
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
      pasajero_id,
      equipaje_extra_kg,
      costo_servicios_extra,
      metodo_pago,
      bloqueo_llave,
      viajeros,
      asientos,
    } = req.body;

    const metodo = metodo_pago === 'saldo' ? 'saldo' : 'tarjeta';
    const usuarioCobro = req.usuario.id;

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
      bloqueo_llave,
      viajeros,
      asientos,
    });

    const correoEnviado = await enviarPaseDeAbordar(reserva.id, reserva.codigo_pnr);

    res.status(201).json({
      codigo_pnr: reserva.codigo_pnr,
      id: reserva.id,
      correo_enviado: correoEnviado,
    });
  } catch (error) {
    if (
      error.message === 'El asiento ya no está disponible o no existe'
      || error.message === 'El vuelo no existe'
      || error.message.startsWith('El tiempo para completar el pago terminó')
    ) {
      return res.status(400).json({ mensaje: error.message });
    }
    if (error.message === 'Saldo insuficiente') {
      return res.status(400).json({ mensaje: 'Saldo insuficiente para completar la reserva' });
    }
    if (error.codigo === 400) {
      return res.status(400).json({ mensaje: error.message });
    }

    responderErrorInterno(res, error);
  }
};

export const obtenerHistorialUsuario = async (req, res) => {
  try {
    const sesion = usuarioDesdeToken(req);
    if (!sesion?.id) {
      return res.status(401).json({ mensaje: 'Inicia sesión para ver tu historial' });
    }

    const historial = await obtenerHistorialPorUsuario(sesion.id);
    res.status(200).json(historial);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Sesión no válida' });
    }
    responderErrorInterno(res, error);
  }
};

export const consultarReserva = async (req, res) => {
  try {
    const { pnr } = req.params;
    const reserva = await obtenerPorPNR(pnr);
    const esDueno = Number(reserva?.usuario_id) === Number(req.usuario.id);
    const esAdmin = req.usuario.rol === 'admin';

    if (!reserva || (!esDueno && !esAdmin)) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    const { usuario_id, ...datos } = reserva;
    res.status(200).json(datos);
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const cancelarReserva = async (req, res) => {
  try {
    const sesion = usuarioDesdeToken(req);
    if (!sesion?.id) {
      return res.status(401).json({ mensaje: 'Inicia sesión para cancelar la reserva' });
    }

    const reservaId = Number(req.params.id);
    if (!reservaId) {
      return res.status(400).json({ mensaje: 'No se pudo cancelar la reserva' });
    }

    const resultado = await cancelarReservaUsuario({ reservaId, usuarioId: sesion.id });
    const correoEnviado = await enviarAvisoCancelacion(reservaId, resultado);
    res.status(200).json({
      mensaje: 'Reserva cancelada',
      reembolso: resultado.reembolso,
      parcial: resultado.parcial,
      saldo_virtual: resultado.saldo_virtual,
      correo_enviado: correoEnviado,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Sesión no válida' });
    }
    if (error.codigo === 404 || error.codigo === 400) {
      return res.status(error.codigo).json({ mensaje: error.message });
    }
    responderErrorInterno(res, error);
  }
};

const boletoDisponible = async (req) => {
  const sesion = usuarioDesdeToken(req);
  if (!sesion?.id) {
    const error = new Error('Inicia sesión para ver tu boleto');
    error.codigo = 401;
    throw error;
  }
  const reservaId = Number(req.params.id);
  if (!reservaId) {
    const error = new Error('No se encontró la reserva');
    error.codigo = 400;
    throw error;
  }
  const boleto = await obtenerComprobantePorUsuario(reservaId, sesion.id);
  if (!boleto) {
    const error = new Error('Reserva no encontrada');
    error.codigo = 404;
    throw error;
  }
  const vueloCancelado = String(boleto.estado_vuelo || '').toLowerCase() === 'cancelado';
  if (boleto.estado_pago !== 'aprobado' || vueloCancelado) {
    const error = new Error('Este boleto ya no está disponible');
    error.codigo = 400;
    throw error;
  }
  return boleto;
};

const responderErrorBoleto = (res, error) => {
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.codigo === 401) {
    return res.status(401).json({ mensaje: error.codigo === 401 ? error.message : 'Sesión no válida' });
  }
  if (error.codigo === 404 || error.codigo === 400) {
    return res.status(error.codigo).json({ mensaje: error.message });
  }
  return responderErrorInterno(res, error);
};

export const obtenerComprobante = async (req, res) => {
  try {
    const boleto = await boletoDisponible(req);
    res.status(200).json({
      id: boleto.id,
      codigo_pnr: boleto.codigo_pnr,
      nombre: boleto.nombre,
      apellido: boleto.apellido,
      documento_identidad: boleto.documento_identidad,
      email: boleto.email,
      origen: boleto.origen,
      destino: boleto.destino,
      fecha_salida: boleto.fecha_salida,
      numero_asiento: boleto.numero_asiento,
      monto_total: boleto.monto_total,
      metodo_pago: boleto.metodo_pago,
      fecha_creacion: boleto.fecha_creacion,
      viajeros: boleto.viajeros,
    });
  } catch (error) {
    responderErrorBoleto(res, error);
  }
};

export const descargarBoleto = async (req, res) => {
  try {
    const boleto = await boletoDisponible(req);
    const pdf = await crearPdfBoleto(boleto);
    const codigo = String(boleto.codigo_pnr || 'reserva').replace(/[^A-Za-z0-9]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="confirmacion-${codigo}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    responderErrorBoleto(res, error);
  }
};

export const pagarReserva = async (req, res) => {
  try {
    const pago = await actualizarPago(Number(req.params.id), req.usuario.id);
    res.status(200).json({
      mensaje: 'Pago actualizado correctamente',
      saldo_virtual: pago.saldo_virtual,
    });
  } catch (error) {
    if (error.codigo === 404 || error.codigo === 400) {
      return res.status(error.codigo).json({ mensaje: error.message });
    }
    responderErrorInterno(res, error);
  }
};
