import { partesGuatemala } from '../utils/fecha.js';

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const texto = (valor) => String(valor ?? '').trim();

const escapar = (valor) => texto(valor)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const mostrar = (valor, reserva = '—') => escapar(valor) || reserva;

const nombrePasajero = (datos) => {
  const completo = `${texto(datos.nombre)} ${texto(datos.apellido)}`.trim();
  return completo || texto(datos.nombrePasajero) || 'Pasajero';
};

const fechaYHora = (datos) => {
  if (texto(datos.fecha) || texto(datos.horaSalida) || texto(datos.hora)) {
    return {
      fecha: texto(datos.fecha),
      hora: texto(datos.horaSalida) || texto(datos.hora),
    };
  }

  const partes = partesGuatemala(datos.fecha_salida);
  if (!partes) {
    return { fecha: '', hora: '' };
  }

  return {
    fecha: `${partes.dia} ${meses[partes.mes - 1]} ${partes.anio}`,
    hora: partes.hora ? `${partes.hora}:${partes.minuto}` : '',
  };
};

const viajerosDe = (datos) => {
  if (!Array.isArray(datos.viajeros) || datos.viajeros.length === 0) {
    return [];
  }
  return datos.viajeros.map((viajero) => ({
    nombre: `${texto(viajero.nombre)} ${texto(viajero.apellido)}`.trim() || nombrePasajero(datos),
    asiento: texto(viajero.numero_asiento) || texto(viajero.asiento) || 'Regazo',
  }));
};

const bloqueRuta = (origen, destino) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td style="vertical-align:top;padding-right:14px;font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Origen</p>
        <p style="margin:4px 0 0 0;font-size:18px;font-weight:700;color:#05402d;">${mostrar(origen)}</p>
      </td>
      <td style="vertical-align:bottom;padding:0 14px 2px 14px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#8b1c1c;">→</td>
      <td style="vertical-align:top;padding-left:14px;font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Destino</p>
        <p style="margin:4px 0 0 0;font-size:18px;font-weight:700;color:#05402d;">${mostrar(destino)}</p>
      </td>
    </tr>
  </table>`;

const metodoTexto = (metodo) => {
  if (metodo === 'saldo') {
    return 'Billetera';
  }
  if (metodo === 'tarjeta') {
    return 'Tarjeta';
  }
  return texto(metodo);
};

const formatearInstante = (valor) => {
  const partes = partesGuatemala(valor);
  if (!partes) {
    return '';
  }
  const fecha = `${partes.dia} ${meses[partes.mes - 1]} ${partes.anio}`;
  return partes.hora ? `${fecha}, ${partes.hora}:${partes.minuto}` : fecha;
};

const bloquePasajeros = (viajeros) => {
  if (viajeros.length < 2) {
    return '';
  }

  const filas = viajeros.map((viajero) => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">${escapar(viajero.nombre)}</td>
      <td style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#05402d;text-align:right;">${escapar(viajero.asiento)}</td>
    </tr>`).join('');

  return `
    <tr>
      <td style="padding:8px 28px 8px 28px;">
        <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Pasajeros</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${filas}
        </table>
      </td>
    </tr>`;
};

const quetzales = (monto) => {
  const numero = Number(monto);
  return Number.isFinite(numero) ? `Q ${numero.toFixed(2)}` : '';
};

const datoTarjeta = (etiqueta, valor, fondo, colorEtiqueta, colorValor) => `
  <td style="background:${fondo};border-radius:12px;padding:12px 14px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${colorEtiqueta};">${etiqueta}</p>
    <p style="margin:6px 0 0 0;font-size:15px;font-weight:700;color:${colorValor};">${mostrar(valor)}</p>
  </td>`;

