import PDFDocument from 'pdfkit';

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const izquierda = 48;
const derecha = 300;
const ancho = 220;

const textoFecha = (valor) => {
  const iso = valor instanceof Date ? valor.toISOString() : String(valor ?? '');
  const coincidencia = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!coincidencia) {
    return '';
  }
  const dia = Number(coincidencia[3]);
  const mes = meses[Number(coincidencia[2]) - 1];
  return `${dia} ${mes} ${coincidencia[1]}, ${coincidencia[4]}:${coincidencia[5]}`;
};

const quetzales = (monto) => `Q ${Number(monto || 0).toFixed(2)}`;

const metodoTexto = (metodo) => (metodo === 'saldo' ? 'Billetera' : 'Tarjeta');

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

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text('Sistema de Vuelos', izquierda, 48, { width: 499, lineBreak: false });
  doc.font('Helvetica').fontSize(12).fillColor('#475569').text('Comprobante de reserva', izquierda, 74, { width: 499, lineBreak: false });
  doc.moveTo(izquierda, 98).lineTo(547, 98).strokeColor('#e2e8f0').stroke();

  etiqueta(doc, 'CODIGO DE RESERVA', izquierda, 116);
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(boleto.codigo_pnr || '', izquierda, 132, { width: 499, lineBreak: false });

  etiqueta(doc, 'PASAJERO', izquierda, 176);
  valor(doc, `${boleto.nombre || ''} ${boleto.apellido || ''}`.trim(), izquierda, 192);
  etiqueta(doc, 'DOCUMENTO', derecha, 176);
  valor(doc, boleto.documento_identidad || '', derecha, 192);

  etiqueta(doc, 'RUTA', izquierda, 230);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(
    `${boleto.origen || ''} - ${boleto.destino || ''}`,
    izquierda,
    246,
    { width: 499, lineBreak: false },
  );

  etiqueta(doc, 'SALIDA', izquierda, 284);
  valor(doc, textoFecha(boleto.fecha_salida), izquierda, 300);
  etiqueta(doc, 'ASIENTO', derecha, 284);
  valor(doc, boleto.numero_asiento || '', derecha, 300);

  doc.moveTo(izquierda, 336).lineTo(547, 336).strokeColor('#e2e8f0').stroke();

  etiqueta(doc, 'TOTAL', izquierda, 352);
  valor(doc, quetzales(boleto.monto_total), izquierda, 368);
  etiqueta(doc, 'METODO DE PAGO', derecha, 352);
  valor(doc, metodoTexto(boleto.metodo_pago), derecha, 368);

  etiqueta(doc, 'FECHA DE COMPRA', izquierda, 406);
  valor(doc, textoFecha(boleto.fecha_creacion), izquierda, 422);

  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(
    'Este documento es un comprobante de reserva. No es un pase de abordar.',
    izquierda,
    470,
    { width: 499, lineBreak: false },
  );

  doc.end();
});
