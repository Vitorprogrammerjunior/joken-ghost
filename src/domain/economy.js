/** Carteira de moedas do jogador. */
export class Economy {
  constructor(coins = 0) {
    this.coins = coins;
    this.listeners = new Set();
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #emit(delta) { for (const fn of this.listeners) fn(this.coins, delta); }

  add(amount) {
    if (amount <= 0) return;
    this.coins += amount;
    this.#emit(amount);
  }

  canAfford(amount) { return this.coins >= amount; }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.coins -= amount;
    this.#emit(-amount);
    return true;
  }

  set(amount) {
    const delta = amount - this.coins;
    this.coins = amount;
    this.#emit(delta);
  }
}