export const generarTemplateBoleto = (datosVuelo = {}) => {
  const { fecha, hora } = fechaYHora(datosVuelo);
  const pasajero = nombrePasajero(datosVuelo);
  const codigo = texto(datosVuelo.codigoReserva) || texto(datosVuelo.codigo_pnr) || texto(datosVuelo.pnr);
  const asiento = texto(datosVuelo.asiento) || texto(datosVuelo.numero_asiento);
  const categoria = texto(datosVuelo.categoria);
  const asientoVisible = [asiento, categoria].filter(Boolean).join(' · ');
  const correo = texto(datosVuelo.email) || texto(datosVuelo.correo);
  const telefono = texto(datosVuelo.telefono);
  const documento = texto(datosVuelo.documento) || texto(datosVuelo.documento_identidad);
  const viajeros = viajerosDe(datosVuelo);
  const total = quetzales(datosVuelo.monto_total ?? datosVuelo.monto);
  const metodo = metodoTexto(datosVuelo.metodo_pago || datosVuelo.metodo);
  const compra = texto(datosVuelo.fechaCompra) || formatearInstante(datosVuelo.fecha_creacion);
  const equipaje = Number(datosVuelo.equipaje_extra_kg);
  const numeroFactura = texto(datosVuelo.numero_factura) || texto(datosVuelo.numeroFactura);
  const cierre = equipaje > 0
    ? `Adjuntamos la factura ${numeroFactura} de tu reserva. Incluye ${equipaje} kg de equipaje extra. Quetzal Airlines.`
    : `Adjuntamos la factura ${numeroFactura} de tu reserva. Quetzal Airlines.`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${escapar(numeroFactura)} - Quetzal Airlines</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#05402d;padding:22px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d1fae5;">Quetzal Airlines</p>
              <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;">Factura ${escapar(numeroFactura)}</p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#8b1c1c;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#ecfdf5;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#05402d;">Reserva confirmada</p>
              <p style="margin:4px 0 0 0;font-size:13px;line-height:1.5;color:#3f6212;">Tu pago quedó registrado. La factura va adjunta a este correo.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Pasajero</p>
              <p style="margin:6px 0 0 0;font-size:22px;font-weight:700;color:#111827;">${escapar(pasajero)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 18px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Código de reserva</p>
              <p style="margin:6px 0 0 0;display:inline-block;background:#05402d;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.18em;padding:8px 14px;border-radius:8px;">${mostrar(codigo)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 18px 28px;">
              ${bloqueRuta(datosVuelo.origen, datosVuelo.destino)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 8px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;">
                <tr>
                  ${datoTarjeta('Fecha', fecha, '#f3f4f6', '#6b7280', '#111827')}
                  ${datoTarjeta('Hora de salida', hora, '#f3f4f6', '#6b7280', '#111827')}
                  ${datoTarjeta('Asiento', asientoVisible, '#05402d', '#d1fae5', '#ffffff')}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px 8px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;">
                <tr>
                  ${datoTarjeta('Total', total, '#f3f4f6', '#6b7280', '#05402d')}
                  ${datoTarjeta('Pago', metodo, '#f3f4f6', '#6b7280', '#111827')}
                  ${datoTarjeta('Compra', compra, '#f3f4f6', '#6b7280', '#111827')}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px dashed #d1d5db;">
                <tr>
                  <td style="width:50%;padding:16px 12px 0 0;vertical-align:top;">
                    <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Correo electrónico</p>
                    <p style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:#111827;">${mostrar(correo)}</p>
                  </td>
                  <td style="width:50%;padding:16px 0 0 12px;vertical-align:top;">
                    <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Teléfono</p>
                    <p style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:#111827;">${mostrar(telefono)}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:14px 0 8px 0;vertical-align:top;">
                    <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Documento</p>
                    <p style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:#111827;">${mostrar(documento)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${bloquePasajeros(viajeros)}
          <tr>
            <td style="padding:8px 28px 24px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">${escapar(cierre)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const generarTemplateCancelacion = (datos = {}) => {
  const { fecha, hora } = fechaYHora(datos);
  const pasajero = nombrePasajero(datos);
  const codigo = texto(datos.codigoReserva) || texto(datos.codigo_pnr) || texto(datos.pnr);
  const viajeros = viajerosDe(datos);
  const varios = viajeros.length > 1;
  const asiento = texto(datos.asiento) || texto(datos.numero_asiento);
  const salida = [fecha, hora].filter(Boolean).join(', ');
  const devuelto = quetzales(datos.reembolso);
  const pagado = quetzales(datos.monto_total ?? datos.monto);
  const tipoReembolso = datos.parcial ? 'Parcial' : 'Total';
  const factura = texto(datos.numero_factura);
  const avisoFactura = factura ? ` La factura ${factura} quedó anulada.` : '';
  const explicacion = datos.parcial && pagado
    ? `De ${pagado} pagados, volvieron ${devuelto} a tu billetera.${avisoFactura}`
    : datos.parcial
      ? `Volvieron ${devuelto} a tu billetera.${avisoFactura}`
      : `Volvió el total, ${devuelto}, a tu billetera.${avisoFactura}`;
  const asientosLibres = varios
    ? 'Los asientos volvieron a estar disponibles.'
    : 'El asiento volvió a estar disponible.';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva cancelada - Quetzal Airlines</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#05402d;padding:22px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d1fae5;">Quetzal Airlines</p>
              <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;">Reserva cancelada</p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#8b1c1c;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#fef2f2;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#8b1c1c;">La reserva quedó cancelada</p>
              <p style="margin:4px 0 0 0;font-size:13px;line-height:1.5;color:#7f1d1d;">${escapar(explicacion)} ${escapar(asientosLibres)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">${varios ? 'Pasajero principal' : 'Pasajero'}</p>
              <p style="margin:6px 0 0 0;font-size:22px;font-weight:700;color:#111827;">${escapar(pasajero)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 18px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Código de reserva</p>
              <p style="margin:6px 0 0 0;display:inline-block;background:#8b1c1c;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.18em;padding:8px 14px;border-radius:8px;">${mostrar(codigo)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 18px 28px;">
              ${bloqueRuta(datos.origen, datos.destino)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 8px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;">
                <tr>
                  ${datoTarjeta('Salida', salida, '#f3f4f6', '#6b7280', '#111827')}
                  ${datoTarjeta(varios ? 'Asientos' : 'Asiento', asiento, '#f3f4f6', '#6b7280', '#111827')}
                  ${datoTarjeta('Devolución', tipoReembolso, '#fef2f2', '#8b1c1c', '#8b1c1c')}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Monto devuelto</p>
              <p style="margin:6px 0 0 0;font-size:28px;font-weight:700;color:#05402d;">${mostrar(devuelto)}</p>
            </td>
          </tr>
          ${bloquePasajeros(viajeros)}
          <tr>
            <td style="height:16px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const generarTemplateVerificacion = ({ nombre, enlace }) => {
  const persona = texto(nombre) || 'viajero';
  const url = escapar(enlace);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirma tu cuenta - Quetzal Airlines</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#05402d;padding:22px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d1fae5;">Quetzal Airlines</p>
              <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;">Confirma tu cuenta</p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#8b1c1c;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:16px;line-height:1.5;color:#111827;">Hola ${escapar(persona)},</p>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#374151;">Para terminar el registro, confirma que este correo es tuyo. El enlace vence en 24 horas. Al confirmarlo, el bono de bienvenida queda en tu billetera.</p>
              <p style="margin:24px 0 0 0;">
                <a href="${url}" style="display:inline-block;background:#05402d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 18px;border-radius:10px;">Confirmar cuenta</a>
              </p>
              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#6b7280;">Si el botón no abre, copia este enlace en el navegador:<br>${url}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const generarTemplateCheckin = (datos = {}) => {
  const { fecha, hora } = fechaYHora(datos);
  const codigo = texto(datos.codigo_pnr);
  const salida = [fecha, hora].filter(Boolean).join(', ');
  const filas = (Array.isArray(datos.viajeros) ? datos.viajeros : []).map((viajero) => {
    const nombre = `${texto(viajero.nombre)} ${texto(viajero.apellido)}`.trim();
    const asiento = texto(viajero.numero_asiento) || 'Regazo';
    return `
      <tr>
        <td style="padding:14px 0;border-top:1px dashed #86efac;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;font-size:16px;font-weight:700;color:#052e16;">${escapar(nombre)}</p>
          <p style="margin:4px 0 0 0;font-size:12px;letter-spacing:0.08em;color:#166534;">BOLETO ${escapar(viajero.codigo_boleto)}</p>
        </td>
        <td style="padding:14px 0;border-top:1px dashed #86efac;font-family:Arial,Helvetica,sans-serif;text-align:right;">
          <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#166534;">Asiento</p>
          <p style="margin:2px 0 0 0;font-size:28px;font-weight:700;color:#14532d;">${escapar(asiento)}</p>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boletos ${escapar(codigo)} - Quetzal Airlines</title>
</head>
<body style="margin:0;padding:0;background:#ecfdf5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:2px solid #14532d;">
          <tr>
            <td style="background:#14532d;padding:22px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#bbf7d0;">Boleto de vuelo</p>
              <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;">${mostrar(datos.origen)} → ${mostrar(datos.destino)}</p>
              <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#dcfce7;">No es la factura de tu compra. El asiento es lo que presentas para viajar.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#166534;">Salida · reserva ${mostrar(codigo)}</p>
              <p style="margin:6px 0 0 0;font-size:16px;font-weight:700;color:#052e16;">${mostrar(salida)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${filas}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
