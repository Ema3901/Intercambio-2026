/* Utilidades compartidas: nieve, luces, llamadas a la API, toast y modal. */
(function () {
  'use strict';

  /* ---------------- Nieve ---------------- */
  function iniciarNieve() {
    const canvas = document.getElementById('nieve');
    if (!canvas) return;
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    let w, h, copos = [];

    function ajustar() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const cantidad = Math.min(160, Math.floor(w / 9));
      copos = Array.from({ length: cantidad }, crearCopo);
    }
    function crearCopo() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.6 + .8,
        v: Math.random() * .8 + .35,
        o: Math.random() * Math.PI * 2,
        a: Math.random() * .5 + .4
      };
    }
    function dibujar() {
      ctx.clearRect(0, 0, w, h);
      for (const c of copos) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,' + c.a + ')';
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reducir) {
          c.y += c.v;
          c.o += 0.01;
          c.x += Math.sin(c.o) * .4;
          if (c.y > h + 5) { c.y = -5; c.x = Math.random() * w; }
        }
      }
      if (!reducir) requestAnimationFrame(dibujar);
    }
    window.addEventListener('resize', ajustar);
    ajustar();
    dibujar();
  }

  /* ---------------- Luces ---------------- */
  function iniciarLuces() {
    const cont = document.querySelector('.luces');
    if (!cont) return;
    const colores = ['#ff3b3b', '#ffd23b', '#3bff7a', '#3bb7ff', '#ff7af0'];
    const n = Math.max(10, Math.floor(window.innerWidth / 48));
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.style.setProperty('--c', colores[i % colores.length]);
      s.style.setProperty('--d', (Math.random() * 1.6).toFixed(2) + 's');
      cont.appendChild(s);
    }
  }

  /* ---------------- API ---------------- */
  async function api(action, payload) {
    const url = window.APP_CONFIG && window.APP_CONFIG.API_URL;
    if (!url || url.indexOf('http') !== 0) {
      throw new Error('Falta configurar la URL de la API en config.js');
    }
    // text/plain evita la peticion "preflight" CORS que Apps Script no soporta.
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
      redirect: 'follow'
    });
    if (!resp.ok) throw new Error('Error de red (' + resp.status + ')');
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Ocurrio un error inesperado.');
    return data;
  }

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(mensaje, tipo) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    const icono = tipo === 'error' ? 'error' : 'check_circle';
    el.className = tipo === 'error' ? 'error' : '';
    el.innerHTML = '<span class="material-symbols-rounded">' + icono + '</span><span></span>';
    el.lastChild.textContent = mensaje;
    requestAnimationFrame(function () { el.classList.add('visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('visible'); }, 4200);
  }

  /* ---------------- Modal de confirmacion ---------------- */
  function confirmar(opciones) {
    return new Promise(function (resolve) {
      const fondo = document.createElement('div');
      fondo.className = 'modal-fondo';
      fondo.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
          '<span class="material-symbols-rounded grande"></span>' +
          '<h3></h3><p></p>' +
          '<div class="acciones" style="margin-top:0">' +
            '<button class="btn btn-secundario" data-r="0">Cancelar</button>' +
            '<button class="btn btn-primario" data-r="1"></button>' +
          '</div>' +
        '</div>';
      fondo.querySelector('.grande').textContent = opciones.icono || 'help';
      fondo.querySelector('h3').textContent = opciones.titulo || 'Confirmar';
      fondo.querySelector('p').textContent = opciones.mensaje || '';
      fondo.querySelector('[data-r="1"]').textContent = opciones.aceptar || 'Aceptar';
      function cerrar(r) { fondo.remove(); resolve(r); }
      fondo.addEventListener('click', function (e) {
        if (e.target === fondo) return cerrar(false);
        const b = e.target.closest('[data-r]');
        if (b) cerrar(b.dataset.r === '1');
      });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); cerrar(false); }
      });
      document.body.appendChild(fondo);
      fondo.querySelector('[data-r="1"]').focus();
    });
  }

  /* ---------------- Boton con estado de carga ---------------- */
  function cargando(boton, activo, texto) {
    if (activo) {
      boton.dataset.html = boton.innerHTML;
      boton.disabled = true;
      boton.innerHTML = '<span class="material-symbols-rounded girar">progress_activity</span> ' + (texto || 'Cargando...');
    } else {
      boton.disabled = false;
      if (boton.dataset.html) boton.innerHTML = boton.dataset.html;
    }
  }

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.Navidad = { api: api, toast: toast, confirmar: confirmar, cargando: cargando, escapar: escapar };

  document.addEventListener('DOMContentLoaded', function () {
    iniciarNieve();
    iniciarLuces();
  });
})();
