# Importação por JSON (contrato com a IA)

Este documento é o contrato entre o app **mcurso** e uma IA: cole este texto no
prompt e peça o JSON no formato abaixo para criar conteúdo por copiar/colar.
O que o app grava é exatamente o que o editor usa, então **todo conteúdo
importado é editável depois do jeito normal**.

## Como usar

1. Cole este documento no prompt, junto com o material de aula.
2. Peça: *"Monte o JSON no formato da especificação acima."*
3. Copie a resposta para a tela de importação do app (ou o editor do conteúdo).

**Regras para a IA:** devolva **somente JSON**, sem markdown em volta; o campo
`conteudo` é obrigatório; `titulo` é obrigatório (sem espaços nas pontas);
blocos desconhecidos são descartados; campos opcionais ausentes usam o padrão.

## Envelope

```jsonc
{
  "conteudo": "apostila" | "anexo" | "exercicio" | "quiz",
  "titulo": "Título",
  "descricao": "Opcional",
  // ... campos específicos abaixo
}
```

| Valor | O que cria | Observação |
|---|---|---|
| `apostila` | Apostila + seções + aulas com blocos | Aula **só existe dentro** do envelope de apostila |
| `anexo` | Material de apoio solto | Não pertence a apostila |
| `exercicio` | Atividade de exercícios solta | Gabarito fica no servidor |
| `quiz` | Quiz estilo Kahoot | Formato próprio (igual ao "Colar um JSON pronto" do editor) |

Um `bloco` já salvo pode ser exportado no mesmo formato e colado de volta
(round-trip com a IA).

## Exportação (round-trip)

A tela de importação do app tem "Carregar no editor": pega **o conteúdo inteiro**
já existente (apostila/anexo/atividade/quiz), devolve no JSON deste mesmo
contrato e preenche o campo de colar — pronto para guardar, ajustar pela IA ou
reimportar (apostila reimportada volta a criar uma nova).

Para o round-trip nunca quebrar, o exportado usa as mesmas regras do import:
**sem `id`** (nem de bloco nem de conteúdo), apostila sai com `secoes`/`aulas`
na ordem salva e **links internos saem como `alvoTitulo`** (nunca `alvoId`):
aula vira o título de uma aula da própria apostila, anexo/atividade o título do
conteúdo existente. Apostila sem aula não entra na lista de exportação (o import
exige ao menos uma).

## Blocos de conteúdo (`blocos`)

Lista de objetos. **Não inclua `id`** — o app gera. Cada bloco tem `tipo` e
seus campos:

| `tipo` | Campos | Observações |
|---|---|---|
| `titulo` | `texto`, `nivel` (1–6) | Heading real no HTML |
| `texto` | `conteudo` | **Markdown** (negrito, listas, link, `$...$` fórmulas) |
| `codigo` | `linguagem`, `codigo` | Ex.: `js`, `python`, `html` |
| `mermaid` | `diagrama`, `tema`? | `tema`: `neutral` (padrão), `default`, `forest`, `dark`, `base` |
| `imagem` | `src`, `legenda`? | `src`: **URL http/https absoluta** ou caminho `/uploads/...` |
| `link` | `rotulo`, `tipoLink`, `url`?/`alvoId`?/`alvoTitulo`? | ver "Links" abaixo |
| `tabela` | `cabecalho` (string[]), `linhas` (string[][]) — **ou** o formato canônico: `linhas` (matriz), `linhasCabecalho`, `colunasCabecalho`, `legenda`?, `zebrada`?, células avançadas `{texto, colspan?, rowspan?, th?, alinhamento?}` | Formato curto é válido (o app dobra o cabeçalho na primeira linha). Quando há mescla/legenda/colunas de cabeçalho, prefira o canônico. `alinhamento` pode ser `esquerda`, `centro` ou `direita`. |
| `formula` | `latex`, `destaque`? (boolean, padrão `true`) | KaTeX |
| `exercicio` | `pergunta`, `alternativas` (2+), `selecao`?, `correta`, `explicacao`? | ver "Exercício" abaixo |
| `dissertativa` | `pergunta`, `orientacao`? | Resposta aberta, fora da nota |
| `simulacao` | `biblioteca`? (`p5`/`q5`, padrão `p5`), `codigo`, `altura`? (120–900) | p5.js / q5.js no navegador |

