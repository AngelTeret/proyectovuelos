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
import { registrarBitacora } from '../models/bitacora.model.js';
import { ipDe } from '../middlewares/cupo.js';
import { leerSesion, respuestaDeSesion } from '../middlewares/sesion.js';
import { responderErrorInterno } from '../utils/errorInterno.js';
import { crearPdfFactura } from '../utils/boletoPdf.js';
import { enviarBoleto } from '../services/emailService.js';
import { generarTemplateBoleto, generarTemplateCancelacion } from '../services/ticketTemplate.js';

const enviarFactura = async (reservaId) => {
  try {
    const datos = await obtenerDatosCorreoReserva(reservaId);
    if (!datos?.email) {
      console.log(`La reserva ${reservaId} no tiene correo para la factura.`);
      return false;
    }
    const pdf = await crearPdfFactura(datos);
    const numero = String(datos.numero_factura || 'factura').replace(/[^A-Za-z0-9-]/g, '');
    await enviarBoleto(
      datos.email,
      `Factura ${datos.numero_factura} - Quetzal Airlines`,
      generarTemplateBoleto(datos),
      [{
        filename: `factura-${numero}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      }],
    );
    return true;
  } catch (error) {
    console.log(`La reserva ${reservaId} quedó confirmada, pero la factura no se envió: ${error.message}`);
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

const usuarioDesdeToken = (req) => leerSesion(req);

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

    if (metodo_pago !== 'saldo') {
      return res.status(400).json({ mensaje: 'El pago solo se puede hacer con la billetera virtual.' });
    }
    const metodo = 'saldo';
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

    const correoEnviado = await enviarFactura(reserva.id);
    await registrarBitacora({
      usuarioId: usuarioCobro,
      accion: 'pago',
      detalle: `Reserva ${reserva.id} pagada con billetera`,
      ip: ipDe(req),
    });

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
    const sesion = await usuarioDesdeToken(req);
    if (!sesion?.id) {
      return res.status(401).json({ mensaje: 'Inicia sesión para ver tu historial' });
    }

    const historial = await obtenerHistorialPorUsuario(sesion.id);
    res.status(200).json(historial);
  } catch (error) {
    if (respuestaDeSesion(res, error)) {
      return;
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
    const sesion = await usuarioDesdeToken(req);
    if (!sesion?.id) {
      return res.status(401).json({ mensaje: 'Inicia sesión para cancelar la reserva' });
    }

    const reservaId = Number(req.params.id);
    if (!reservaId) {
      return res.status(400).json({ mensaje: 'No se pudo cancelar la reserva' });
    }

    const resultado = await cancelarReservaUsuario({ reservaId, usuarioId: sesion.id });
    await registrarBitacora({
      usuarioId: sesion.id,
      accion: 'cancelacion',
      detalle: `Reserva ${reservaId} reembolsada por ${resultado.reembolso}`,
      ip: ipDe(req),
    });
    const correoEnviado = await enviarAvisoCancelacion(reservaId, resultado);
    res.status(200).json({
      mensaje: 'Reserva cancelada',
      reembolso: resultado.reembolso,
      parcial: resultado.parcial,
      saldo_virtual: resultado.saldo_virtual,
      correo_enviado: correoEnviado,
    });
  } catch (error) {
    if (respuestaDeSesion(res, error)) {
      return;
    }
    if (error.codigo === 404 || error.codigo === 400) {
      return res.status(error.codigo).json({ mensaje: error.message });
    }
    responderErrorInterno(res, error);
  }
};

const facturaDisponible = async (req) => {
  const sesion = await usuarioDesdeToken(req);
  if (!sesion?.id) {
    const error = new Error('Inicia sesión para ver tu factura');
    error.codigo = 401;
    throw error;
  }
  const reservaId = Number(req.params.id);
  if (!reservaId) {
    const error = new Error('No se encontró la reserva');
    error.codigo = 400;
    throw error;
  }
  const factura = await obtenerComprobantePorUsuario(reservaId, sesion.id);
  if (!factura) {
    const error = new Error('Reserva no encontrada');
    error.codigo = 404;
    throw error;
  }
  if (!factura.numero_factura) {
    const error = new Error('Esta reserva no tiene factura');
    error.codigo = 400;
    throw error;
  }
  return factura;
};

const responderErrorBoleto = (res, error) => {
  if (respuestaDeSesion(res, error)) {
    return;
  }
  if (error.codigo === 404 || error.codigo === 400) {
    return res.status(error.codigo).json({ mensaje: error.message });
  }
  return responderErrorInterno(res, error);
};

const datosFactura = (factura) => ({
  id: factura.id,
  numero_factura: factura.numero_factura,
  estado_factura: factura.estado_factura,
  codigo_pnr: factura.codigo_pnr,
  nombre: factura.nombre,
  apellido: factura.apellido,
  documento_identidad: factura.documento_identidad,
  email: factura.email,
  origen: factura.origen,
  destino: factura.destino,
  fecha_salida: factura.fecha_salida,
  numero_asiento: factura.numero_asiento,
  monto_total: factura.monto_total,
  metodo_pago: factura.metodo_pago,
  fecha_creacion: factura.fecha_creacion,
  viajeros: factura.viajeros,
});

export const obtenerFactura = async (req, res) => {
  try {
    const factura = await facturaDisponible(req);
    res.status(200).json(datosFactura(factura));
  } catch (error) {
    responderErrorBoleto(res, error);
  }
};

export const descargarFactura = async (req, res) => {
  try {
    const factura = await facturaDisponible(req);
    const pdf = await crearPdfFactura(factura);
    const numero = String(factura.numero_factura || 'factura').replace(/[^A-Za-z0-9-]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${numero}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    responderErrorBoleto(res, error);
  }
};

export const obtenerComprobante = obtenerFactura;
export const descargarBoleto = descargarFactura;

export const pagarReserva = async (req, res) => {
  try {
    const reservaId = Number(req.params.id);
    const pago = await actualizarPago(reservaId, req.usuario.id);
    const correoEnviado = await enviarFactura(reservaId);
    res.status(200).json({
      mensaje: 'Pago actualizado correctamente',
      saldo_virtual: pago.saldo_virtual,
      correo_enviado: correoEnviado,
    });
  } catch (error) {
    if (error.codigo === 404 || error.codigo === 400) {
      return res.status(error.codigo).json({ mensaje: error.message });
    }
    responderErrorInterno(res, error);
  }
};
