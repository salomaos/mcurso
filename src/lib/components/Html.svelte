<script lang="ts">
	import { onMount } from 'svelte';
	import { ALTURAS_HTML, type BlocoHtml } from '$lib/blocks';
	import Campo from './ui/Campo.svelte';
	import { ROTULO_EDITAR, ROTULO_VISUALIZAR } from '$lib/conteudo';
	import { cascaSandbox } from '$lib/casca-sandbox';

	type Modo = 'editar' | 'visualizar';

	type Props = {
		bloco: BlocoHtml;
		modo?: Modo;
		/** Só no editor: o canvas passa o que muda no bloco. */
		aoAlterar?: (parcial: Partial<BlocoHtml>) => void;
	};

	let { bloco, modo = 'visualizar', aoAlterar }: Props = $props();

	let moldura = $state<HTMLIFrameElement | undefined>();
	let erro = $state('');
	let montado = $state(false);
	/** Chave da `{#key}`: recriar o documento é o que roda o bloco de novo. */
	let geracao = $state(0);
	/**
	 * Alterna, dentro do bloco, entre a edição e a mesma visão que o aluno recebe
	 * (a própria leitura, sem os painéis nem as configurações). É o que deixa o
	 * professor conferir a apresentação final sem sair do editor.
	 */
	let modoFinal = $state(false);

	/** No editor o bloco tem duas faces; `aoAlterar` é o que diz que ele está em edição. */
	const editando = $derived(modo === 'editar' && !!aoAlterar && !modoFinal);
	const dentroDoEditor = $derived(modo === 'editar' && !!aoAlterar);

	// Espera depois da última tecla: cada pausa recria a moldura, e recriar a cada
	// caractere perderia o foco/caret do campo sem parar.
	const ESPERA_DIGITACAO = 700;

	onMount(() => {
		montado = true;
	});

	// Roda quando qualquer um dos três painéis muda. Fora do editor não há digitação,
	// então a espera é zero: o bloco do aluno abre rodando. A espera olha `aoAlterar`
	// (estável) e não `editando` para o toggle não disparar um segundo ciclo — trocar
	// de face já recria a moldura.
	$effect(() => {
		const html = bloco.html;
		const css = bloco.css;
		const js = bloco.js;
		if (!montado) return;
		erro = '';
		const id = setTimeout(() => (geracao += 1), aoAlterar ? ESPERA_DIGITACAO : 0);
		return () => clearTimeout(id);
	});

	function aoCarregar() {
		if (!moldura?.contentWindow) return;
		moldura.contentWindow.postMessage(
			{
				origem: 'html',
				tipo: 'rodar',
				html: bloco.html,
				css: bloco.css,
				js: bloco.js,
				fundo: corDeFundo()
			},
			'*'
		);
	}

	function aoMensagem(evento: MessageEvent) {
		const dados = evento.data;
		if (!dados || dados.origem !== 'html') return;
		if (dados.tipo === 'erro') {
			erro = dados.mensagem || 'Erro desconhecido no bloco HTML.';
		}
	}

	// A iframe tem origem opaca: não vê `--b1` nem o tema do app, então a cor de
	// fundo vai por mensagem, igual à simulação.
	function corDeFundo(): string {
		if (typeof document === 'undefined') return '#ffffff';
		return getComputedStyle(document.body).backgroundColor || '#ffffff';
	}

	// Digitando, o número entra como veio: limitar a cada tecla travava em 120 já no
	// primeiro caractere (não dava para chegar em 500) e arredondar reescrevia o
	// campo no meio da digitação. As duas regras entram na saída do campo.
	function mudarAltura(valor: string) {
		const digitado = Number(valor);
		if (valor.trim() === '' || !Number.isFinite(digitado)) return;
		aoAlterar?.({ altura: digitado });
	}

	// Fora do foco: arredonda para inteiro e põe na faixa 120–900. O campo recebe o
	// número de volta porque campo vazio não muda o bloco (sem valor novo) e ficaria
	// em branco na tela.
	function limitarAltura(campo: HTMLInputElement) {
		const altura = Math.min(
			ALTURAS_HTML.maxima,
			Math.max(ALTURAS_HTML.minima, Math.round(bloco.altura))
		);
		if (altura !== bloco.altura) aoAlterar?.({ altura });
		campo.value = String(altura);
	}

	// O `srcdoc` monta o documento da iframe. O código do professor chega por
	// `postMessage` (nunca embutido aqui), então a tag de script do professor nunca
	// precisa ser escapada neste arquivo. O dublê de armazenamento e o aviso de erro
	// vêm da casca comum (`cascaSandbox`).
	const CASCA = cascaSandbox({
		origem: 'html',
		estilos: '',
		corpo: `
  window.addEventListener('message', function (evento) {
    var dados = evento.data;
    if (!dados || dados.origem !== 'html' || dados.tipo !== 'rodar') return;
    if (dados.fundo) document.body.style.background = dados.fundo;

    try {
      // O markup vira nó de verdade por innerHTML. Script inserido assim nasce
      // inerte, então cada um é recriado logo em seguida, **em ordem e esperando o
      // src carregar** (ou falhar) antes do próximo. É a ordem que o parser daria,
      // e é o que faz lib via CDN (script com src no painel HTML) e script inline
      // rodarem como no CodePen — inclusive um inline logo após o CDN enxergando
      // o global (tailwind.config, por exemplo).
      document.body.innerHTML = dados.html;

      var antigos = Array.prototype.slice.call(document.body.querySelectorAll('script'));
      var cadeia = Promise.resolve();
      antigos.forEach(function (antigo) {
        cadeia = cadeia.then(function () {
          var novo = document.createElement('script');
          if (antigo.type) novo.type = antigo.type;
          if (!antigo.src) {
            novo.textContent = antigo.textContent;
            antigo.replaceWith(novo);
            return;
          }
          novo.src = antigo.src;
          var carregou = new Promise(function (resolve) {
            novo.onload = novo.onerror = resolve;
          });
          antigo.replaceWith(novo);
          return carregou;
        });
      });

      var estilos = document.createElement('style');
      estilos.textContent = dados.css;
      document.head.appendChild(estilos);

      // O painel JS entra no fim da mesma fila: é o script depois do markup, com a
      // lib do painel HTML já disponível. Erro de runtime em qualquer um dos dois
      // volta pelo \`window.onerror\` da casca (não pelo try/catch, que só pega a
      // montagem do bloco).
      cadeia.then(function () {
        var script = document.createElement('script');
        script.textContent = dados.js;
        document.body.appendChild(script);
      });
    } catch (erro) {
      avisar(erro && erro.message ? erro.message : erro);
    }
  });
  `
	});
