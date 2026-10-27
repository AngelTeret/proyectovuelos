if (!tokenDeSesion()) {
  window.location.replace('/login');
} else if (rolDeSesion() !== 'admin') {
  window.location.replace('/');
}

const listaDespacho = document.getElementById('lista-despacho');
const modalCuenta = document.getElementById('modal-cuenta');
const tituloModal = document.getElementById('titulo-modal-cuenta');
const notaPassword = document.getElementById('nota-password');
const campoPassword = document.getElementById('despacho-password');
let cuentasCargadas = [];
let cuentaEditando = null;

const inicialDe = (nombre) => {
  const letra = String(nombre || '').trim().charAt(0);
  return letra ? letra.toUpperCase() : '?';
};

const abrirModal = () => {
  modalCuenta.classList.remove('hidden');
  modalCuenta.classList.add('flex');
  document.getElementById('despacho-nombre').focus();
};

const cerrarModal = () => {
  modalCuenta.classList.add('hidden');
  modalCuenta.classList.remove('flex');
  cuentaEditando = null;
  document.getElementById('form-despacho').reset();
  notaPassword.classList.add('hidden');
  campoPassword.required = true;
  document.getElementById('btn-crear-despacho').textContent = 'Crear cuenta';
  tituloModal.textContent = 'Nueva cuenta';
};

const prepararNueva = () => {
  cerrarModal();
  abrirModal();
};

const prepararEdicion = (id) => {
  const cuenta = cuentasCargadas.find((item) => item.id === Number(id));
  if (!cuenta) {
    return;
  }
  cuentaEditando = cuenta;
  tituloModal.textContent = 'Editar cuenta';
  document.getElementById('despacho-nombre').value = cuenta.nombre || '';
  document.getElementById('despacho-email').value = cuenta.email || '';
  campoPassword.value = '';
  campoPassword.required = false;
  notaPassword.classList.remove('hidden');
  document.getElementById('btn-crear-despacho').textContent = 'Guardar cambios';
  abrirModal();
};

const pintarDespacho = (cuentas) => {
  cuentasCargadas = cuentas;
  if (cuentas.length === 0) {
    listaDespacho.innerHTML = '<tr><td colspan="3" class="px-5 py-8 text-center text-sm text-slate-500">Todavía no hay cuentas de puerta.</td></tr>';
    return;
  }
  listaDespacho.innerHTML = cuentas.map((cuenta) => `
    <tr class="hover:bg-slate-50">
      <td class="px-5 py-4">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">${escapar(inicialDe(cuenta.nombre))}</span>
          <span class="font-medium text-slate-900">${escapar(cuenta.nombre)}</span>
        </div>
      </td>
      <td class="px-5 py-4">${escapar(cuenta.email)}</td>
      <td class="px-5 py-4">
        <div class="flex items-center gap-2">
          <button type="button" data-accion="editar" data-cuenta-id="${Number(cuenta.id)}" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">Editar</button>
          <button type="button" data-accion="eliminar" data-cuenta-id="${Number(cuenta.id)}" data-nombre="${escapar(cuenta.nombre)}" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
};

const cargarDespacho = async () => {
  const respuesta = await fetch('/api/personal/despacho', { headers: autorizacion() });
  if (await cerrarSiSesionRechazada(respuesta, '/personal')) {
    return;
  }
  const data = await respuesta.json().catch(() => []);
  if (!respuesta.ok) {
    throw new Error(data.mensaje || 'No se pudieron cargar las cuentas de puerta.');
  }
  pintarDespacho(Array.isArray(data) ? data : []);
};

document.getElementById('btn-nueva-cuenta').addEventListener('click', prepararNueva);
document.getElementById('btn-cancelar-cuenta').addEventListener('click', cerrarModal);
modalCuenta.addEventListener('click', (evento) => {
  if (evento.target === modalCuenta) {
    cerrarModal();
  }
});

document.getElementById('form-despacho').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const boton = document.getElementById('btn-crear-despacho');
  const nombre = document.getElementById('despacho-nombre').value.trim();
  const email = document.getElementById('despacho-email').value.trim();
  const password = document.getElementById('despacho-password').value;
  const editando = Boolean(cuentaEditando);
  boton.disabled = true;
  boton.textContent = editando ? 'Guardando…' : 'Creando…';
  try {
    const respuesta = await fetch(editando ? `/api/personal/despacho/${cuentaEditando.id}` : '/api/personal/despacho', {
      method: editando ? 'PUT' : 'POST',
      headers: { ...autorizacion(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'No se pudo crear', text: data.mensaje || 'Intenta de nuevo.' });
      return;
    }
    cerrarModal();
    await cargarDespacho();
    Swal.fire({
      icon: 'success',
      title: editando ? 'Cuenta actualizada' : 'Cuenta lista',
      text: editando
        ? 'Los datos de la cuenta quedaron guardados.'
        : 'Ya puede entrar en Abordaje con ese correo y esa contraseña.',
      confirmButtonText: 'Listo',
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo crear', text: error.message });
  } finally {
    boton.disabled = false;
    if (!modalCuenta.classList.contains('hidden')) {
      boton.textContent = cuentaEditando ? 'Guardar cambios' : 'Crear cuenta';
    }
  }
});

const eliminarCuenta = async (id, nombre) => {
  const resultado = await Swal.fire({
    title: '¿Eliminar esta cuenta?',
    text: `${nombre || 'Esta persona'} ya no podrá entrar al abordaje.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
  });
  if (!resultado.isConfirmed) {
    return;
  }
  try {
    const respuesta = await fetch(`/api/personal/despacho/${id}`, {
      method: 'DELETE',
      headers: autorizacion(),
    });
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: data.mensaje || 'Intenta de nuevo.' });
      return;
    }
    await cargarDespacho();
    mostrarExito('Cuenta eliminada');
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: error.message });
  }
};

listaDespacho.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) {
    return;
  }
  if (boton.dataset.accion === 'editar') {
    prepararEdicion(boton.dataset.cuentaId);
    return;
  }
  if (boton.dataset.accion === 'eliminar') {
    eliminarCuenta(boton.dataset.cuentaId, boton.dataset.nombre);
  }
});

cargarDespacho().catch(() => {
  listaDespacho.innerHTML = '<tr><td colspan="3" class="px-5 py-8 text-center text-sm text-slate-500">No se pudieron cargar las cuentas de puerta.</td></tr>';
});
