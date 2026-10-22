import {
  ajustarCheckin,
  emitirCheckin,
  obtenerAsientosCheckin,
  obtenerBoletosEmitidos,
  obtenerElegibilidad,
} from '../models/checkin.model.js';
import { enviarBoleto } from '../services/emailService.js';
import { generarTemplateCheckin } from '../services/ticketTemplate.js';
import { crearPdfBoletos } from '../utils/boletoVueloPdf.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const responder = (res, error) => {
  if (error.codigo === 404 || error.codigo === 400) {
    return res.status(error.codigo).json({ mensaje: error.message });
  }
  return responderErrorInterno(res, error);
};

const boletosNuevos = (resultado) => {
  const ids = new Set((resultado.nuevos || []).map((boleto) => boleto.id));
  return resultado.viajeros
    .filter((viajero) => ids.has(viajero.id))
    .map((viajero) => ({
      ...viajero,
      codigo_pnr: resultado.codigo_pnr,
      origen: resultado.origen,
      destino: resultado.destino,
      fecha_salida: resultado.fecha_salida,
      duracion_minutos: resultado.duracion_minutos,
      equipaje_extra_kg: resultado.equipaje_extra_kg,
    }));
};

const enviarBoletos = async (resultado) => {
  const nuevos = boletosNuevos(resultado);
  if (!resultado.email || nuevos.length === 0) {
    return false;
  }
  try {
    const pdf = await crearPdfBoletos(nuevos);
    const codigo = String(resultado.codigo_pnr || 'reserva').replace(/[^A-Za-z0-9]/g, '');
    await enviarBoleto(
      resultado.email,
      `Boletos ${resultado.codigo_pnr} - Quetzal Airlines`,
      generarTemplateCheckin({ ...resultado, viajeros: nuevos }),
      [{
        filename: `boletos-${codigo}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      }],
    );
    return true;
  } catch (error) {
    console.log(`El check-in de ${resultado.codigo_pnr} quedó hecho, pero el correo no se envió: ${error.message}`);
    return false;
  }
};

const sinInternos = (resultado) => {
  const { nuevos, email, ...datos } = resultado;
  return datos;
};

export const consultarCheckin = async (req, res) => {
  try {
    const datos = await obtenerElegibilidad(req.params.pnr, req.usuario.id);
    const { email, ...publico } = datos;
    res.status(200).json(publico);
  } catch (error) {
    responder(res, error);
  }
};

export const crearCheckin = async (req, res) => {
  try {
    const resultado = await emitirCheckin({
      pnr: req.body?.codigo_pnr || req.body?.pnr,
      usuarioId: req.usuario.id,
      viajeros: req.body?.viajeros,
      maletas: req.body?.maletas,
      asientos: req.body?.asientos,
    });
    const enviaraCorreo = resultado.creados > 0 && Boolean(resultado.email);
    res.status(200).json({
      ...sinInternos(resultado),
      correo_enviado: enviaraCorreo,
    });
    if (enviaraCorreo) {
      setImmediate(() => {
        enviarBoletos(resultado);
      });
    }
  } catch (error) {
    responder(res, error);
  }
};

export const guardarAjustes = async (req, res) => {
  try {
    const resultado = await ajustarCheckin({
      pnr: req.body?.codigo_pnr || req.body?.pnr,
      usuarioId: req.usuario.id,
      maletas: req.body?.maletas,
      asientos: req.body?.asientos,
    });
    const { email, ...publico } = resultado;
    res.status(200).json(publico);
  } catch (error) {
    responder(res, error);
  }
};

export const consultarAsientos = async (req, res) => {
  try {
    const datos = await obtenerAsientosCheckin(req.params.pnr, req.usuario.id);
    res.status(200).json(datos);
  } catch (error) {
    responder(res, error);
  }
};

export const descargarBoletos = async (req, res) => {
  try {
    const datos = await obtenerBoletosEmitidos(req.params.pnr, req.usuario.id);
    const pdf = await crearPdfBoletos(datos.viajeros.map((viajero) => ({
      ...viajero,
      codigo_pnr: datos.codigo_pnr,
      origen: datos.origen,
      destino: datos.destino,
      fecha_salida: datos.fecha_salida,
      duracion_minutos: datos.duracion_minutos,
      equipaje_extra_kg: datos.equipaje_extra_kg,
    })));
    const codigo = String(datos.codigo_pnr || 'reserva').replace(/[^A-Za-z0-9]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="boletos-${codigo}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    responder(res, error);
  }
};
