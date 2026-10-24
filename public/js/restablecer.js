const titulo = document.getElementById('titulo');
const mensaje = document.getElementById('mensaje');
const formulario = document.getElementById('form-restablecer');
const volver = document.getElementById('volver');
const token = new URLSearchParams(window.location.search).get('token') || '';

const mostrarError = (texto) => {
  titulo.textContent = 'El enlace no sirve';
  mensaje.textContent = texto;
  formulario.classList.add('hidden');
  volver.classList.remove('hidden');
};

const revisar = async () => {
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    mostrarError('Pide un enlace nuevo desde Olvidé mi contraseña.');
    return;
  }
  const respuesta = await fetch('/api/auth/restablecer/revisar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    mostrarError(data.mensaje || 'Pide un enlace nuevo desde Olvidé mi contraseña.');
    return;
  }
  mensaje.textContent = 'Elige una contraseña de 8 a 72 caracteres.';
  formulario.classList.remove('hidden');
};

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const password = document.getElementById('password').value;
  const repetida = document.getElementById('password-2').value;
  if (password !== repetida) {
    Swal.fire({ icon: 'warning', title: 'No coinciden', text: 'Escribe la misma contraseña en los dos campos.' });
    return;
  }
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    const respuesta = await fetch('/api/auth/restablecer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      mostrarError(data.mensaje || 'Pide un enlace nuevo.');
      Swal.fire({ icon: 'warning', title: 'No se pudo guardar', text: data.mensaje || 'Pide un enlace nuevo.' });
      return;
    }
    formulario.classList.add('hidden');
    titulo.textContent = 'Contraseña actualizada';
    mensaje.textContent = data.mensaje;
    await Swal.fire({ icon: 'success', title: 'Listo', text: data.mensaje });
    window.location.replace('/login');
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: 'Intenta de nuevo.' });
  } finally {
    boton.disabled = false;
  }
});

revisar().catch(() => {
  mostrarError('Intenta de nuevo en unos minutos.');
});
