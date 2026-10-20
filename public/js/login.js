const reenviarConfirmacion = async (email) => {
  try {
    const respuesta = await fetch('/api/auth/reenviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await respuesta.json().catch(() => ({}));
    Swal.fire({
      icon: respuesta.ok ? 'success' : 'error',
      title: respuesta.ok ? 'Listo' : 'No se pudo enviar',
      text: data.mensaje || 'Intenta de nuevo.',
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo enviar', text: 'Intenta de nuevo.' });
  }
};

document.getElementById('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  try {
    const respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      }),
    });
    const data = await respuesta.json();

    if (!respuesta.ok) {
      if (data.pendiente) {
        const accion = await Swal.fire({
          icon: 'info',
          title: 'Confirma tu correo',
          text: data.mensaje,
          showCancelButton: true,
          confirmButtonText: 'Reenviar enlace',
          cancelButtonText: 'Cerrar',
        });
        if (accion.isConfirmed) {
          await reenviarConfirmacion(document.getElementById('email').value.trim());
        }
        return;
      }
      Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'Credenciales incorrectas' });
      return;
    }

    const anterior = localStorage.getItem('usuario_id') || '';
    const nuevo = data.usuario?.id ? String(data.usuario.id) : '';
    if (anterior && nuevo && anterior !== nuevo && typeof limpiarDatosPersonales === 'function') {
      limpiarDatosPersonales();
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('rol', data.rol);
    localStorage.setItem('nombre', data.usuario?.nombre || '');
    if (nuevo) {
      localStorage.setItem('usuario_id', nuevo);
    }

    if (data.rol === 'admin') {
      window.location.replace('/administracion.html');
      return;
    }

    const destino = localStorage.getItem('redirectAfterLogin');
    if (destino && destino.startsWith('/') && !destino.startsWith('//')) {
      localStorage.removeItem('redirectAfterLogin');
      window.location.replace(destino);
      return;
    }

    localStorage.removeItem('redirectAfterLogin');
    window.location.replace('/index.html');
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: 'Credenciales incorrectas' });
  }
});
