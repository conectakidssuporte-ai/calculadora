/**
 * Motor da calculadora: regras das contas, sem nada de tela.
 *
 * Cada tecla gera um estado novo a partir do anterior (função pura), o que
 * deixa tudo fácil de testar. Não usa eval: a expressão é calculada aqui,
 * com multiplicação e divisão antes de soma e subtração.
 *
 * Os números ficam guardados com ponto decimal ("12.5"); a vírgula é só
 * de exibição (ver formatar).
 */

export const MAX_DIGITOS = 15;
export const MAX_HISTORICO = 20;

const OPERADORES = ['+', '-', '*', '/'];
const PRECEDENCIA = { '+': 1, '-': 1, '*': 2, '/': 2 };

export function estadoInicial(historico = []) {
  return {
    tokens: [],          // números e operadores já digitados: ['12', '+', '3']
    atual: '0',          // número sendo digitado ('' logo depois de um operador)
    acabouDeCalcular: false,
    erro: null,
    historico,           // [{ expressao: ['12', '+', '3'], resultado: '15' }]
  };
}

/** Deixa o resultado limpo: 0.1 + 0.2 vira 0.3, -0 vira 0. */
export function arredondar(valor) {
  if (!Number.isFinite(valor)) {
    return valor;
  }
  const limpo = Number(valor.toPrecision(12));
  return Object.is(limpo, -0) ? 0 : limpo;
}

/** Número (ou texto numérico) para o texto guardado no estado. */
export function paraTexto(valor) {
  const n = arredondar(Number(valor));
  if (Math.abs(n) >= 1e21 || (n !== 0 && Math.abs(n) < 1e-7)) {
    return n.toExponential().replace('e+', 'e');
  }
  return String(n);
}

/**
 * Calcula uma lista de tokens. Devolve { valor } ou { erro }.
 */
export function calcular(tokens) {
  const saida = [];
  const pilha = [];
  for (const t of tokens) {
    if (OPERADORES.includes(t)) {
      while (pilha.length && PRECEDENCIA[pilha[pilha.length - 1]] >= PRECEDENCIA[t]) {
        saida.push(pilha.pop());
      }
      pilha.push(t);
    } else {
      saida.push(Number(t));
    }
  }
  while (pilha.length) {
    saida.push(pilha.pop());
  }

  const valores = [];
  for (const t of saida) {
    if (typeof t === 'number') {
      valores.push(t);
      continue;
    }
    const b = valores.pop();
    const a = valores.pop();
    if (a === undefined || b === undefined) {
      return { erro: 'Conta incompleta' };
    }
    if (t === '/' && b === 0) {
      return { erro: 'Não dá para dividir por zero' };
    }
    valores.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b);
  }
  const valor = arredondar(valores[0] ?? 0);
  if (!Number.isFinite(valor)) {
    return { erro: 'Número grande demais' };
  }
  return { valor };
}

function ultimoOperador(tokens) {
  const t = tokens[tokens.length - 1];
  return OPERADORES.includes(t) ? t : null;
}

function digitosDe(texto) {
  return texto.replace(/[^0-9]/g, '').length;
}

/**
 * Aplica uma tecla e devolve o estado novo.
 * Teclas: '0'-'9', '.', '+', '-', '*', '/', '=', '%', '±', 'C', 'CE', '⌫'.
 */
