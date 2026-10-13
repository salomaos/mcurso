// Bootstrap comum das iframes sandboxed de bloco (simulação e HTML). O código do
// professor nunca nasce aqui: chega por `postMessage` e vira nó de script por
// `textContent`, nunca `eval`. A origem é opaca (`sandbox="allow-scripts"` sem
// `allow-same-origin`), então o script do professor não alcança a sessão, o DOM
// nem o storage do app.
//
// Os blocos passam o `corpo` (o handler de `message` e o que ele precisa) e os
// `estilos` da própria cacneira; o resto — dublê de armazenamento e aviso de erro —
// é único, então mora aqui para os dois não divergirem.

// p5, q5 e o próprio `localStorage` do professor tocam o armazenamento, e o
// **getter** de `localStorage` LANÇA em documento sandboxed sem `allow-same-origin`
// ("Window.localStorage getter: Forbidden…"). A resposta é um dublê em memória: a
// moldura é recriada a cada execução e não há nada a persistir.
const STUB_ARMAZENAMENTO = `
  function dubleDeArmazenamento(nome) {
    var itens = {};
    var metodos = {
      getItem: function (chave) {
        return Object.prototype.hasOwnProperty.call(itens, chave) ? itens[chave] : null;
      },
      setItem: function (chave, valor) {
        itens[chave] = String(valor);
      },
      removeItem: function (chave) {
        delete itens[chave];
      },
      clear: function () {
        itens = {};
      },
      key: function (indice) {
        var chaves = Object.keys(itens);
        return chaves[indice] === undefined ? null : chaves[indice];
      }
    };
    var duble = {};
    Object.keys(metodos).forEach(function (nomeMetodo) {
      // Não enumeráveis de propósito: o \`clearStorage\` do p5 percorre
      // \`Object.keys(localStorage)\` e não deve encontrar os próprios métodos.
      Object.defineProperty(duble, nomeMetodo, { value: metodos[nomeMetodo] });
    });
    Object.defineProperty(duble, 'length', {
      get: function () {
        return Object.keys(itens).length;
      }
    });
    Object.defineProperty(window, nome, {
      configurable: true,
      get: function () {
        return duble;
      }
    });
  }
  dubleDeArmazenamento('localStorage');
  dubleDeArmazenamento('sessionStorage');
`;

// Erro de runtime no código do professor (`window.onerror`/`unhandledrejection`)
// volta como `postMessage` e vira `alert alert-error` no bloco.
function avisoDeErros(origem: string): string {
	return `
  function avisar(mensagem) {
    parent.postMessage({ origem: ${JSON.stringify(origem)}, tipo: 'erro', mensagem: String(mensagem) }, '*');
  }
  window.addEventListener('error', function (evento) {
    avisar(evento.message || evento.error || 'Erro no bloco.');
  });
  window.addEventListener('unhandledrejection', function (evento) {
    avisar(evento.reason && evento.reason.message ? evento.reason.message : evento.reason);
  });
`;
}

// Monta o documento da iframe. A base fixa `height: 100%` do body (canvas do p5
// e bloco de HTML usam a caixa cheia); quem precisar de `overflow` ou de regra
// própria controla por `estilos`.
export function cascaSandbox(opcoes: { origem: string; estilos: string; corpo: string }): string {
	const { origem, estilos, corpo } = opcoes;
	return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; height: 100%; }
${estilos}
</style>
</head>
<body>
<script>
(function () {
${STUB_ARMAZENAMENTO}
${avisoDeErros(origem)}
${corpo}
})();
</script>
</body>
</html>`;
}