const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const escapar = (texto) => String(texto ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const quetzales = (monto) => `Q ${Number(monto || 0).toFixed(2)}`;

const sinAcentos = (texto) => String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const leerJson = (clave, vacio = {}) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) || vacio;
  } catch {
    return vacio;
  }
};

const formatearDia = (valor) => {
  const coincidencia = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!coincidencia) {
    return '';
  }
  const dia = Number(coincidencia[3]);
  const mes = meses[Number(coincidencia[2]) - 1];
  return `${dia} ${mes} ${coincidencia[1]}`;
};

const formatearSalida = (valor) => {
  const coincidencia = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!coincidencia) {
    return '';
  }
  const dia = Number(coincidencia[3]);
  const mes = meses[Number(coincidencia[2]) - 1];
  return `${dia} ${mes} ${coincidencia[1]}, ${coincidencia[4]}:${coincidencia[5]}`;
};

const formatearFecha = (valor) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}, ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};

const autorizacion = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

Object.assign(window, {
  escapar,
  quetzales,
  sinAcentos,
  leerJson,
  formatearDia,
  formatearSalida,
  formatearFecha,
  autorizacion,
});
