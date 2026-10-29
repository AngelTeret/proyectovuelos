const pintarNota = (id, texto, estado) => {
  const nodo = document.getElementById(id);
  nodo.textContent = texto;
  const color = estado === 'ok'
    ? 'text-emerald-700'
    : estado === 'mal'
      ? 'text-red-600'
      : 'text-slate-500';
  nodo.className = `mt-1.5 text-sm ${color}${texto ? '' : ' hidden'}`;
};

const notaClave = (texto, estado) => pintarNota('nota-clave', texto, estado);

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const recortar = (campo, limite) => {
  if (campo.value.length > limite) {
    campo.value = campo.value.slice(0, limite);
  }
};

const revisarNombre = () => {
  const campo = document.getElementById('nombre');
  recortar(campo, 100);
  const nombre = campo.value.trim();
  if (!nombre) {
    pintarNota('nota-nombre', 'Hasta 100 caracteres.', 'neutro');
  } else {
    pintarNota('nota-nombre', `Llevas ${nombre.length} de 100 caracteres.`, 'ok');
  }
};

const revisarCorreo = () => {
  const campo = document.getElementById('email');
  recortar(campo, 100);
  const correo = campo.value.trim();
  if (!correo) {
    pintarNota('nota-correo', '', 'neutro');
  } else if (!correo.includes('@')) {
    pintarNota('nota-correo', 'Falta el signo @. Ejemplo: nombre@gmail.com.', 'mal');
  } else if (!CORREO.test(correo)) {
    pintarNota('nota-correo', 'Después del @ escribe el dominio, por ejemplo gmail.com.', 'mal');
  } else {
    pintarNota('nota-correo', 'Este correo tiene el formato correcto.', 'ok');
  }
};

const claveAceptada = (clave) => clave.length >= 8 && clave.length <= 72;

document.getElementById('nombre').addEventListener('input', revisarNombre);
document.getElementById('email').addEventListener('input', revisarCorreo);

document.getElementById('password').addEventListener('input', () => {
  const campo = document.getElementById('password');
  if (campo.value.length > 72) {
    campo.value = campo.value.slice(0, 72);
  }
  const clave = campo.value;
  if (!clave) {
    notaClave('Entre 8 y 72 caracteres.', 'neutro');
  } else if (clave.length < 8) {
    notaClave(`Lleva ${clave.length} caracteres. El mínimo es 8.`, 'mal');
  } else if (clave.length > 72) {
    notaClave('Pasa de 72 caracteres. El máximo es 72.', 'mal');
  } else {
    notaClave('Esta contraseña sí se acepta.', 'ok');
  }
});

document.getElementById('form-registro').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!nombre || nombre.length > 100) {
    Swal.fire({ icon: 'warning', title: 'Revisa el nombre', text: 'El máximo es 100 caracteres.' });
    return;
  }
  if (!CORREO.test(email) || email.length > 100) {
    Swal.fire({ icon: 'warning', title: 'Revisa el correo', text: 'Debe verse como nombre@gmail.com.' });
    return;
  }
  if (!claveAceptada(password)) {
    Swal.fire({ icon: 'warning', title: 'Revisa la contraseña', text: 'Debe tener de 8 a 72 caracteres.' });
    return;
  }

  try {
    const respuesta = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        email,
        password,
      }),
    });
    const data = await respuesta.json();

    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'No se pudo crear la cuenta' });
      return;
    }

    Swal.fire({
      icon: data.correo_enviado ? 'success' : 'warning',
      title: data.correo_enviado ? 'Revisa tu correo' : 'Cuenta pendiente',
      text: data.correo_enviado
        ? 'Te enviamos un enlace para confirmar la cuenta. El bono de Q15,000 se acredita cuando la confirmes.'
        : 'La cuenta quedó pendiente, pero no pudimos enviar el correo. Desde el inicio de sesión puedes pedir otro enlace.',
    }).then(() => {
      window.location.replace('/login');
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: 'No se pudo crear la cuenta' });
  }
});
