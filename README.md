# Calculadora

Calculadora web com histórico, uso pelo teclado e tema claro e escuro. Feita só com HTML, CSS e JavaScript, sem bibliotecas.

## O que ela faz

- As quatro operações, respeitando a ordem: `2 + 3 × 4 = 14`.
- Porcentagem do jeito que se usa no dia a dia: `200 + 10% = 220`, `200 × 10% = 20`.
- Formato brasileiro (`1.234,56`) e contas sem erro de arredondamento (`0,1 + 0,2 = 0,3`).
- Histórico das últimas 20 contas, guardado no próprio aparelho.
- Teclado do computador, botão de copiar, tema claro e escuro, tela de celular.
- Dividir por zero mostra um aviso, sem travar.

## Teclado

| Tecla | Faz |
|---|---|
| `0` a `9`, `,` ou `.` | digita |
| `+` `-` `*` `/` | operação |
| `Enter` ou `=` | resultado |
| `%` | porcentagem |
| `Backspace` | apaga o último dígito |
| `Delete` | limpa o número |
| `Esc` | limpa tudo |
| `H` | abre ou fecha o histórico |
| `Ctrl+C` | copia o resultado |

## Rodar no computador

Os arquivos usam módulos JavaScript, então precisam de um servidor local (abrir o `index.html` direto não funciona):

```bash
npx serve .
# ou
python -m http.server 8000
```

Depois abra o endereço que aparecer (por exemplo `http://localhost:8000`).

## Testes

Precisa do Node.js 20 ou mais novo. Não instala nada:

```bash
npm test
```

## Como está organizado

| Arquivo | Papel |
|---|---|
| `src/motor.js` | regras das contas, sem nada de tela; cada tecla gera um estado novo |
| `src/tela.js` | liga botões e teclado ao motor e desenha o resultado |
| `src/estilo.css` | visual; as cores dos dois temas ficam no começo do arquivo |
| `testes/motor.test.js` | testes da lógica (`node --test`) |
| `.github/workflows/publicar.yml` | testa a cada envio e publica no GitHub Pages quando passa |

A conta é calculada pelo próprio código (sem `eval`), com multiplicação e divisão antes de soma e subtração. O resultado é arredondado em 12 dígitos significativos para esconder as sobras da conta do computador.

## Publicar

1. No GitHub, em **Settings > Pages**, escolha **Source: GitHub Actions**.
2. Cada envio para a `main` roda os testes e, se passarem, publica.
3. O endereço aparece na execução da verificação e em Settings > Pages.

No plano gratuito do GitHub, o Pages só publica repositórios públicos.