</script>

<svelte:window onmessage={aoMensagem} />

<div class="space-y-3">
	{#if dentroDoEditor}
		<!-- Mesmo `join` do seletor de modo da página, aqui escopado no bloco.
		     "Visualizar" mostra a face do aluno: a mesma leitura, sem painéis. -->
		<div class="flex justify-end">
			<div class="join" role="group" aria-label="Modo do bloco HTML">
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
		<!-- Prévia em largura total no topo; os três painéis de código embaixo, cada
		     um na sua linha. O professor vê o desenho inteiro antes de escrever. -->
		<Campo rotulo="Visualização" id={`previa-html-${bloco.id}`} dica="roda no navegador">
			<div
				class="rounded-box border border-base-300 bg-base-100 overflow-hidden"
				style={`height: ${bloco.altura}px`}
				data-html-preview
			>
				{#key geracao}
					<iframe
						bind:this={moldura}
						id={`previa-html-${bloco.id}`}
						class="h-full w-full border-0"
						title="Prévia do bloco HTML"
						sandbox="allow-scripts"
						referrerpolicy="no-referrer"
						srcdoc={CASCA}
						onload={aoCarregar}
					></iframe>
				{/key}
			</div>
		</Campo>

		<div class="space-y-3">
			<Campo
				rotulo="HTML"
				id={`html-${bloco.id}`}
				dica="script e CDN rodam aqui; o painel JS é a lógica da página"
			>
				<textarea
					id={`html-${bloco.id}`}
					class="textarea textarea-bordered h-40 w-full font-mono text-xs leading-relaxed"
					spellcheck="false"
					aria-label="Código HTML"
					value={bloco.html}
					oninput={(event) => aoAlterar?.({ html: event.currentTarget.value })}
				></textarea>
			</Campo>
			<Campo rotulo="CSS" id={`css-${bloco.id}`}>
				<textarea
					id={`css-${bloco.id}`}
					class="textarea textarea-bordered h-40 w-full font-mono text-xs leading-relaxed"
					spellcheck="false"
					aria-label="Código CSS"
					value={bloco.css}
					oninput={(event) => aoAlterar?.({ css: event.currentTarget.value })}
				></textarea>
			</Campo>
			<Campo rotulo="JavaScript" id={`js-${bloco.id}`}>
				<textarea
					id={`js-${bloco.id}`}
					class="textarea textarea-bordered h-40 w-full font-mono text-xs leading-relaxed"
					spellcheck="false"
					aria-label="Código JavaScript"
					value={bloco.js}
					oninput={(event) => aoAlterar?.({ js: event.currentTarget.value })}
				></textarea>
			</Campo>
		</div>

		<div class="flex flex-wrap gap-2">
			<Campo rotulo="Altura" id={`altura-html-${bloco.id}`} class="w-28">
				<!--
					`step="1"`: qualquer inteiro da faixa é válido. Com `step="20"` o
					navegador marcava 250/421 como fora da grade (step mismatch) e o form
					(não tem `novalidate`) travava o "Salvar aula" com aviso nativo.
				-->
				<input
					id={`altura-html-${bloco.id}`}
					type="number"
					class="input input-bordered input-sm w-full"
					min={ALTURAS_HTML.minima}
					max={ALTURAS_HTML.maxima}
					step="1"
					value={bloco.altura}
					oninput={(event) => mudarAltura(event.currentTarget.value)}
					onblur={(event) => limitarAltura(event.currentTarget)}
				/>
			</Campo>
			<div class="flex items-end">
				<button type="button" class="btn btn-sm btn-outline" onclick={() => (geracao += 1)}>
					Rodar
				</button>
			</div>
		</div>
	{:else}
		<div
			class="rounded-box border border-base-300 bg-base-100 overflow-hidden"
			style={`height: ${bloco.altura}px`}
			data-html
		>
			{#key geracao}
				<iframe
					bind:this={moldura}
					class="h-full w-full border-0"
					title="Bloco HTML"
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
				Recarregar
			</button>
		</div>
	{/if}

	{#if erro}
		<div class="alert alert-error text-sm py-2" data-html-erro>
			<span class="font-mono text-xs break-all">{erro}</span>
		</div>
	{/if}
</div>