export function aplicar(estado, tecla) {
  // depois de um erro, qualquer tecla recomeça (o histórico fica)
  const e = estado.erro ? estadoInicial(estado.historico) : { ...estado, tokens: [...estado.tokens] };

  if (/^[0-9]$/.test(tecla)) {
    if (e.acabouDeCalcular) {
      return { ...estadoInicial(e.historico), atual: tecla };
    }
    if (digitosDe(e.atual) >= MAX_DIGITOS) {
      return e;
    }
    e.atual = e.atual === '0' ? tecla : e.atual === '-0' ? '-' + tecla : e.atual + tecla;
    return e;
  }

  switch (tecla) {
    case '.':
      if (e.acabouDeCalcular) {
        return { ...estadoInicial(e.historico), atual: '0.' };
      }
      if (e.atual.includes('e')) {
        return e;
      }
      if (!e.atual.includes('.')) {
        e.atual = (e.atual === '' ? '0' : e.atual) + '.';
      }
      return e;

    case '+':
    case '-':
    case '*':
    case '/':
      if (e.acabouDeCalcular) {
        e.tokens = [e.atual];
        e.acabouDeCalcular = false;
      } else if (e.atual === '') {
        // trocou de ideia: troca o operador
        if (ultimoOperador(e.tokens)) {
          e.tokens[e.tokens.length - 1] = tecla;
        }
        return e;
      } else {
        e.tokens.push(paraTexto(e.atual));
      }
      e.tokens.push(tecla);
      e.atual = '';
      return e;

    case '=': {
      if (e.acabouDeCalcular) {
        return e;
      }
      const tokens = [...e.tokens];
      if (e.atual === '') {
        if (ultimoOperador(tokens)) {
          tokens.pop();
        }
      } else {
        tokens.push(paraTexto(e.atual));
      }
      if (tokens.length < 3) {
        return e;
      }
      const r = calcular(tokens);
      if (r.erro) {
        return { ...estadoInicial(e.historico), erro: r.erro };
      }
      const resultado = paraTexto(r.valor);
      const historico = [{ expressao: tokens, resultado }, ...e.historico].slice(0, MAX_HISTORICO);
      return { tokens: [], atual: resultado, acabouDeCalcular: true, erro: null, historico, ultimaExpressao: tokens };
    }

    case '%': {
      if (e.atual === '') {
        return e;
      }
      const n = Number(e.atual);
      const op = ultimoOperador(e.tokens);
      // 200 + 10% = 220 (10% de 200); 200 × 10% = 20
      if (op === '+' || op === '-') {
        const base = calcular(e.tokens.slice(0, -1));
        e.atual = paraTexto(base.erro ? n / 100 : (base.valor * n) / 100);
      } else {
        e.atual = paraTexto(n / 100);
      }
      e.acabouDeCalcular = false;
      return e;
    }

    case '±':
      if (e.atual === '' || e.atual === '0') {
        return e;
      }
      e.atual = e.atual.startsWith('-') ? e.atual.slice(1) : '-' + e.atual;
      e.acabouDeCalcular = false;
      return e;

    case '⌫':
      if (e.acabouDeCalcular) {
        return e;
      }
      if (e.atual === '' ) {
        return e;
      }
      e.atual = e.atual.slice(0, -1);
      if (e.atual === '' || e.atual === '-') {
        e.atual = '0';
      }
      return e;

    case 'CE':
      e.atual = '0';
      e.acabouDeCalcular = false;
      return e;

    case 'C':
      return estadoInicial(e.historico);

    default:
      return e;
  }
}

/** Reabre um resultado do histórico como número atual. */
export function usarResultado(estado, resultado) {
  return { ...estadoInicial(estado.historico), atual: resultado, acabouDeCalcular: true };
}

/** Texto do estado para a tela, no formato brasileiro: 1.234.567,89 */
export function formatar(texto) {
  if (texto === '' || texto == null) {
    return '';
  }
  if (texto.includes('e')) {
    const [base, exp] = texto.split('e');
    return formatar(base) + ' × 10^' + Number(exp);
  }
  const negativo = texto.startsWith('-');
  const [inteiro, decimal] = (negativo ? texto.slice(1) : texto).split('.');
  const comPontos = (inteiro || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negativo ? '−' : '') + comPontos + (decimal !== undefined ? ',' + decimal : '');
}

const SIMBOLOS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** Expressão para a linha de cima da tela: "1.200 + 15 ×" */
export function formatarExpressao(tokens) {
  return tokens.map((t) => SIMBOLOS[t] ?? formatar(t)).join(' ');
}
