import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ART_SIZE, ART_PALETTE, isValidArt, blankArt, decodeArt, encodeArt, isBlankArt } from '../src/domain/avatar.js';
import { PixelBoard } from '../src/domain/pixelArt.js';

test('avatar: formato do desenho 16x16 com um dígito hexadecimal por pixel', () => {
  assert.equal(ART_PALETTE.length, 16);
  assert.equal(ART_PALETTE[0], null); // transparente
  const art = blankArt();
  assert.equal(art.length, ART_SIZE * ART_SIZE);
  assert.ok(isValidArt(art));
  assert.ok(isBlankArt(art));
  assert.equal(isValidArt(art.slice(1)), false);
  assert.equal(isValidArt(`g${art.slice(1)}`), false);
  assert.equal(isValidArt(null), false);
  const pixels = decodeArt(art);
  pixels[17] = 15;
  assert.equal(encodeArt(pixels)[17], 'f');
});

test('prancheta: pincel, espelho e linha contínua', () => {
  const b = new PixelBoard();
  b.begin();
  assert.equal(b.paint(2, 3, 4, { mirror: true }), true);
  assert.equal(b.colorAt(2, 3), 4);
  assert.equal(b.colorAt(ART_SIZE - 3, 3), 4);
  assert.equal(b.paint(2, 3, 4), false); // já era dessa cor
  b.line(0, 0, 5, 0, 1);
  for (let x = 0; x <= 5; x++) assert.equal(b.colorAt(x, 0), 1);
  assert.equal(b.paint(-1, 0, 1), false); // fora da grade
  b.end();
  assert.ok(b.canUndo);
});

test('prancheta: balde enche só a área ligada', () => {
  const b = new PixelBoard();
  b.begin();
  for (let y = 0; y < ART_SIZE; y++) b.paint(8, y, 1); // parede no meio
  b.fill(0, 0, 6);
  b.end();
  assert.equal(b.colorAt(0, 15), 6);
  assert.equal(b.colorAt(7, 7), 6);
  assert.equal(b.colorAt(8, 7), 1);
  assert.equal(b.colorAt(9, 7), 0);
  assert.equal(b.fill(0, 0, 6), false); // mesma cor: nada a fazer
});

test('prancheta: um traço é um passo no desfazer; refazer some depois de desenhar', () => {
  const b = new PixelBoard();
  b.begin(); b.paint(1, 1, 3); b.paint(2, 1, 3); b.end();
  b.begin(); b.paint(5, 5, 7); b.end();
  b.begin(); b.end(); // clique sem mudança não entra no histórico
  assert.equal(b.undoStack.length, 2);
  assert.equal(b.undo(), true);
  assert.equal(b.colorAt(5, 5), 0);
  assert.equal(b.colorAt(1, 1), 3);
  assert.equal(b.redo(), true);
  assert.equal(b.colorAt(5, 5), 7);
  b.undo();
  b.begin(); b.paint(0, 0, 2); b.end();
  assert.equal(b.canRedo, false);
  b.clear();
  assert.ok(isBlankArt(b.art));
  b.undo();
  assert.equal(b.colorAt(0, 0), 2);
});
