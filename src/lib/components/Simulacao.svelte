<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ALTURAS_SIMULACAO,
		arquivoBibliotecaSimulacao,
		BIBLIOTECAS_SIMULACAO,
			ehBibliotecaSimulacao,
		exemploBibliotecaSimulacao,
		type BlocoSimulacao
	} from '$lib/blocks';
	import Campo from './ui/Campo.svelte';
	import { ROTULO_EDITAR, ROTULO_VISUALIZAR } from '$lib/conteudo';

	type Modo = 'editar' | 'visualizar';

	type Props = {
		bloco: BlocoSimulacao;
		modo?: Modo;
		/** Só no editor: o canvas passa o que muda no bloco. */
		aoAlterar?: (parcial: Partial<BlocoSimulacao>) => void;
	};

	let { bloco, modo = 'visualizar', aoAlterar }: Props = $props();

	let moldura = $state<HTMLIFrameElement | undefined>();
	let erro = $state('');
	let montado = $state(false);
	/**
	 * Chave da `{#key}`: recriar o documento da iframe é o que permite rodar o código
	 * de novo. p5 e q5 criam a instância uma única vez por `window` e não reinstanciam
	 * (`p5.instance`/`Q5._hasGlobal`), então recarregar o código significa documento
	 * novo — a biblioteca continua vindo do cache do HTTP, não da rede.
	 */
	let geracao = $state(0);
	/**
	 * Alterna, dentro do bloco, entre a edição e a mesma visão que o aluno recebe
	 * (a própria leitura, sem código e sem configurações). É o que deixa o professor
	 * conferir a apresentação final sem sair do editor nem usar o "Visualizar" da
	 * página, que joga fora a edição de todos os blocos.
	 */
	let modoFinal = $state(false);

	/** No editor o bloco tem duas faces; `aoAlterar` é o que diz que ele está em edição. */
	const editando = $derived(modo === 'editar' && !!aoAlterar && !modoFinal);
	const dentroDoEditor = $derived(modo === 'editar' && !!aoAlterar);

	// Espera um pouco depois da última tecla: cada pausa recria a moldura, e recriar
	// a cada caractere recarregaria a lib (~1 MB no p5) sem parar.
	const ESPERA_DIGITACAO = 700;

	onMount(() => {
		montado = true;
	});

	// Reexecuta quando biblioteca ou código mudam. Fora do editor não há digitação,
	// então a espera é zero: a simulação do aluno abre rodando. A espera olha
	// `aoAlterar` (estável) e não `editando` para o toggle não disparar um segundo
	// ciclo — trocar de face já recria a moldura.
	$effect(() => {
		const biblioteca = bloco.biblioteca;
		const codigo = bloco.codigo;
		if (!montado) return;
		erro = '';
		const id = setTimeout(() => (geracao += 1), aoAlterar ? ESPERA_DIGITACAO : 0);
		return () => clearTimeout(id);
	});

	function aoCarregar() {
		if (!moldura?.contentWindow) return;
		moldura.contentWindow.postMessage(
			{
				origem: 'simulacao',
				tipo: 'rodar',
				biblioteca: bloco.biblioteca,
				arquivo: arquivoBibliotecaSimulacao(bloco.biblioteca),
				codigo: bloco.codigo,
				fundo: corDeFundo()
			},
			'*'
		);
	}

	function aoMensagem(evento: MessageEvent) {
		const dados = evento.data;
		if (!dados || dados.origem !== 'simulacao') return;
		// Só o erro volta: o bloco já mostra a visualização rodando, então um aviso
		// de "rodando" seria um retângulo sobre o canvas sem informação nenhuma.
		if (dados.tipo === 'erro') {
			erro = dados.mensagem || 'Erro desconhecido na simulação.';
		}
	}

	// A iframe tem origem opaca: não vê `--b1` nem o tema do app, então a cor de
	// fundo vai por mensagem (o canvas do p5/q5 nasce transparente).
	function corDeFundo(): string {
		if (typeof document === 'undefined') return '#ffffff';
		return getComputedStyle(document.body).backgroundColor || '#ffffff';
	}

	function trocarBiblioteca(valor: string) {
		if (!ehBibliotecaSimulacao(valor)) return;
		// Código ainda no exemplo da biblioteca anterior: troca junto, senão o professor
		// fica com um rascunho de p5 rodando em q5. Código já editado é do professor.
		const exemploAtual = exemploBibliotecaSimulacao(bloco.biblioteca);
		const codigo =
			bloco.codigo === exemploAtual ? exemploBibliotecaSimulacao(valor) : bloco.codigo;
		aoAlterar?.({ biblioteca: valor, codigo });
	}

	function mudarAltura(valor: string) {
		const digitado = Number(valor);
		if (valor.trim() === '' || !Number.isFinite(digitado)) return;
		// Limita em vez de recusar: com 1200 digitado o campo volta para 900, em vez
		// de deixar o número na tela e o bloco com a altura antiga.
		const altura = Math.min(
			ALTURAS_SIMULACAO.maxima,
			Math.max(ALTURAS_SIMULACAO.minima, Math.round(digitado))
		);
		aoAlterar?.({ altura });
	}

	// O `srcdoc` monta o documento da iframe. O código do professor chega por
	// `postMessage` (nunca embutido aqui): assim a tag de script do professor nunca
	// precisa ser escapada dentro deste arquivo, e o bootstrap é o mesmo string para
	// todo bloco.
	const CASCA = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; }
  /* Rede de segurança do tamanho: o \`resizeCanvas\` do bootstrap já deixa o buffer do
     canvas do tamanho da caixa (é o que mantém o desenho nítido), e isto cobre o
     instante entre a moldura aparecer e a primeira instância existir. Os !important
     são obrigatórios: p5 e q5 escrevem style.width/style.height inline no
     createCanvas, e inline normal ganha da regra do author. */
  canvas { display: block !important; width: 100% !important; height: 100% !important; }
