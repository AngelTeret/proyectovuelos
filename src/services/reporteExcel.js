import ExcelJS from 'exceljs';

const VERDE = 'FF0B4C37';
const VERDE_SUAVE = 'FFE7F2EC';
const VERDE_FILA = 'FFF4F8F6';
const GRANATE = 'FF8B2026';
const BLANCO = 'FFFFFFFF';
const TEXTO = 'FF1F2937';
const GRIS = 'FF64748B';
const LINEA = 'FFD7E3DC';

const bordeFino = {
  top: { style: 'thin', color: { argb: LINEA } },
  left: { style: 'thin', color: { argb: LINEA } },
  bottom: { style: 'thin', color: { argb: LINEA } },
  right: { style: 'thin', color: { argb: LINEA } },
};

const fechaCorta = (iso) => {
  const [anio, mes, dia] = String(iso || '').split('-');
  if (!anio || !mes || !dia) {
    return '';
  }
  return `${dia}/${mes}/${anio}`;
};

const generadoEn = () => new Intl.DateTimeFormat('es-GT', {
  timeZone: 'America/Guatemala',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).format(new Date());

const numeroDe = (valor) => {
  if (valor == null || valor === '') {
    return null;
  }
  const cantidad = Number(valor);
  return Number.isFinite(cantidad) ? cantidad : null;
};

const textoSeguro = (valor) => {
  if (valor == null) {
    return '';
  }
  const texto = String(valor);
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
};

const formatoDe = (tipo) => {
  if (tipo === 'dinero') {
    return '"Q "#,##0.00';
  }
  if (tipo === 'porcentaje') {
    return '0.0" %"';
  }
  if (tipo === 'numero') {
    return '#,##0.##';
  }
  return null;
};

const pintar = (celda, color, fuente, alineacion = {}) => {
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  celda.font = { name: 'Calibri', ...fuente };
  celda.alignment = { vertical: 'middle', ...alineacion };
};

const anchoDe = (columna, filas) => {
  const muestras = [columna.titulo, ...filas.slice(0, 40).map((fila) => fila[columna.clave])];
  const mayor = muestras.reduce((maximo, valor) => Math.max(maximo, String(valor ?? '').length), 12);
  return Math.min(42, Math.max(14, mayor + 3));
};

const prepararHoja = (libro, nombre) => {
  const hoja = libro.addWorksheet(nombre, {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 1,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    },
    headerFooter: {
      oddFooter: '&LQuetzal Airlines&CUso interno&RPágina &P de &N',
    },
  });
  hoja.properties.tabColor = { argb: VERDE };
  hoja.pageSetup.fitToPage = true;
  return hoja;
};

const banner = (hoja, columnas, lineas) => {
  lineas.forEach((linea, indice) => {
    const fila = indice + 1;
    hoja.mergeCells(fila, 1, fila, columnas);
    const celda = hoja.getCell(fila, 1);
    celda.value = linea.texto;
    pintar(celda, linea.color, linea.fuente, { indent: 1 });
    hoja.getRow(fila).height = linea.alto;
  });
};

