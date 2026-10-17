if (localStorage.getItem('rol') !== 'admin') {
  document.querySelectorAll('.solo-admin').forEach((enlace) => enlace.remove());
}

document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
  localStorage.removeItem('nombre');
  localStorage.removeItem('usuario_id');
  window.location.href = '/login.html';
});

const valor = (id) => document.getElementById(id).value.trim();

const letras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const correo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const reglas = {
  nombre: {
    mensaje: 'El nombre solo puede contener letras',
    valido: (texto) => letras.test(texto),
  },
  apellido: {
    mensaje: 'El apellido solo puede contener letras',
    valido: (texto) => letras.test(texto),
  },
  documento_identidad: {
    mensaje: 'El documento debe tener entre 6 y 15 letras o números',
    valido: (texto) => /^[A-Za-z0-9]{6,15}$/.test(texto),
  },
  email: {
    mensaje: 'Ingresa un correo electrónico válido',
    valido: (texto) => correo.test(texto),
  },
  telefono: {
    mensaje: 'Ingresa un teléfono de 8 a 15 dígitos',
    valido: (texto) => /^\+?\d{8,15}$/.test(texto.replace(/[\s()-]/g, '')),
  },
};

const marcarCampo = (id, mensaje) => {
  const input = document.getElementById(id);
  const error = document.getElementById(`error-${id}`);
  input.setCustomValidity(mensaje);
  input.classList.toggle('border-red-400', Boolean(mensaje));
  input.classList.toggle('border-slate-200', !mensaje);
  error.textContent = mensaje;
  error.classList.toggle('hidden', !mensaje);
};

const validarCampo = (id) => {
  const texto = valor(id);
  if (!texto) {
    marcarCampo(id, 'Este campo es obligatorio');
    return false;
  }
  if (!reglas[id].valido(texto)) {
    marcarCampo(id, reglas[id].mensaje);
    return false;
  }
  marcarCampo(id, '');
  return true;
};

const formularioValido = () => Object.keys(reglas).map(validarCampo).every(Boolean);

const rellenarDesdePerfil = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return;
  }

  try {
    const respuesta = await fetch('/api/auth/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) {
      return;
    }
    const usuario = await respuesta.json();
    document.getElementById('nombre').value = usuario.nombre || '';
    document.getElementById('email').value = usuario.email || '';
    if (usuario.id) {
      localStorage.setItem('usuario_id', String(usuario.id));
    }
  } catch (error) {
    return;
  }
};

document.getElementById('btnVolver').addEventListener('click', (evento) => {
  evento.preventDefault();
  window.location.href = '/index.html';
});

Object.keys(reglas).forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener('blur', () => validarCampo(id));
  input.addEventListener('input', () => {
    if (!document.getElementById(`error-${id}`).classList.contains('hidden')) {
      validarCampo(id);
    }
  });
});

document.getElementById('form-pasajero').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (!formularioValido()) {
    const hayVacios = Object.keys(reglas).some((id) => !valor(id));
    Swal.fire(hayVacios
      ? { icon: 'warning', title: 'Faltan datos', text: 'Por favor completa todos los campos' }
      : { icon: 'warning', title: 'Revisa los datos', text: 'Corrige los campos marcados antes de continuar' });
    return;
  }

  const pasajero = {
    nombre: valor('nombre'),
    apellido: valor('apellido'),
    documento_identidad: valor('documento_identidad'),
    email: valor('email'),
    telefono: valor('telefono'),
  };

  try {
    const respuesta = await fetch('/api/pasajeros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pasajero),
    });
    const data = await respuesta.json();

    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'No se pudo guardar el pasajero' });
      return;
    }

    localStorage.setItem('datosPasajeros', JSON.stringify({
      ...pasajero,
      id: data.id,
      usuario_id: Number(localStorage.getItem('usuario_id')) || null,
    }));
    window.location.href = '/asientos.html';
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: 'No se pudo guardar el pasajero' });
  }
});

rellenarDesdePerfil();
