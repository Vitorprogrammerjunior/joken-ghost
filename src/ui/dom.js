// Pequenos utilitários de DOM.
import { Assets } from '../core/Assets.js';

export const $ = (id) => document.getElementById(id);

/** Cria um elemento: h('div', { class: 'x', onclick }, ...filhos). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

/** <img> de uma sprite do manifesto (ex.: 'icon/moeda'). */
export function icon(key, cls = 'ico', alt = '') {
  return h('img', { class: cls, src: Assets.url(key), alt, draggable: 'false' });
}

export const show = (el, on = true) => el.classList.toggle('hidden', !on);

/** Reinicia uma animação CSS adicionando a classe de novo. */
export function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
