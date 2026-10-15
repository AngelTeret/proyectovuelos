const mensaje = document.getElementById('auth-mensaje');
const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');

const mostrarLogin = () => {
  formLogin?.classList.remove('d-none');
  formRegistro?.classList.add('d-none');
};

const mostrarRegistro = () => {
  formRegistro?.classList.remove('d-none');
  formLogin?.classList.add('d-none');
};

document.getElementById('ir-registro')?.addEventListener('click', () => {
  if (mensaje) {
    mensaje.innerHTML = '';
  }
  mostrarRegistro();
});

document.getElementById('ir-login')?.addEventListener('click', () => {
  if (mensaje) {
    mensaje.innerHTML = '';
  }
  mostrarLogin();
});

const mostrarMensaje = (texto, tipo = 'danger') => {
  if (!mensaje) {
    return;
  }

  mensaje.innerHTML = `
    <div class="alert alert-${tipo}" role="alert">${App.escaparHtml(texto)}</div>
  `;
};

document.getElementById('form-registro')?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (mensaje) {
    mensaje.innerHTML = '';
  }

  try {
    const respuesta = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: document.getElementById('reg-nombre').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
      }),
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensaje(datos.mensaje || 'No se pudo registrar el usuario.');
      return;
    }

    document.getElementById('form-registro').reset();
    document.getElementById('login-email').value = datos.usuario.email;
    mostrarLogin();
    mostrarMensaje('Cuenta creada. Ya puedes iniciar sesión.', 'success');
  } catch (error) {
    mostrarMensaje('No se pudo registrar el usuario.');
  }
});

document.getElementById('form-login')?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (mensaje) {
    mensaje.innerHTML = '';
  }

  try {
    const respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      }),
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensaje(datos.mensaje || 'No se pudo iniciar sesión.');
      return;
    }

    App.guardarSesion(datos.token, datos.usuario);
    const destino = datos.usuario.rol === 'admin' ? 'admin.html' : 'cliente.html';
    window.location.replace(destino);
  } catch (error) {
    mostrarMensaje('No se pudo iniciar sesión.');
  }
});
