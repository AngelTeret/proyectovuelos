const nombreDeSesion = () => {
  const guardado = localStorage.getItem('nombre');
  if (guardado) {
    return guardado;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return '';
  }

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const datos = JSON.parse(atob(base64));
    return datos.nombre || '';
  } catch (error) {
    return '';
  }
};

const nombreUsuario = document.getElementById('nombre-usuario');
if (nombreUsuario) {
  nombreUsuario.textContent = nombreDeSesion();
}

const iniciarSesion = document.getElementById('btn-iniciar-sesion');
const cerrarSesion = document.getElementById('btn-cerrar-sesion');
if (iniciarSesion && cerrarSesion) {
  const autenticado = Boolean(localStorage.getItem('token'));
  iniciarSesion.classList.toggle('hidden', autenticado);
  cerrarSesion.classList.toggle('hidden', !autenticado);
}

const estiloMenu = document.createElement('style');
estiloMenu.textContent = `
  #nombre-usuario {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  body > div > div > header {
    justify-content: space-between !important;
    gap: 0.75rem;
    padding-left: max(0.75rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
  }
  #app-content {
    padding-top: 1.25rem;
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
  }
  #btn-menu,
  #btn-cerrar-menu {
    display: none;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border: 0;
    border-radius: 0.75rem;
    background: transparent;
    color: #334155;
    cursor: pointer;
  }
  #btn-menu:hover,
  #btn-cerrar-menu:hover {
    background: #f8fafc;
  }
  a:focus-visible,
  button:focus-visible,
  select:focus-visible,
  summary:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
  .paso-etiqueta { display: none; }
  ol[aria-label="Progreso de la reserva"] > li.h-px { width: 1rem; }
  #mapa-asientos {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
  @media (max-width: 767px) {
    #btn-menu,
    #btn-cerrar-menu { display: inline-flex; }
    #menu-lateral {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 40;
      width: min(18rem, calc(100vw - 3rem));
      transform: translateX(-105%);
      transition: transform 200ms ease;
      padding-top: max(1.25rem, env(safe-area-inset-top));
      padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
    }
    body.menu-abierto #menu-lateral { transform: translateX(0); }
    body.menu-abierto #app-content { overflow: hidden; }
    #velo-menu {
      position: fixed;
      inset: 0;
      z-index: 30;
      border: 0;
      padding: 0;
      background: rgba(15, 23, 42, 0.45);
      cursor: pointer;
    }
    #velo-menu[hidden] { display: none !important; }
  }
  @media (min-width: 640px) {
    .paso-etiqueta { display: inline; }
    ol[aria-label="Progreso de la reserva"] > li.h-px { width: 2.5rem; }
  }
  @media (min-width: 768px) {
    body > div > div > header { justify-content: flex-end !important; }
    #app-content {
      padding-top: 1.5rem;
      padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
      padding-left: max(2rem, env(safe-area-inset-left));
      padding-right: max(2rem, env(safe-area-inset-right));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    #menu-lateral { transition: none; }
  }
`;
document.head.appendChild(estiloMenu);

const prepararMenu = () => {
  const lateral = document.querySelector('aside');
  const barra = document.querySelector('body > div > div > header');
  if (!lateral || !barra || lateral.dataset.menuListo) {
    return;
  }
  lateral.id = 'menu-lateral';
  lateral.dataset.menuListo = '1';

  const icono = (d) => `<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;

  const abrirMenu = document.createElement('button');
  abrirMenu.id = 'btn-menu';
  abrirMenu.type = 'button';
  abrirMenu.setAttribute('aria-controls', 'menu-lateral');
  abrirMenu.setAttribute('aria-expanded', 'false');
  abrirMenu.setAttribute('aria-label', 'Abrir menú');
  abrirMenu.innerHTML = icono('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5');
  barra.prepend(abrirMenu);

  const cerrarMenu = document.createElement('button');
  cerrarMenu.id = 'btn-cerrar-menu';
  cerrarMenu.type = 'button';
  cerrarMenu.setAttribute('aria-label', 'Cerrar menú');
  cerrarMenu.innerHTML = icono('M6 18 18 6M6 6l12 12');
  const filaCerrar = document.createElement('div');
  filaCerrar.className = 'flex justify-end';
  filaCerrar.appendChild(cerrarMenu);
  lateral.prepend(filaCerrar);

  const velo = document.createElement('button');
  velo.id = 'velo-menu';
  velo.type = 'button';
  velo.hidden = true;
  velo.setAttribute('aria-label', 'Cerrar menú');
  lateral.insertAdjacentElement('afterend', velo);

  const consulta = window.matchMedia('(max-width: 767px)');
  const estaAbierto = () => document.body.classList.contains('menu-abierto');

  const cerrar = () => {
    document.body.classList.remove('menu-abierto');
    abrirMenu.setAttribute('aria-expanded', 'false');
    abrirMenu.setAttribute('aria-label', 'Abrir menú');
    velo.hidden = true;
  };

  const abrir = () => {
    if (!consulta.matches) {
      return;
    }
    document.body.classList.add('menu-abierto');
    abrirMenu.setAttribute('aria-expanded', 'true');
    abrirMenu.setAttribute('aria-label', 'Cerrar menú');
    velo.hidden = false;
    cerrarMenu.focus();
  };

  abrirMenu.addEventListener('click', () => {
    if (estaAbierto()) {
      cerrar();
    } else {
      abrir();
    }
  });
  cerrarMenu.addEventListener('click', () => {
    cerrar();
    abrirMenu.focus();
  });
  velo.addEventListener('click', () => {
    cerrar();
    abrirMenu.focus();
  });
  lateral.querySelectorAll('a').forEach((enlace) => {
    enlace.addEventListener('click', cerrar);
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && estaAbierto()) {
      cerrar();
      abrirMenu.focus();
    }
  });
  consulta.addEventListener('change', (evento) => {
    if (!evento.matches) {
      cerrar();
    }
  });
};

const prepararPasos = () => {
  document.querySelectorAll('ol[aria-label="Progreso de la reserva"] > li').forEach((paso) => {
    [...paso.childNodes].forEach((nodo) => {
      if (nodo.nodeType !== Node.TEXT_NODE || !nodo.textContent.trim()) {
        return;
      }
      const etiqueta = document.createElement('span');
      etiqueta.className = 'paso-etiqueta';
      etiqueta.textContent = nodo.textContent.trim();
      nodo.replaceWith(etiqueta);
    });
  });
};

prepararMenu();
prepararPasos();
