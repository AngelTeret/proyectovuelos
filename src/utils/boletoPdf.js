import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { partesGuatemala } from './fecha.js';

const logoFrase = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../public/imagenes/logotipo_frase.svg'),
  'utf8',
).replace(/<metadata[\s\S]*?<\/metadata>/, '');

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const izquierda = 48;
const derecha = 300;
const ancho = 220;

const textoFecha = (valor) => {
  const partes = partesGuatemala(valor);
  if (!partes) {
    return '';
  }
  const dia = `${partes.dia} ${meses[partes.mes - 1]} ${partes.anio}`;
  return partes.hora ? `${dia}, ${partes.hora}:${partes.minuto}` : dia;
};

const quetzales = (monto) => `Q ${Number(monto || 0).toFixed(2)}`;

const metodoTexto = (metodo) => (metodo === 'saldo' ? 'Billetera' : 'Tarjeta');

const titulosTipo = { adulto: 'Adulto', nino: 'Niño', infante: 'Infante' };

const textoDia = (valor) => {
  const partes = partesGuatemala(valor);
  return partes ? `${partes.dia} ${meses[partes.mes - 1]} ${partes.anio}` : '';
};

const viajerosDe = (boleto) => (Array.isArray(boleto.viajeros) && boleto.viajeros.length
  ? boleto.viajeros
  : [{
    nombre: boleto.nombre,
    apellido: boleto.apellido,
    documento_identidad: boleto.documento_identidad,
    nacionalidad: boleto.nacionalidad,
    fecha_nacimiento: boleto.fecha_nacimiento,
    tipo: 'adulto',
    numero_asiento: boleto.numero_asiento,
  }]);

const etiqueta = (doc, texto, x, y) => {
  doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(texto, x, y, { width: ancho, lineBreak: false });
};

const valor = (doc, texto, x, y) => {
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(texto, x, y, { width: ancho, lineBreak: false });
};

export const crearPdfBoleto = (boleto) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const partes = [];
  doc.on('data', (parte) => partes.push(parte));
  doc.on('end', () => resolve(Buffer.concat(partes)));
  doc.on('error', reject);

  const altoLogo = 58;
  const anchoLogo = altoLogo * (3440 / 1520);
  SVGtoPDF(doc, logoFrase, izquierda, 32, {
    width: anchoLogo,
    height: altoLogo,
    preserveAspectRatio: 'xMinYMin meet',
  });
  doc.font('Helvetica').fontSize(11).fillColor('#475569').text('Comprobante de reserva', izquierda, 54, { width: 499, align: 'right', lineBreak: false });
  doc.moveTo(izquierda, 102).lineTo(547, 102).strokeColor('#e2e8f0').stroke();

  etiqueta(doc, 'CODIGO DE RESERVA', izquierda, 114);
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(boleto.codigo_pnr || '', izquierda, 128, { width: 499, lineBreak: false });

  const viajeros = viajerosDe(boleto);
  const asientos = viajeros.map((viajero) => viajero.numero_asiento).filter(Boolean);

  etiqueta(doc, 'RUTA', izquierda, 160);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(
    `${boleto.origen || ''} - ${boleto.destino || ''}`,
    izquierda,
    174,
    { width: 499, lineBreak: false },
  );

  etiqueta(doc, 'SALIDA', izquierda, 202);
  valor(doc, textoFecha(boleto.fecha_salida), izquierda, 216);
  etiqueta(doc, asientos.length > 1 ? 'ASIENTOS' : 'ASIENTO', derecha, 202);
  valor(doc, asientos.join(', ') || 'Regazo', derecha, 216);

  doc.moveTo(izquierda, 242).lineTo(547, 242).strokeColor('#e2e8f0').stroke();

  etiqueta(doc, 'TOTAL', izquierda, 254);
  valor(doc, quetzales(boleto.monto_total), izquierda, 268);
  etiqueta(doc, 'METODO DE PAGO', derecha, 254);
  valor(doc, metodoTexto(boleto.metodo_pago), derecha, 268);

  etiqueta(doc, 'FECHA DE COMPRA', izquierda, 294);
  valor(doc, textoFecha(boleto.fecha_creacion), izquierda, 308);

  let cursor = 340;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(
    viajeros.length > 1 ? 'PASAJEROS' : 'PASAJERO',
    izquierda,
    cursor,
    { width: 499, lineBreak: false },
  );
  cursor += 18;

  const altoTarjeta = 58;
  viajeros.forEach((viajero) => {
    const nombre = `${viajero.nombre || ''} ${viajero.apellido || ''}`.trim();
    const tipo = titulosTipo[viajero.tipo] || 'Pasajero';
    const asiento = viajero.numero_asiento || 'Regazo';
    const nacimiento = textoDia(viajero.fecha_nacimiento);
    doc.roundedRect(izquierda, cursor, 499, altoTarjeta, 6).strokeColor('#e2e8f0').stroke();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(nombre, izquierda + 12, cursor + 8, { width: 360, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(asiento, izquierda + 380, cursor + 8, { width: 107, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(tipo, izquierda + 12, cursor + 24, { width: 470, lineBreak: false });
    const detalles = [
      viajero.documento_identidad ? `Documento ${viajero.documento_identidad}` : '',
      viajero.nacionalidad || '',
      nacimiento ? `Nacimiento ${nacimiento}` : '',
    ].filter(Boolean).join('   |   ');
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(detalles, izquierda + 12, cursor + 38, { width: 470, lineBreak: false });
    cursor += altoTarjeta + 8;
  });

  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(
    'Este documento es un comprobante de reserva. No es un pase de abordar.',
    izquierda,
    cursor + 6,
    { width: 499, lineBreak: false },
  );

  doc.end();
});
