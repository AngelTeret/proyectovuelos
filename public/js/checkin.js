const params = new URLSearchParams(window.location.search);
const pnr = (params.get('pnr') || '').trim().toUpperCase();

const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const titulosTipo = { adulto: 'Adulto', nino: 'Niño', infante: 'Infante' };

const mostrarError = (mensaje) => {
  document.getElementById('mensaje-error').textContent = mensaje || 'No se pudo abrir el check-in.';
  document.getElementById('panel-checkin').classList.add('hidden');
  mostrar('error-checkin');
};

const pintarViajero = (viajero) => {
  const nombre = `${viajero.nombre || ''} ${viajero.apellido || ''}`.trim();
  const asiento = viajero.numero_asiento || 'Regazo';
  const tipo = titulosTipo[viajero.tipo] || 'Pasajero';
  const listo = Boolean(viajero.codigo_boleto);
  const infante = viajero.tipo === 'infante';
  const regazo = Array.isArray(viajero.infantes_en_regazo) && viajero.infantes_en_regazo.length
    ? `Infante en regazo: ${viajero.infantes_en_regazo.join(', ')}`
    : '';
  return `
    <label class="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <input data-viajero data-tipo="${escapar(viajero.tipo)}" value="${Number(viajero.id)}" type="checkbox" class="mt-1 h-4 w-4" ${listo || infante ? 'checked disabled' : 'checked'}>
      <span class="min-w-0 flex-1">
        <span class="block font-semibold text-slate-900">${escapar(nombre)}</span>
        <span class="mt-0.5 block text-sm text-slate-500">${escapar(tipo)} · ${escapar(asiento)}</span>
        ${regazo ? `<span class="mt-1 block text-sm text-slate-600">${escapar(regazo)}</span>` : ''}
        ${listo ? `<span class="mt-1 block text-sm font-semibold tracking-wide text-slate-900">Boleto ${escapar(viajero.codigo_boleto)}</span>` : ''}
      </span>
    </label>`;
};

const pintar = (datos, aviso) => {
  document.getElementById('pnr').textContent = datos.codigo_pnr || pnr;
  document.getElementById('mensaje-checkin').textContent = datos.mensaje || '';
  document.getElementById('ruta').textContent = `${datos.origen || ''} → ${datos.destino || ''}`;
  document.getElementById('salida').textContent = formatearSalida(datos.fecha_salida);
  document.getElementById('lista-viajeros').innerHTML = (datos.viajeros || []).map(pintarViajero).join('');

  const hayBoletos = (datos.viajeros || []).some((viajero) => viajero.codigo_boleto);
  const faltaAlguien = (datos.viajeros || []).some((viajero) => !viajero.codigo_boleto);
  document.getElementById('btn-confirmar').classList.toggle('hidden', !(datos.abierto && faltaAlguien));
  document.getElementById('btn-descargar').classList.toggle('hidden', !hayBoletos);

  const avisoCorreo = document.getElementById('aviso-correo');
  if (aviso) {
    avisoCorreo.textContent = aviso;
    avisoCorreo.classList.remove('hidden');
  }
  mostrar('panel-checkin');
};

const idsElegidos = () => [...document.querySelectorAll('[data-viajero]:checked')]
  .filter((campo) => campo.dataset.tipo !== 'infante')
  .map((campo) => Number(campo.value))
  .filter((id) => Number.isInteger(id) && id > 0);

const confirmar = async () => {
  const boton = document.getElementById('btn-confirmar');
  const viajeros = idsElegidos();
  if (viajeros.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Elige un viajero', text: 'Selecciona a quién vas a incluir en el check-in.' });
    return;
  }
  boton.disabled = true;
  try {
    const respuesta = await fetch('/api/checkin', {
      method: 'POST',
      headers: { ...autorizacion(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo_pnr: pnr, viajeros }),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', `${window.location.pathname}${window.location.search}`);
      window.location.replace('/login.html');
      return;
    }
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'No se pudo hacer el check-in', text: data.mensaje || 'Intenta de nuevo.' });
      return;
    }
    const aviso = data.correo_enviado
      ? 'Enviamos los boletos al correo de la reserva.'
      : data.creados > 0
        ? 'El check-in quedó listo. No pudimos enviar el correo; puedes descargar los boletos.'
        : '';
    pintar(data, aviso);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo hacer el check-in', text: 'Intenta de nuevo.' });
  } finally {
    boton.disabled = false;
  }
};

const cargar = async () => {
  if (!/^[A-Z0-9]{6}$/.test(pnr)) {
    mostrarError('El código de reserva no es válido.');
    return;
  }
  try {
    const respuesta = await fetch(`/api/checkin/elegibilidad/${pnr}`, { headers: autorizacion() });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', `${window.location.pathname}${window.location.search}`);
      window.location.replace('/login.html');
      return;
    }
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      mostrarError(data.mensaje);
      return;
    }
    pintar(data);
  } catch (error) {
    mostrarError('No se pudo abrir el check-in.');
  }
};

document.getElementById('btn-confirmar').addEventListener('click', confirmar);
document.getElementById('btn-descargar').addEventListener('click', (evento) => {
  descargarArchivo(`/api/checkin/pnr/${pnr}/pdf`, evento.currentTarget, 'boletos.pdf');
});

cargar();
