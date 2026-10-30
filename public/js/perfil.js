const ROLES = {
  admin: 'Administrador',
  cliente: 'Cliente',
  despacho: 'Puerta',
  mantenimiento: 'Mantenimiento',
};

const avisar = (texto) => {
  Swal.fire({ icon: 'warning', title: 'Revisa el perfil', text: texto });
};

const pintarNombre = (nombre) => {
  const titulo = document.getElementById('titulo-nombre');
  if (titulo) {
    titulo.textContent = nombre;
  }
  const nodo = document.getElementById('nombre-usuario');
  const corto = nodo?.querySelector('.nombre-corto');
  const completo = nodo?.querySelector('.nombre-completo');
  const primero = nombre.split(' ')[0] || nombre;
  if (corto) {
    corto.textContent = primero;
  }
  if (completo) {
    completo.textContent = nombre;
  }
};

const pintarConfirmacion = (confirmado) => {
  const nodo = document.getElementById('confirmado');
  nodo.textContent = confirmado ? 'Correo confirmado' : 'Correo pendiente';
  nodo.className = confirmado
    ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'
    : 'rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800';
};

const cargar = async () => {
  const datos = await pedirJson('/api/auth/perfil');
  if (!datos) {
    return;
  }
  pintarNombre(datos.nombre || '—');
  document.getElementById('correo').textContent = datos.email || '—';
  document.getElementById('rol').textContent = ROLES[datos.rol] || 'Cuenta';
  pintarConfirmacion(Boolean(datos.email_verificado));
  document.getElementById('nombre').value = datos.nombre || '';
  revisarNombre();
  if (datos.rol === 'cliente') {
    document.getElementById('bloque-saldo').classList.remove('hidden');
    document.getElementById('saldo').textContent = quetzales(datos.saldo_virtual);
  }
};

document.getElementById('form-nombre').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const boton = document.querySelector('#form-nombre button[type="submit"]');
  const nombre = document.getElementById('nombre').value.trim().replace(/\s+/g, ' ');
  if (!nombre || nombre.length > 100) {
    avisar('El nombre es obligatorio y no puede pasar de 100 caracteres.');
    return;
  }
  boton.disabled = true;
  try {
    const datos = await pedirJson('/api/auth/perfil', { metodo: 'PUT', cuerpo: { nombre } });
    if (!datos) {
      return;
    }
    const guardado = datos.nombre || nombre;
    document.getElementById('nombre').value = guardado;
    revisarNombre();
    sessionStorage.setItem('nombre', guardado);
    pintarNombre(guardado);
    mostrarExito('Nombre actualizado');
  } catch (error) {
    avisar(error.message || 'No se pudo guardar el nombre.');
  } finally {
    boton.disabled = false;
  }
});

const nota = (id, texto, estado) => {
  const nodo = document.getElementById(id);
  nodo.textContent = texto;
  nodo.className = estado === 'ok'
    ? 'mt-1.5 text-sm text-emerald-700'
    : estado === 'mal'
      ? 'mt-1.5 text-sm text-red-600'
      : 'mt-1.5 text-sm text-slate-500';
};

const revisarNombre = () => {
  const cantidad = document.getElementById('nombre').value.trim().length;
  const nodo = document.getElementById('regla-nombre');
  nodo.textContent = cantidad === 0
    ? 'Puedes escribir hasta 100 caracteres.'
    : `Llevas ${cantidad} de 100 caracteres.`;
  nodo.className = cantidad > 100 ? 'text-sm text-red-600' : 'text-sm text-slate-500';
};

const revisarClave = () => {
  ['clave-nueva', 'clave-repetir'].forEach((id) => {
    const campo = document.getElementById(id);
    if (campo.value.length > 72) {
      campo.value = campo.value.slice(0, 72);
    }
  });
  const actual = document.getElementById('clave-actual').value;
  const nueva = document.getElementById('clave-nueva').value;
  const repetir = document.getElementById('clave-repetir').value;

  if (!nueva) {
    nota('nota-nueva', 'Entre 8 y 72 caracteres, y distinta a la que usas ahora.', 'neutro');
  } else if (nueva.length < 8) {
    nota('nota-nueva', `Lleva ${nueva.length} caracteres. El mínimo es 8.`, 'mal');
  } else if (nueva.length > 72) {
    nota('nota-nueva', 'Pasa de 72 caracteres. El máximo es 72.', 'mal');
  } else if (actual && nueva === actual) {
    nota('nota-nueva', 'Tiene que ser distinta a la contraseña actual.', 'mal');
  } else {
    nota('nota-nueva', 'Esta contraseña sí se acepta.', 'ok');
  }

  if (!repetir) {
    nota('nota-repetir', 'Escríbela otra vez, igual que la nueva.', 'neutro');
  } else if (repetir !== nueva) {
    nota('nota-repetir', 'No es igual a la contraseña nueva.', 'mal');
  } else {
    nota('nota-repetir', 'Coincide con la contraseña nueva.', 'ok');
  }
};

document.getElementById('nombre').addEventListener('input', revisarNombre);
['clave-actual', 'clave-nueva', 'clave-repetir'].forEach((id) => {
  document.getElementById(id).addEventListener('input', revisarClave);
});

const limpiarClaves = () => {
  ['clave-actual', 'clave-nueva', 'clave-repetir'].forEach((id) => {
    const campo = document.getElementById(id);
    campo.value = '';
    campo.type = 'password';
  });
  document.querySelectorAll('#form-clave [data-ver-contrasena]').forEach((ojo) => {
    ojo.setAttribute('aria-pressed', 'false');
    ojo.setAttribute('aria-label', 'Mostrar contraseña');
    ojo.querySelector('[data-icono="mostrar"]')?.classList.remove('hidden');
    ojo.querySelector('[data-icono="ocultar"]')?.classList.add('hidden');
  });
  revisarClave();
};

document.getElementById('form-clave').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const boton = document.querySelector('#form-clave button[type="submit"]');
  const actual = document.getElementById('clave-actual').value;
  const nueva = document.getElementById('clave-nueva').value;
  const repetir = document.getElementById('clave-repetir').value;
  if (nueva.length < 8 || nueva.length > 72) {
    avisar('La contraseña debe tener de 8 a 72 caracteres.');
    return;
  }
  if (nueva === actual) {
    avisar('Elige una contraseña distinta a la actual.');
    return;
  }
  if (nueva !== repetir) {
    avisar('La contraseña nueva no coincide.');
    return;
  }
  boton.disabled = true;
  try {
    const datos = await pedirJson('/api/auth/perfil/contrasena', {
      metodo: 'PUT',
      cuerpo: { actual, nueva, repetir },
    });
    if (!datos) {
      return;
    }
    limpiarClaves();
    mostrarExito('Contraseña actualizada');
  } catch (error) {
    const texto = String(error?.message || '');
    avisar(/cannot read properties|is not a function/i.test(texto)
      ? 'No se pudo cambiar la contraseña.'
      : (texto || 'No se pudo cambiar la contraseña.'));
  } finally {
    boton.disabled = false;
  }
});

cargar().catch((error) => {
  avisar(error.message || 'No se pudo cargar el perfil.');
});
