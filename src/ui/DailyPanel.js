// Desafio do Dia: janela com o ranking do dia e envio da corrida no fim.
import { $, h, icon } from './dom.js';
import { spriteCanvas } from './SpriteCanvas.js';
import { DAILY } from '../config/runs.js';
import { dayKey } from '../domain/run.js';

const fmtDay = (key) => { const [, m, d] = key.split('-'); return `${d}/${m}`; };

export class DailyPanel {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   */
  constructor(game, modals, net) {
    this.game = game;
    this.modals = modals;
    this.net = net;
    $('daily-play').addEventListener('click', () => {
      this.modals.close('modal-daily');
      this.game.go('battle', { run: DAILY.id });
    });
  }

  open() {
    const day = dayKey();
    const p = this.game.profile;
    const best = p.daily.day === day ? p.daily.best : 0;
    $('daily-sub').textContent = `${fmtDay(day)} · ${DAILY.waves} ondas · todos começam iguais, sem as melhorias da Oficina.`;
    $('daily-me').textContent = best ? `Sua melhor pontuação hoje: ${best}` : 'Você ainda não jogou o desafio de hoje.';
    $('daily-list').replaceChildren(h('li', { class: 'rank-loading' }, 'Carregando ranking...'));
    this.modals.open('modal-daily');
    this.#loadRanking(day);
  }

  async #loadRanking(day) {
    try {
      const [{ top }, me] = await Promise.all([this.net.getDaily(day), this.net.getMyDaily(day)]);
      if (!this.modals.isOpen('modal-daily')) return;
      if (me?.rank) $('daily-me').textContent += ` · ranking: ${me.rank}º de ${me.total}`;
      $('daily-list').replaceChildren(...(top.length ? top.map(r => this.#row(r)) : [h('li', { class: 'rank-loading' }, 'Ninguém jogou ainda hoje. Seja o primeiro!')]));
    } catch {
      $('daily-list').replaceChildren(h('li', { class: 'rank-loading' }, 'Ranking indisponível agora (o servidor pode estar acordando). Tente de novo em 1 minuto.'));
    }
  }

  #row(r) {
    return h('li', { class: `rank-row${r.rank <= 3 ? ` top${r.rank}` : ''}` },
      h('span', { class: 'rank-pos' }, `${r.rank}º`),
      spriteCanvas(this.game.assets, `char/${r.character}/side/idle`, { size: 48, msPerFrame: 220 }),
      h('span', { class: 'rank-name' }, r.nickname),
      icon('icon/caveira', 'ico ico-sm'),
      h('span', {}, `${r.waves} ondas`),
      h('b', { class: 'rank-score' }, r.score));
  }

  /** No fim da corrida do dia: envia sozinho e mostra a posição em `noteEl`. */
  async offerSubmit(result, noteEl) {
    const status = h('p', { class: 'daily-status' }, 'Enviando ao ranking do dia...');
    noteEl.after(status);
    try {
      const r = await this.net.submitDaily({ day: result.day, actions: result.actions });
      status.textContent = `Ranking do dia: ${r.rank}º de ${r.total} (melhor: ${r.best})`;
    } catch (err) {
      status.replaceChildren(`Não deu para enviar: ${err.message} `,
        h('button', { class: 'btn btn-sm', onclick: () => { status.remove(); this.offerSubmit(result, noteEl); } }, 'TENTAR DE NOVO'));
    }
  }
}
