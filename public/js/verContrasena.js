document.querySelectorAll('[data-ver-contrasena]').forEach((boton) => {
  const campo = document.getElementById(boton.dataset.verContrasena);
  if (!campo) {
    return;
  }

  boton.addEventListener('mousedown', (evento) => evento.preventDefault());
  boton.addEventListener('click', () => {
    const visible = campo.type === 'password';
    campo.type = visible ? 'text' : 'password';
    boton.setAttribute('aria-pressed', String(visible));
    boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    boton.querySelector('[data-icono="mostrar"]').classList.toggle('hidden', visible);
    boton.querySelector('[data-icono="ocultar"]').classList.toggle('hidden', !visible);
  });
});