const escribirResumen = (libro, reporte) => {
  const hoja = prepararHoja(libro, 'Resumen');
  const ancho = 4;
  hoja.columns = [
    { width: 34 },
    { width: 28 },
    { width: 28 },
    { width: 28 },
  ];
  banner(hoja, ancho, [
    { texto: 'QUETZAL AIRLINES', color: VERDE, alto: 30, fuente: { bold: true, size: 18, color: { argb: BLANCO } } },
    { texto: reporte.titulo || 'Reporte', color: VERDE, alto: 22, fuente: { bold: true, size: 13, color: { argb: 'FFD7EDE4' } } },
    { texto: '', color: GRANATE, alto: 6, fuente: { size: 8, color: { argb: GRANATE } } },
  ]);

  hoja.mergeCells(4, 1, 4, ancho);
  const meta = hoja.getCell(4, 1);
  meta.value = `Periodo: ${fechaCorta(reporte.desde)} al ${fechaCorta(reporte.hasta)}     Generado: ${generadoEn()}     Registros: ${reporte.total || 0}`;
  meta.font = { name: 'Calibri', size: 10, color: { argb: GRIS } };
  meta.alignment = { vertical: 'middle', indent: 1 };
  hoja.getRow(4).height = 20;

  hoja.mergeCells(5, 1, 5, ancho);
  const descripcion = hoja.getCell(5, 1);
  descripcion.value = reporte.descripcion || '';
  descripcion.font = { name: 'Calibri', size: 11, italic: true, color: { argb: TEXTO } };
  descripcion.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
  hoja.getRow(5).height = 34;

  hoja.getCell(7, 1).value = 'RESUMEN';
  hoja.getCell(7, 1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: VERDE } };

  (reporte.resumen || []).slice(0, ancho).forEach((tarjeta, indice) => {
    const columna = indice + 1;
    const etiqueta = hoja.getCell(8, columna);
    etiqueta.value = tarjeta.etiqueta;
    pintar(etiqueta, VERDE, { bold: true, size: 9, color: { argb: BLANCO } }, { horizontal: 'center', wrapText: true });
    etiqueta.border = bordeFino;
    const valor = hoja.getCell(9, columna);
    valor.value = tarjeta.valor;
    pintar(valor, VERDE_SUAVE, { bold: true, size: 16, color: { argb: VERDE } }, { horizontal: 'center' });
    valor.border = bordeFino;
  });
  hoja.getRow(8).height = 22;
  hoja.getRow(9).height = 32;

  let fila = 11;
  if (reporte.nota) {
    hoja.mergeCells(fila, 1, fila, ancho);
    hoja.getCell(fila, 1).value = reporte.nota;
    hoja.getCell(fila, 1).font = { name: 'Calibri', size: 10, color: { argb: GRIS } };
    fila += 2;
  }

  const series = reporte.grafica?.series || [];
  if (series.length === 0) {
    return;
  }

  hoja.mergeCells(fila, 1, fila, 2);
  hoja.getCell(fila, 1).value = String(reporte.grafica.titulo || 'Distribución').toUpperCase();
  hoja.getCell(fila, 1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: VERDE } };
  fila += 1;

  ['Concepto', 'Valor'].forEach((titulo, indice) => {
    const celda = hoja.getCell(fila, indice + 1);
    celda.value = titulo;
    pintar(celda, VERDE, { bold: true, size: 10, color: { argb: BLANCO } }, { horizontal: 'center' });
    celda.border = bordeFino;
  });
  hoja.getRow(fila).height = 20;
  fila += 1;
  const primera = fila;
  series.forEach((serie, indice) => {
    const concepto = hoja.getCell(fila, 1);
    concepto.value = textoSeguro(serie.etiqueta);
    concepto.font = { name: 'Calibri', size: 11, color: { argb: TEXTO } };
    concepto.border = bordeFino;
    concepto.alignment = { vertical: 'middle', indent: 1 };
    const valor = hoja.getCell(fila, 2);
    valor.value = numeroDe(serie.valor);
    valor.numFmt = formatoDe(reporte.grafica.unidad) || '#,##0.##';
    valor.font = { name: 'Calibri', size: 11, color: { argb: TEXTO } };
    valor.border = bordeFino;
    valor.alignment = { vertical: 'middle', horizontal: 'right' };
    if (indice % 2 === 1) {
      concepto.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_FILA } };
      valor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_FILA } };
    }
    hoja.getRow(fila).height = 22;
    fila += 1;
  });
  hoja.addConditionalFormatting({
    ref: `B${primera}:B${fila - 1}`,
    rules: [{
      type: 'dataBar',
      cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
      color: { argb: VERDE },
      gradient: false,
    }],
  });
  if (reporte.grafica.nota) {
    hoja.getCell(fila, 1).value = reporte.grafica.nota;
    hoja.getCell(fila, 1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: GRIS } };
  }
};

