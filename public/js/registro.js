document.getElementById('form-registro').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  try {
    const respuesta = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: document.getElementById('nombre').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
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
      window.location.replace('/login.html');
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: 'No se pudo crear la cuenta' });
  }
});
