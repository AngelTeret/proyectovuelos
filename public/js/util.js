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

const descargarBoleto = async (reservaId, boton) => {
  const texto = boton ? boton.textContent : '';
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Descargando...';
  }
  try {
    const respuesta = await fetch(`/api/reservas/${reservaId}/boleto`, {
      headers: autorizacion(),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = '/login.html';
      return;
    }
    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => ({}));
      Swal.fire({
        icon: 'error',
        title: 'No se pudo descargar',
        text: data.mensaje || 'Intenta de nuevo.',
      });
      return;
    }
    const archivo = await respuesta.blob();
    const disposicion = respuesta.headers.get('Content-Disposition') || '';
    const coincidencia = disposicion.match(/filename="([^"]+)"/);
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = coincidencia ? coincidencia[1] : 'boleto.pdf';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo descargar', text: 'Intenta de nuevo.' });
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = texto;
    }
  }
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
  descargarBoleto,
});