const escribirDetalle = (libro, reporte) => {
  const columnas = reporte.columnas || [];
  const filas = reporte.filas || [];
  const hoja = prepararHoja(libro, 'Detalle');
  const totalColumnas = Math.max(columnas.length, 1);
  hoja.columns = columnas.map((columna) => ({ width: anchoDe(columna, filas) }));
  banner(hoja, totalColumnas, [
    {
      texto: `QUETZAL AIRLINES     ${reporte.titulo || 'Reporte'}     ${fechaCorta(reporte.desde)} al ${fechaCorta(reporte.hasta)}`,
      color: VERDE,
      alto: 26,
      fuente: { bold: true, size: 13, color: { argb: BLANCO } },
    },
  ]);

  const filaEncabezado = 2;
  columnas.forEach((columna, indice) => {
    const celda = hoja.getCell(filaEncabezado, indice + 1);
    celda.value = columna.titulo;
    pintar(celda, VERDE, { bold: true, size: 10, color: { argb: BLANCO } }, { horizontal: 'center', wrapText: true });
    celda.border = bordeFino;
  });
  hoja.getRow(filaEncabezado).height = 24;

  const primera = 3;
  filas.forEach((registro, indiceFila) => {
    const fila = primera + indiceFila;
    columnas.forEach((columna, indice) => {
      const celda = hoja.getCell(fila, indice + 1);
      const crudo = registro[columna.clave];
      if (columna.tipo === 'dinero' || columna.tipo === 'numero' || columna.tipo === 'porcentaje') {
        celda.value = numeroDe(crudo);
        celda.numFmt = formatoDe(columna.tipo);
        celda.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        celda.value = textoSeguro(crudo);
        celda.alignment = { vertical: 'middle', indent: 1 };
      }
      celda.font = { name: 'Calibri', size: 10, color: { argb: TEXTO } };
      celda.border = bordeFino;
      if (indiceFila % 2 === 1) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_FILA } };
      }
    });
    hoja.getRow(fila).height = 20;
  });

  const ultima = filas.length ? primera + filas.length - 1 : filaEncabezado;
  if (filas.length === 0) {
    hoja.mergeCells(primera, 1, primera, totalColumnas);
    const vacio = hoja.getCell(primera, 1);
    vacio.value = 'No hay registros en estas fechas.';
    vacio.font = { name: 'Calibri', italic: true, size: 10, color: { argb: GRIS } };
  } else if (columnas.some((columna) => columna.tipo === 'dinero' || columna.tipo === 'numero')) {
    const filaTotal = ultima + 1;
    columnas.forEach((columna, indice) => {
      const celda = hoja.getCell(filaTotal, indice + 1);
      if (indice === 0) {
        celda.value = 'Total';
      } else if (columna.tipo === 'dinero' || columna.tipo === 'numero') {
        const letra = hoja.getColumn(indice + 1).letter;
        celda.value = { formula: `SUM(${letra}${primera}:${letra}${ultima})` };
        celda.numFmt = formatoDe(columna.tipo);
      }
      pintar(celda, VERDE_SUAVE, { bold: true, size: 10, color: { argb: VERDE } }, {
        horizontal: indice === 0 ? 'left' : 'right',
        indent: indice === 0 ? 1 : 0,
      });
      celda.border = bordeFino;
    });
    hoja.getRow(filaTotal).height = 22;
  }

  hoja.autoFilter = {
    from: { row: filaEncabezado, column: 1 },
    to: { row: ultima, column: totalColumnas },
  };
  hoja.views = [{ state: 'frozen', ySplit: filaEncabezado, showGridLines: false, activeCell: 'A3' }];
  hoja.pageSetup.printTitlesRow = '1:2';
};

export const libroDeReporte = async (reporte) => {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Quetzal Airlines';
  libro.company = 'Quetzal Airlines';
  libro.title = reporte.titulo || 'Reporte';
  libro.subject = 'Uso interno';
  libro.created = new Date();
  escribirResumen(libro, reporte);
  escribirDetalle(libro, reporte);
  return Buffer.from(await libro.xlsx.writeBuffer());
};
