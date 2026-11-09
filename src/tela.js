/**
 * Tela da calculadora: liga botões e teclado ao motor e desenha o estado.
 * Toda regra de conta fica em motor.js.
 */
import { aplicar, estadoInicial, usarResultado, formatar, formatarExpressao } from './motor.js';

const CHAVE_HISTORICO = 'calculadora.historico';
const CHAVE_TEMA = 'calculadora.tema';

const $ = (id) => document.getElementById(id);
const visorValor = $('valor');
const visorExpressao = $('expressao');
const lista = $('lista-historico');
const vazio = $('historico-vazio');
const painel = $('historico');
const botaoAbrir = $('abrir-historico');
const botaoCopiar = $('copiar');
const botaoLimpar = $('limpar-historico');

// guardar no aparelho pode falhar (aba anônima, bloqueio): o app segue sem isso
function ler(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ }
}

function historicoGuardado() {
  try {
    const dados = JSON.parse(ler(CHAVE_HISTORICO) || '[]');
    return Array.isArray(dados) ? dados.filter((h) => Array.isArray(h.expressao) && typeof h.resultado === 'string') : [];
  } catch {
    return [];
  }
}

let estado = estadoInicial(historicoGuardado());

/* ---------- desenho ---------- */

function ajustarTamanho() {
  visorValor.style.fontSize = '';
  const base = parseFloat(getComputedStyle(visorValor).fontSize);
  const largura = visorValor.parentElement.clientWidth - 32;
  let tamanho = base;
  while (visorValor.scrollWidth > largura && tamanho > 18) {
    tamanho -= 2;
    visorValor.style.fontSize = tamanho + 'px';
  }
}

function desenharHistorico() {
  lista.replaceChildren(...estado.historico.map((h) => {
    const item = document.createElement('li');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset.resultado = h.resultado;
    const conta = document.createElement('span');
    conta.className = 'conta';
    conta.textContent = formatarExpressao(h.expressao) + ' =';
    const resultado = document.createElement('span');
    resultado.className = 'resultado';
    resultado.textContent = formatar(h.resultado);
    botao.append(conta, resultado);
    botao.setAttribute('aria-label', `${conta.textContent} ${resultado.textContent}. Usar este resultado`);
    item.append(botao);
    return item;
  }));
  const temItens = estado.historico.length > 0;
  vazio.hidden = temItens;
  botaoLimpar.hidden = !temItens;
}

let historicoAnterior = null;

function desenhar() {
  if (estado.erro) {
    visorValor.textContent = estado.erro;
    visorValor.classList.add('erro');
    visorExpressao.textContent = '';
  } else {
    visorValor.classList.remove('erro');
    visorValor.textContent = estado.atual === '' ? formatar(estado.tokens[estado.tokens.length - 2] ?? '0') : formatar(estado.atual);
    visorExpressao.textContent = estado.acabouDeCalcular && estado.ultimaExpressao
      ? formatarExpressao(estado.ultimaExpressao) + ' ='
      : formatarExpressao(estado.tokens);
    visorExpressao.scrollLeft = visorExpressao.scrollWidth;
  }
  ajustarTamanho();

  // operador escolhido fica marcado até digitar o próximo número
  const operadorAtivo = estado.atual === '' ? estado.tokens[estado.tokens.length - 1] : null;
  document.querySelectorAll('.tecla.operador').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.tecla === operadorAtivo);
  });

  if (historicoAnterior !== estado.historico) {
    historicoAnterior = estado.historico;
    gravar(CHAVE_HISTORICO, JSON.stringify(estado.historico));
    desenharHistorico();
  }
}

function pressionar(tecla) {
  estado = aplicar(estado, tecla);
  desenhar();
}

/* ---------- botões ---------- */

document.querySelector('.teclado').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-tecla]');
  if (botao) {
    pressionar(botao.dataset.tecla);
  }
});

lista.addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-resultado]');
  if (!botao) {
    return;
  }
  estado = usarResultado(estado, botao.dataset.resultado);
  desenhar();
  fecharHistorico();
});

botaoLimpar.addEventListener('click', () => {
  estado = { ...estado, historico: [] };
  desenhar();
});

/* ---------- histórico no celular ---------- */

function abrirHistorico() {
  painel.classList.add('aberto');
  botaoAbrir.setAttribute('aria-expanded', 'true');
  $('fechar-historico').focus();
}

function fecharHistorico() {
  if (!painel.classList.contains('aberto')) {
    return;
  }
  painel.classList.remove('aberto');
  botaoAbrir.setAttribute('aria-expanded', 'false');
  botaoAbrir.focus();
}

botaoAbrir.addEventListener('click', () => {
  painel.classList.contains('aberto') ? fecharHistorico() : abrirHistorico();
});
$('fechar-historico').addEventListener('click', fecharHistorico);

/* ---------- copiar ---------- */

async function copiar() {
  if (estado.erro) {
    return;
  }
  const texto = formatar(estado.atual === '' ? '0' : estado.atual).replace('−', '-');
  try {
    await navigator.clipboard.writeText(texto);
    botaoCopiar.textContent = 'Copiado';
    botaoCopiar.classList.add('copiado');
    setTimeout(() => {
      botaoCopiar.textContent = 'Copiar';
      botaoCopiar.classList.remove('copiado');
    }, 1400);
  } catch {
    botaoCopiar.textContent = 'Não deu para copiar';
  }
}

botaoCopiar.addEventListener('click', copiar);

/* ---------- tema ---------- */

function temaAtual() {
  const fixo = document.documentElement.dataset.tema;
  if (fixo) {
    return fixo;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

$('trocar-tema').addEventListener('click', () => {
  const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = novo;
  gravar(CHAVE_TEMA, novo);
});

/* ---------- teclado do computador ---------- */

const MAPA = {
  Enter: '=', '=': '=', Backspace: '⌫', Delete: 'CE', Escape: 'C',
  ',': '.', '.': '.', '+': '+', '-': '-', '*': '*', x: '*', X: '*', '/': '/', '%': '%',
};

document.addEventListener('keydown', (evento) => {
  if (evento.ctrlKey || evento.metaKey || evento.altKey) {
    if ((evento.ctrlKey || evento.metaKey) && evento.key === 'c' && !getSelection().toString()) {
      evento.preventDefault();
      copiar();
    }
    return;
  }
  if (evento.key === 'Escape' && painel.classList.contains('aberto')) {
    fecharHistorico();
    return;
  }
  if (evento.key === 'h' || evento.key === 'H') {
    painel.classList.contains('aberto') ? fecharHistorico() : abrirHistorico();
    return;
  }
  const tecla = /^[0-9]$/.test(evento.key) ? evento.key : MAPA[evento.key];
  if (!tecla) {
    return;
  }
  // dentro do histórico, Enter escolhe a conta focada; no resto, Enter dá o resultado
  if (evento.key === 'Enter' && painel.contains(document.activeElement)) {
    return;
  }
  evento.preventDefault();
  pressionar(tecla);
  const botao = document.querySelector(`.tecla[data-tecla="${CSS.escape(tecla)}"]`);
  if (botao) {
    botao.classList.add('pressionada');
    setTimeout(() => botao.classList.remove('pressionada'), 100);
  }
});

window.addEventListener('resize', ajustarTamanho);

desenhar();