</style>
</head>
<body>
<script>
(function () {
  // p5 e q5 tocam o armazenamento no start-up — o q5 monta \`storeItem\`/\`getItem\` no
  // construtor e o p5 sonda o \`localStorage\` para o i18next — e o **getter** de
  // \`localStorage\` LANÇA em documento sandboxed sem \`allow-same-origin\`. Sem isto a
  // simulação morre no primeiro frame com "Window.localStorage getter: Forbidden…".
  // A origem opaca é de propósito (o código do aluno não alcança a sessão nem o storage
  // do app), então a resposta é um dublê em memória: a moldura é recriada a cada
  // execução e não há nada a persistir.
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

  function avisar(mensagem) {
    parent.postMessage({ origem: 'simulacao', tipo: 'erro', mensagem: String(mensagem) }, '*');
  }
  window.addEventListener('error', function (evento) {
    avisar(evento.message || evento.error || 'Erro na simulação.');
  });
  window.addEventListener('unhandledrejection', function (evento) {
    avisar(evento.reason && evento.reason.message ? evento.reason.message : evento.reason);
  });

  window.addEventListener('message', function (evento) {
    var dados = evento.data;
    if (!dados || dados.origem !== 'simulacao' || dados.tipo !== 'rodar') return;
    if (dados.fundo) document.body.style.background = dados.fundo;

    // O código entra ANTES da biblioteca: as duas libs procuram \`setup\`/\`draw\`
    // no \`window\` para começar em modo global, e o script injetado (não \`eval\`)
    // é o que cria essas funções no escopo global.
    try {
      var codigo = document.createElement('script');
      codigo.textContent = dados.codigo;
      document.body.appendChild(codigo);
    } catch (erro) {
      avisar(erro && erro.message ? erro.message : erro);
      return;
    }

    var lib = document.createElement('script');
    lib.src = '/lib/' + dados.arquivo;
    lib.onerror = function () {
      avisar('Não foi possível carregar a biblioteca ' + dados.biblioteca + '.');
    };
    lib.onload = function () {
      // Rede de segurança: as duas libs já se instanciam sozinhas quando encontram
      // \`setup\`/\`draw\`. Se a versão instalada não fizer isso, o bloco fica em
      // branco sem aviso nenhum — daí instanciar aqui quando falta instância.
      try {
        if (dados.biblioteca === 'p5') {
          if (window.p5 && !window.p5.instance) new window.p5();
        } else if (window.q5 && !window.q5._hasGlobal) {
          new window.q5('auto');
        }
      } catch (erro) {
        avisar(erro && erro.message ? erro.message : erro);
      }
    };
    document.head.appendChild(lib);

    // O canvas é do tamanho da CAIXA, não do código: sem isto, um
    // \`createCanvas(420, 260)\` fixo continuava 420 px e o CSS só esticava a
    // imagem — é o upscale que deixava o desenho desfocado na visão final (e a
    // largura maior da tela só melhorava por acaso). Redimensionando o buffer, a
    // simulação sai nítida em qualquer largura e o desenho acompanha a caixa, o que
    // faz a prévia do professor e a tela do aluno serem o mesmo desenho.
    ajustar(dados);
    var tentativas = 0;
    var espera = setInterval(function () {
      // As duas libs só se instanciam depois do script carregar (em Promise/setTimeout),
      // então a primeira tentativa logo após o append quase sempre ainda não acha a
      // instância; o polling cobre essa corrida.
      if (ajustar(dados) || tentativas > 60) {
        clearInterval(espera);
        return;
      }
      tentativas += 1;
    }, 50);
    window.addEventListener('resize', function () {
      ajustar(dados);
    });
  });

  /** Devolve \`true\` quando a instância existe e o canvas já está do tamanho da caixa. */
  function ajustar(dados) {
    try {
      var instancia = null;
      if (dados.biblioteca === 'p5') {
        instancia = window.p5 ? window.p5.instance : null;
      } else if (window.q5 && window.q5._hasGlobal) {
        instancia = window.q5.instances[0];
      }
      if (!instancia || typeof instancia.resizeCanvas !== 'function') return false;

      var largura = Math.round(window.innerWidth);
      var altura = Math.round(window.innerHeight);
      if (instancia.width === largura && instancia.height === altura) return true;
      instancia.resizeCanvas(largura, altura);
      return true;
    } catch (erro) {
      // Sketch sem canvas é caso do professor, não erro de carregamento: não polui o
      // bloco com alerta, só para de tentar.
      return true;
    }
  }
})();
<\/script>
</body>
</html>`;
</script>

<svelte:window onmessage={aoMensagem} />

<div class="space-y-3">
	{#if dentroDoEditor}
		<!-- Mesmo `join` do seletor de modo da página (grupos de 2 botões com
		     `aria-pressed`), aqui escopado no bloco. "Visualização" mostra a face do
		     aluno: a mesma leitura, sem código e sem configurações. -->
		<div class="flex justify-end">
			<div class="join" role="group" aria-label="Modo da simulação">
				<button
					class:btn-primary={!modoFinal}
					class="btn btn-xs"
					type="button"
					aria-pressed={!modoFinal}
					onclick={() => (modoFinal = false)}
				>
					{ROTULO_EDITAR}
				</button>
				<button
					class:btn-primary={modoFinal}
					class="btn btn-xs"
					type="button"
					aria-pressed={modoFinal}
					onclick={() => (modoFinal = true)}
				>
					{ROTULO_VISUALIZAR}
				</button>
			</div>
		</div>
	{/if}

	{#if editando}
		<!-- Código e visualização lado a lado, ambos no topo da linha; as
		     configurações ficam numa linha só abaixo. `items-start` impede a caixa
		     da visualização de esticar até a altura do `textarea`. -->
		<div class="grid gap-3 lg:grid-cols-2 items-start">
			<Campo
				rotulo="Código"
				id={`codigo-simulacao-${bloco.id}`}
				dica={`${bloco.biblioteca} · o canvas segue o tamanho da caixa`}
			>
				<textarea
					id={`codigo-simulacao-${bloco.id}`}
					class="textarea textarea-bordered h-72 w-full font-mono text-xs leading-relaxed"
					spellcheck="false"
					aria-label="Código da simulação"
					value={bloco.codigo}
					oninput={(event) => aoAlterar?.({ codigo: event.currentTarget.value })}
				></textarea>
			</Campo>

			<!-- A visualização ganha a mesma linha de rótulo do código para os dois
			     contêineres começarem na mesma altura (sem ela, a caixa encosta no
			     topo do bloco e o `textarea`, que tem rótulo acima, desce). O `id`
			     é o da própria `iframe`: `<label for>` em vez de `<span>` deixa as
			     duas linhas de rótulo com a mesma altura (3 px de diferença vinham
			     daí) e, de brinde, clicar no rótulo foca a moldura. -->
			<Campo rotulo="Visualização" id={`previa-simulacao-${bloco.id}`} dica="roda no navegador">
				<div
					class="rounded-box border border-base-300 bg-base-100 overflow-hidden"
					style={`height: ${bloco.altura}px`}
					data-simulacao-preview
				>
					{#key geracao}
						<iframe
							bind:this={moldura}
							id={`previa-simulacao-${bloco.id}`}
							class="h-full w-full border-0"
							title="Prévia da simulação"
							sandbox="allow-scripts"
							referrerpolicy="no-referrer"
							srcdoc={CASCA}
							onload={aoCarregar}
						></iframe>
					{/key}
				</div>
			</Campo>
		</div>

		<div class="flex flex-wrap gap-2">
			<Campo rotulo="Biblioteca" id={`biblioteca-${bloco.id}`} class="flex-1 min-w-32">
				<select
					id={`biblioteca-${bloco.id}`}
					class="select select-bordered select-sm w-full"
					value={bloco.biblioteca}
					onchange={(event) => trocarBiblioteca(event.currentTarget.value)}
				>
					{#each BIBLIOTECAS_SIMULACAO as biblioteca (biblioteca.valor)}
						<option value={biblioteca.valor}>{biblioteca.rotulo}</option>
					{/each}
				</select>
			</Campo>
			<Campo rotulo="Altura" id={`altura-${bloco.id}`} class="w-28">
				<input
					id={`altura-${bloco.id}`}
					type="number"
					class="input input-bordered input-sm w-full"
					min={ALTURAS_SIMULACAO.minima}
					max={ALTURAS_SIMULACAO.maxima}
					step="20"
					value={bloco.altura}
					oninput={(event) => mudarAltura(event.currentTarget.value)}
				/>
			</Campo>
			<div class="flex items-end">
				<button
					type="button"
					class="btn btn-sm btn-outline"
					onclick={() => (geracao += 1)}
				>
					Rodar
				</button>
			</div>
		</div>
	{:else}
		<div
			class="rounded-box border border-base-300 bg-base-100 overflow-hidden"
			style={`height: ${bloco.altura}px`}
			data-simulacao
		>
			{#key geracao}
				<iframe
					bind:this={moldura}
					class="h-full w-full border-0"
					title="Simulação interativa"
					sandbox="allow-scripts"
					referrerpolicy="no-referrer"
					srcdoc={CASCA}
					onload={aoCarregar}
				></iframe>
			{/key}
		</div>
		<div class="flex justify-end">
			<button
				type="button"
				class="btn btn-xs btn-ghost no-print"
				onclick={() => (geracao += 1)}
			>
				Reiniciar simulação
			</button>
		</div>
	{/if}

	{#if erro}
		<div class="alert alert-error text-sm py-2" data-simulacao-erro>
			<span class="font-mono text-xs break-all">{erro}</span>
		</div>
	{/if}
</div>