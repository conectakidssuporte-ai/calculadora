import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicar, estadoInicial, calcular, formatar, formatarExpressao, usarResultado, MAX_DIGITOS, MAX_HISTORICO } from '../src/motor.js';

/** Digita uma sequência de teclas separadas por espaço e devolve o estado. */
function digitar(sequencia, inicio = estadoInicial()) {
  return sequencia.split(' ').reduce(aplicar, inicio);
}

test('soma, subtração, multiplicação e divisão', () => {
  assert.equal(digitar('1 2 + 3 =').atual, '15');
  assert.equal(digitar('1 0 - 2 5 =').atual, '-15');
  assert.equal(digitar('6 * 7 =').atual, '42');
  assert.equal(digitar('1 / 4 =').atual, '0.25');
});

test('multiplicação e divisão vêm antes de soma e subtração', () => {
  assert.equal(digitar('2 + 3 * 4 =').atual, '14');
  assert.equal(digitar('1 0 - 6 / 2 =').atual, '7');
  assert.equal(digitar('2 * 3 + 4 * 5 =').atual, '26');
});

test('sem erro de arredondamento do computador', () => {
  assert.equal(digitar('0 . 1 + 0 . 2 =').atual, '0.3');
  assert.equal(digitar('1 / 3 * 3 =').atual, '1');
  assert.equal(digitar('1 . 1 * 1 . 1 =').atual, '1.21');
});

test('dividir por zero mostra aviso e a próxima tecla recomeça', () => {
  const e = digitar('5 / 0 =');
  assert.equal(e.erro, 'Não dá para dividir por zero');
  assert.equal(aplicar(e, '7').atual, '7');
  assert.equal(aplicar(e, '7').erro, null);
});

test('trocar de operador substitui o anterior', () => {
  const e = digitar('8 + * 2 =');
  assert.equal(e.atual, '16');
});

test('igual com operador sobrando ignora o operador', () => {
  assert.equal(digitar('8 + 2 * =').atual, '10');
});

test('continuar a conta a partir do resultado', () => {
  assert.equal(digitar('2 + 3 = * 4 =').atual, '20');
});

test('número novo depois do resultado começa outra conta', () => {
  const e = digitar('2 + 3 = 7');
  assert.equal(e.atual, '7');
  assert.deepEqual(e.tokens, []);
});

test('vírgula decimal só uma vez', () => {
  assert.equal(digitar('1 . . 5').atual, '1.5');
  assert.equal(digitar('. 5').atual, '0.5');
  assert.equal(digitar('2 + .').atual, '0.');
});

test('porcentagem', () => {
  assert.equal(digitar('2 0 0 + 1 0 % =').atual, '220');
  assert.equal(digitar('2 0 0 - 1 0 % =').atual, '180');
  assert.equal(digitar('2 0 0 * 1 0 % =').atual, '20');
  assert.equal(digitar('5 0 %').atual, '0.5');
});

test('trocar o sinal', () => {
  assert.equal(digitar('5 ±').atual, '-5');
  assert.equal(digitar('5 ± ±').atual, '5');
  assert.equal(digitar('3 + 5 ± =').atual, '-2');
  assert.equal(digitar('0 ±').atual, '0');
});

test('apagar, limpar a entrada e limpar tudo', () => {
  assert.equal(digitar('1 2 3 ⌫').atual, '12');
  assert.equal(digitar('7 ⌫').atual, '0');
  assert.equal(digitar('5 ± ⌫').atual, '0');
  const ce = digitar('9 + 8 CE');
  assert.equal(ce.atual, '0');
  assert.deepEqual(ce.tokens, ['9', '+']);
  const c = digitar('9 + 8 C');
  assert.equal(c.atual, '0');
  assert.deepEqual(c.tokens, []);
});

test('limite de dígitos', () => {
  const e = digitar(Array(MAX_DIGITOS + 3).fill('9').join(' '));
  assert.equal(e.atual.length, MAX_DIGITOS);
});

test('zero à esquerda não acumula', () => {
  assert.equal(digitar('0 0 0 7').atual, '7');
});

test('histórico guarda as contas, a mais nova primeiro, e mantém o limite', () => {
  let e = digitar('1 + 1 = 2 * 3 =');
  assert.equal(e.historico.length, 2);
  assert.deepEqual(e.historico[0], { expressao: ['2', '*', '3'], resultado: '6' });
  for (let i = 0; i < MAX_HISTORICO + 5; i++) {
    e = digitar('1 + 1 =', e);
  }
  assert.equal(e.historico.length, MAX_HISTORICO);
  assert.equal(digitar('C', e).historico.length, MAX_HISTORICO);
});

test('reusar um resultado do histórico', () => {
  const e = usarResultado(digitar('1 + 1 ='), '42');
  assert.equal(aplicar(e, '+').tokens[0], '42');
});

test('calcular aceita conta direta', () => {
  assert.deepEqual(calcular(['1', '+', '2', '*', '3']), { valor: 7 });
  assert.equal(calcular(['1', '/', '0']).erro, 'Não dá para dividir por zero');
});

test('formato brasileiro na tela', () => {
  assert.equal(formatar('1234567.89'), '1.234.567,89');
  assert.equal(formatar('-1500'), '−1.500');
  assert.equal(formatar('0.'), '0,');
  assert.equal(formatar('1e21'), '1 × 10^21');
  assert.equal(formatarExpressao(['1200', '+', '15', '*']), '1.200 + 15 ×');
});

test('números muito grandes não viram texto estranho', () => {
  const e = digitar('9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 * 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 =');
  assert.match(e.atual, /^\d(\.\d+)?e\d+$/);
});
