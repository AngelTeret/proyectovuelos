if (!tokenDeSesion()) {
  window.location.replace('/login.html');
} else if (rolDeSesion() !== 'admin') {
  window.location.replace('/index.html');
}

const ETIQUETAS = {
  login: 'Inicio de sesión',
  pago: 'Pago',
  cancelacion: 'Cancelación',
  restablecer: 'Contraseña',
};

const COLORES = {
  login: 'bg-blue-50 text-blue-700',
  pago: 'bg-emerald-50 text-emerald-700',
  cancelacion: 'bg-amber-50 text-amber-700',
  restablecer: 'bg-slate-100 text-slate-700',
};

let registros = [];

const etiquetaDe = (accion) => ETIQUETAS[accion] || accion || 'Registro';

const pintarBitacora = () => {
  const filtro = document.getElementById('filtro-accion').value;
  const visibles = filtro ? registros.filter((fila) => fila.accion === filtro) : registros;
  const cuerpo = document.getElementById('cuerpo-bitacora');

  if (visibles.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="5" class="px-5 py-8 text-center text-sm text-slate-500">No hay registros para mostrar.</td></tr>';
    return;
  }

  cuerpo.innerHTML = visibles.map((fila) => {
    const nombre = fila.nombre_usuario ? escapar(fila.nombre_usuario) : 'Sin cuenta';
    const correo = fila.email_usuario
      ? `<p class="text-xs text-slate-500">${escapar(fila.email_usuario)}</p>`
      : '';
    const color = COLORES[fila.accion] || 'bg-slate-100 text-slate-700';
    return `
      <tr class="hover:bg-slate-50">
        <td class="px-5 py-4 whitespace-nowrap">${escapar(formatearFecha(fila.creado_en))}</td>
        <td class="px-5 py-4"><p class="font-medium text-slate-900">${nombre}</p>${correo}</td>
        <td class="px-5 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}">${escapar(etiquetaDe(fila.accion))}</span></td>
        <td class="px-5 py-4">${escapar(fila.detalle)}</td>
        <td class="px-5 py-4 whitespace-nowrap text-slate-500">${escapar(fila.ip || '')}</td>
      </tr>
    `;
  }).join('');
};

const cargarBitacora = async () => {
  const cuerpo = document.getElementById('cuerpo-bitacora');
  try {
    const respuesta = await fetch('/api/bitacora', { headers: autorizacion() });
    if (respuesta.status === 401) {
      cerrarSesionInvalida('/bitacora.html');
      return;
    }
    if (respuesta.status === 403) {
      window.location.replace('/index.html');
      return;
    }
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar la bitácora');
    }
    registros = await respuesta.json();
    pintarBitacora();
  } catch (error) {
    cuerpo.innerHTML = '<tr><td colspan="5" class="px-5 py-8 text-center text-sm text-red-600">No se pudo cargar la bitácora.</td></tr>';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!tokenDeSesion() || rolDeSesion() !== 'admin') {
    return;
  }
  document.getElementById('filtro-accion').addEventListener('change', pintarBitacora);
  cargarBitacora();
});
