import PDFDocument from 'pdfkit';
import { partesGuatemala } from './fecha.js';
import { textoEquipajeBoleto } from './franquiciaEquipaje.js';

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const textoFecha = (valor) => {
  const partes = partesGuatemala(valor);
  if (!partes) {
    return '';
  }
  const dia = `${partes.dia} ${meses[partes.mes - 1]} ${partes.anio}`;
  return partes.hora ? `${dia}, ${partes.hora}:${partes.minuto}` : dia;
};

const dibujarBoleto = (doc, boleto, grupo) => {
  const x = 48;
  const y = 56;
  const ancho = 499;
  const alto = 420;
  const nombre = `${boleto.nombre || ''} ${boleto.apellido || ''}`.trim();
  const asiento = boleto.numero_asiento || 'Regazo';
  const infantes = Array.isArray(boleto.infantes_en_regazo) ? boleto.infantes_en_regazo.filter(Boolean) : [];

  doc.save();
  doc.roundedRect(x, y, ancho, alto, 18).clip();
  doc.rect(x, y, ancho, 112).fill('#0B4C37');
  doc.rect(x, y + 112, ancho, 8).fill('#8B2026');
  doc.rect(x, y + 120, ancho, alto - 120).fill('#f3faf6');
  doc.restore();
  doc.roundedRect(x, y, ancho, alto, 18).lineWidth(2).strokeColor('#0B4C37').stroke();

  doc.fillColor('#d7efe4').font('Helvetica').fontSize(11).text('BOLETO DE VUELO', x + 24, y + 22, { width: 280, lineBreak: false });
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13).text('Quetzal Airlines', x + 24, y + 40, { width: 280, lineBreak: false });

  doc.fillColor('#d7efe4').font('Helvetica').fontSize(10).text('ASIENTO', x + 300, y + 18, { width: 175, align: 'right', lineBreak: false });
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(asiento.length > 3 ? 22 : 36).text(asiento, x + 250, y + 36, { width: 225, align: 'right', lineBreak: false });

  doc.fillColor('#166534').font('Helvetica').fontSize(10).text('PASAJERO', x + 24, y + 142, { width: 450, lineBreak: false });
  doc.fillColor('#052e16').font('Helvetica-Bold').fontSize(20).text(nombre, x + 24, y + 158, { width: 450, lineBreak: false });

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#052e16');
  const origen = boleto.origen || '';
  const destino = boleto.destino || '';
  const anchoOrigen = doc.widthOfString(origen);
  doc.text(origen, x + 24, y + 196, { lineBreak: false });
  const flechaX = x + 24 + anchoOrigen + 10;
  const flechaY = y + 204;
  doc.save();
  doc.strokeColor('#8B2026').lineWidth(1.8).lineCap('round').lineJoin('round');
  doc.moveTo(flechaX, flechaY).lineTo(flechaX + 22, flechaY).stroke();
  doc.moveTo(flechaX + 15, flechaY - 5).lineTo(flechaX + 22, flechaY).lineTo(flechaX + 15, flechaY + 5).stroke();
  doc.restore();
  doc.fillColor('#052e16').text(destino, flechaX + 30, y + 196, { lineBreak: false });

  doc.fillColor('#166534').font('Helvetica').fontSize(10).text('SALIDA', x + 24, y + 232, { width: 220, lineBreak: false });
  doc.fillColor('#052e16').font('Helvetica-Bold').fontSize(12).text(textoFecha(boleto.fecha_salida), x + 24, y + 248, { width: 250, lineBreak: false });
  doc.fillColor('#166534').font('Helvetica').fontSize(10).text('RESERVA', x + 290, y + 232, { width: 185, align: 'right', lineBreak: false });
  doc.fillColor('#052e16').font('Helvetica-Bold').fontSize(12).text(boleto.codigo_pnr || '', x + 290, y + 248, { width: 185, align: 'right', lineBreak: false });

  const documento = boleto.documento_identidad ? `Documento ${boleto.documento_identidad}` : '';
  const regazo = infantes.length > 0 ? `Infante en regazo: ${infantes.join(', ')}` : '';
  const lineaUno = [documento, regazo].filter(Boolean).join('  ·  ');
  doc.fillColor('#166534').font('Helvetica').fontSize(10).text(lineaUno, x + 24, y + 274, { width: 450, lineBreak: false });
  doc.text(textoEquipajeBoleto(boleto, grupo), x + 24, y + 290, { width: 450, lineBreak: false });

  doc.save();
  doc.dash(4, { space: 4 });
  doc.moveTo(x + 24, y + 318).lineTo(x + ancho - 24, y + 318).strokeColor('#86efac').lineWidth(1).stroke();
  doc.restore();

  doc.fillColor('#166534').font('Helvetica').fontSize(10).text('CÓDIGO DE BOLETO', x + 24, y + 334, { width: 450, lineBreak: false });
  doc.fillColor('#8B2026').font('Helvetica-Bold').fontSize(22).text(boleto.codigo_boleto || '', x + 24, y + 350, {
    width: 450,
    characterSpacing: 2,
    lineBreak: false,
  });

  doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(
    'Muestra este boleto en tu teléfono o imprímelo. La factura de la compra es otro documento.',
    x,
    y + alto + 18,
    { width: ancho, align: 'center', lineBreak: false },
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
    dibujarBoleto(doc, boleto, boletos);
  });

  doc.end();
});
