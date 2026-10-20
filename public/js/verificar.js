const titulo = document.getElementById('titulo');
const mensaje = document.getElementById('mensaje');
const irLogin = document.getElementById('ir-login');
const formReenvio = document.getElementById('form-reenvio');

const mostrar = (tituloTexto, mensajeTexto, opciones = {}) => {
  titulo.textContent = tituloTexto;
  mensaje.textContent = mensajeTexto;
  irLogin.classList.toggle('hidden', !opciones.login);
  irLogin.classList.toggle('inline-flex', Boolean(opciones.login));
  formReenvio.classList.toggle('hidden', !opciones.reenvio);
};

const confirmar = async (token) => {
  const respuesta = await fetch('/api/auth/verificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await respuesta.json().catch(() => ({}));
  if (respuesta.ok) {
    mostrar('Cuenta confirmada', data.mensaje || 'Ya puedes iniciar sesión.', { login: true });
    return;
  }
  mostrar('No se pudo confirmar', data.mensaje || 'El enlace no es válido.', { reenvio: true });
};

const token = new URLSearchParams(window.location.search).get('token') || '';
if (!/^[a-f0-9]{64}$/i.test(token)) {
  mostrar('Enlace no válido', 'Pide un enlace nuevo con el correo de tu cuenta.', { reenvio: true });
} else {
  confirmar(token).catch(() => {
    mostrar('No se pudo confirmar', 'Intenta de nuevo en unos minutos.', { reenvio: true });
  });
}

formReenvio.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const boton = formReenvio.querySelector('button');
  boton.disabled = true;
  try {
    const respuesta = await fetch('/api/auth/reenviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('email').value.trim() }),
    });
    const data = await respuesta.json().catch(() => ({}));
    mensaje.textContent = data.mensaje || 'Intenta de nuevo.';
  } catch (error) {
    mensaje.textContent = 'No se pudo enviar el enlace.';
  } finally {
    boton.disabled = false;
  }
});