### Exercício

`selecao` = `radio` (uma correta) ou `checkbox` (várias; exige o conjunto
exato). `correta` é **número** no rádio e **lista** no checkbox (índices de
`alternativas`). `explicacao` é opcional. **Nada disso vaza para o aluno**: a
página pública só manda pergunta/alternativas, e a correção acontece no
servidor.

### Links

`tipoLink`: `aula` | `anexo` | `exercicio` | `externo`.

- **`externo`**: só `url` (`http`/`https`).
- Interno (`aula`/`anexo`/`exercicio`): use **`alvoId`** (id já existente **ou**
  `alvoTitulo` (título).
  - Dentro de uma apostila, `aula→aula` resolve por título da mesma apostila
    (pode apontar para uma aula que vem depois na lista — o app cria as aulas
    em ordem e resolve os links na transação). Alternativa: `alvoOrdem`
    (posição 1-based na lista de import).
  - Para `anexo`/`exercicio`, o alvo deve **já existir** (por id ou título).
    O import de apostila **não** cria anexos/atividades.
- Link que não resolve **faz o import falhar** com mensagem clara.

### Imagem

URL absoluta válida (`http`/`https`) ou caminho já enviado a `/uploads/...`.
Imagem sem `src` não bloqueia: o bloco entra vazio e um aviso no topo informa
que ele não está cumprindo o papel (ver "Blocos incompletos").

### Blocos incompletos

Bloco tecnicamente válido mas vazio (imagem sem `src`, código sem código,
título/texto vazios, link sem alvo/url, tabela vazia…) é **mantido e gera um
aviso** no topo, visível só para o professor. Nunca impede a importação.

## Apostila

```jsonc
{
  "conteudo": "apostila",
  "titulo": "Matemática — 1º ano",
  "descricao": "Opcional",
  "secoes": [
    {
      "nome": "Funções",
      "aulas": [
        {
          "titulo": "Função afim",
          "descricao": "Opcional",
          "blocos": [ "… blocos …" ]
        }
      ]
    }
  ],
  // Ou, sem seções, direto as aulas no grupo "sem seção":
  "aulas": [ "… mesmo formato acima …" ]
}
```

- `secoes` e `aulas` são listas **ordenadas** (essa é a ordem do material).
- Nome de seção é único por apostila (ignora acento e caixa, máx. 60 chars).
- `apostila` **sempre cria uma apostila nova**; edite depois no editor.

## Anexo / Exercício

```jsonc
{
  "conteudo": "anexo",            // ou "exercicio"
  "titulo": "Tabela de derivadas",
  "descricao": "Opcional",
  "blocos": [ "… blocos …" ]
}
```

## Quiz

Formato do "Colar um JSON pronto" do editor (tolerante a apelidos): aceita um
array de perguntas ou um objeto com `perguntas`/`questions`/`questoes`, com
enunciado (`pergunta`/`enunciado`/`questao`/…), alternativas
(`alternativas`/`opcoes`/`options`/…), correta (índice, texto da alternativa ou
marca na alternativa) e `tempo` (5–120 s, padrão 20).

```jsonc
{
  "conteudo": "quiz",
  "titulo": "Revisão Kahoot",
  "descricao": "Opcional",
  "perguntas": [
    {
      "pergunta": "Quanto é 7 × 6?",
      "alternativas": ["40", "42", "48", "36"],
      "correta": 1,
      "tempo": 20
    }
  ]
}
```

Limites: 100 perguntas, alternativa máx. 160 chars, pergunta máx. 300 chars.

## Segurança e limites do import

- Tudo passa pela whitelist de blocos e pela validação de links do servidor;
  conteúdo desconhecido é descartado e link não resolvido aborta com erro.
- URLs (imagem e link externo) só `http`/`https`.
- Tetos do import (por segurança, valores a definir na implementação):
  máx. 200 aulas por apostila, máx. 200 blocos por conteúdo e JSON até 512 KB.
- Código de `simulacao` roda em iframe com `sandbox` (não alcança sessão/DOM).
- Markdown do bloco `texto` tem HTML escapado na origem e URLs seguras.