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

if (sessionStorage.getItem('avisoSesion') === 'inactiva') {
  sessionStorage.removeItem('avisoSesion');
  Swal.fire({
    icon: 'info',
    title: 'Sesión cerrada',
    text: 'Cerramos tu sesión tras 15 minutos sin actividad.',
  });
}

if (sessionStorage.getItem('avisoSesion') === 'invalida') {
  sessionStorage.removeItem('avisoSesion');
  Swal.fire({
    icon: 'info',
    title: 'Sesión cerrada',
    text: 'Esta sesión ya no sirve. Entra de nuevo.',
  });
}

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

    const anterior = sessionStorage.getItem('usuario_id') || localStorage.getItem('usuario_id') || '';
    const nuevo = data.usuario?.id ? String(data.usuario.id) : '';
    if (anterior && nuevo && anterior !== nuevo && typeof limpiarDatosPersonales === 'function') {
      limpiarDatosPersonales();
    }
    guardarDatosSesion({
      token: data.token,
      rol: data.rol,
      nombre: data.usuario?.nombre || '',
      usuarioId: nuevo,
    });

    if (data.rol === 'admin') {
      window.location.replace('/administracion.html');
      return;
    }
    if (data.rol === 'despacho') {
      window.location.replace('/abordaje.html');
      return;
    }
    if (data.rol === 'mantenimiento') {
      window.location.replace('/mantenimiento.html');
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
