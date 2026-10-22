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

const etiqueta = (doc, texto, x, y) => {
  doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(texto, x, y, { width: ancho, lineBreak: false });
};

const valor = (doc, texto, x, y) => {
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(texto, x, y, { width: ancho, lineBreak: false });
};

const dibujarBoleto = (doc, boleto) => {
  const altoLogo = 58;
  const anchoLogo = altoLogo * (3440 / 1520);
  SVGtoPDF(doc, logoFrase, izquierda, 32, {
    width: anchoLogo,
    height: altoLogo,
    preserveAspectRatio: 'xMinYMin meet',
  });
  doc.font('Helvetica').fontSize(11).fillColor('#475569').text('Boleto de vuelo', izquierda, 54, { width: 499, align: 'right', lineBreak: false });
  doc.moveTo(izquierda, 102).lineTo(547, 102).strokeColor('#e2e8f0').stroke();

  etiqueta(doc, 'BOLETO', izquierda, 114);
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(boleto.codigo_boleto || '', izquierda, 128, { width: ancho, lineBreak: false });
  etiqueta(doc, 'CODIGO DE RESERVA', derecha, 114);
  valor(doc, boleto.codigo_pnr || '', derecha, 132);

  const nombre = `${boleto.nombre || ''} ${boleto.apellido || ''}`.trim();
  etiqueta(doc, 'PASAJERO', izquierda, 168);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(nombre, izquierda, 182, { width: 499, lineBreak: false });
  if (boleto.documento_identidad) {
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(`Documento ${boleto.documento_identidad}`, izquierda, 202, { width: 499, lineBreak: false });
  }

  etiqueta(doc, 'RUTA', izquierda, 228);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(
    `${boleto.origen || ''} - ${boleto.destino || ''}`,
    izquierda,
    242,
    { width: 499, lineBreak: false },
  );

  etiqueta(doc, 'SALIDA', izquierda, 270);
  valor(doc, textoFecha(boleto.fecha_salida), izquierda, 284);
  etiqueta(doc, 'ASIENTO', derecha, 270);
  valor(doc, boleto.numero_asiento || 'Regazo', derecha, 284);

  let cursor = 320;
  const infantes = Array.isArray(boleto.infantes_en_regazo) ? boleto.infantes_en_regazo.filter(Boolean) : [];
  if (infantes.length > 0) {
    etiqueta(doc, 'INFANTE EN REGAZO', izquierda, cursor);
    valor(doc, infantes.join(', '), izquierda, cursor + 14);
    cursor += 48;
  } else if (boleto.tipo === 'infante') {
    doc.font('Helvetica').fontSize(11).fillColor('#334155').text('Viaja en regazo.', izquierda, cursor, { width: 499, lineBreak: false });
    cursor += 28;
  }

  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(
    'Presenta este boleto en tu teléfono. También puedes imprimirlo.',
    izquierda,
    cursor + 12,
    { width: 499, lineBreak: false },
  );
};

export const crearPdfBoletos = (boletos) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const partes = [];
  doc.on('data', (parte) => partes.push(parte));
  doc.on('end', () => resolve(Buffer.concat(partes)));
  doc.on('error', reject);

  boletos.forEach((boleto, indice) => {
    if (indice > 0) {
      doc.addPage();
    }
    dibujarBoleto(doc, boleto);
  });

  doc.end();
});
