<script lang="ts">
	import type { Bloco, BlocoLink } from '$lib/blocks';
	import { ROTULO_ALVO, type AlvoLink, type TipoAlvo } from '$lib/conteudo';
	import { TEMAS_MERMAID } from '$lib/blocks';
	import BarraAcoes from './ui/BarraAcoes.svelte';
	import Campo from './ui/Campo.svelte';
	import SeletorAlvo from './SeletorAlvo.svelte';

	type Props = {
		bloco: Bloco;
		atualizar: (transformar: (atual: Bloco) => Bloco) => void;
		alvos?: { aulas: AlvoLink[]; anexos: AlvoLink[]; exercicios: AlvoLink[] };
	};

	let { bloco, atualizar, alvos }: Props = $props();
	let enviando = $state(false);
	let erroUpload = $state<string | null>(null);

	function alterar(campo: string, valor: string | number | boolean | undefined) {
		atualizar((atual) => ({ ...atual, [campo]: valor } as Bloco));
	}

	function escolherAlvo(alvo: AlvoLink | null) {
		atualizar((atual) => {
			if (atual.tipo !== 'link') return atual;
			const rotulo = alvo && !atual.rotulo.trim() ? alvo.titulo : atual.rotulo;
			return { ...atual, rotulo, alvoId: alvo?.id, url: undefined };
		});
	}

	// Trocar o tipo limpa o destino anterior (alvo ou URL).
	function alterarTipoLink(tipo: string) {
		atualizar((atual) => {
			if (atual.tipo !== 'link') return atual;
			return { ...atual, tipoLink: tipo as BlocoLink['tipoLink'], alvoId: undefined, url: undefined };
		});
	}

	function atualizarTabela(
		sub: 'cellCabecalho' | 'cellLinha' | 'addLinha' | 'rmLinha' | 'addCol' | 'rmCol',
		linha: number,
		coluna: number,
		valor?: string
	) {
		atualizar((atual) => {
			if (atual.tipo !== 'tabela') return atual;
			const copia = {
				...atual,
				cabecalho: [...atual.cabecalho],
				linhas: atual.linhas.map((linha) => [...linha])
			};
			if (sub === 'cellCabecalho') {
				copia.cabecalho[coluna] = valor ?? '';
			} else if (sub === 'cellLinha') {
				copia.linhas[linha][coluna] = valor ?? '';
			} else if (sub === 'addLinha') {
				copia.linhas.push(Array(copia.cabecalho.length).fill(''));
			} else if (sub === 'rmLinha' && copia.linhas.length > 1) {
				copia.linhas.splice(linha, 1);
			} else if (sub === 'addCol') {
				copia.cabecalho.push('');
				for (const item of copia.linhas) item.push('');
			} else if (sub === 'rmCol' && copia.cabecalho.length > 1) {
				copia.cabecalho.splice(coluna, 1);
				for (const item of copia.linhas) item.splice(coluna, 1);
			}
			return copia;
		});
	}

	async function enviarImagem(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const arquivo = input.files?.[0];
		if (!arquivo) return;
		enviando = true;
		erroUpload = null;
		const dadosFormulario = new FormData();
		dadosFormulario.append('arquivo', arquivo);
		try {
			const resposta = await fetch('/api/upload', { method: 'POST', body: dadosFormulario });
			const dados = (await resposta.json()) as { src?: string; erro?: string };
			if (!resposta.ok || !dados.src) throw new Error(dados.erro ?? 'Não foi possível enviar a imagem.');
			alterar('src', dados.src);
		} catch (erro) {
			erroUpload = erro instanceof Error ? erro.message : 'Não foi possível enviar a imagem.';
		} finally {
			enviando = false;
		}
	}
</script>

<div class="canvas-source space-y-3">
		{#if bloco.tipo === 'codigo'}
			<Campo rotulo="Linguagem" id={`linguagem-${bloco.id}`}>
				<input
					id={`linguagem-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.linguagem}
					oninput={(event) => alterar('linguagem', event.currentTarget.value)}
					placeholder="js, ts, python..."
				/>
			</Campo>
			<Campo rotulo="Código fonte" id={`codigo-${bloco.id}`}>
				<textarea
					id={`codigo-${bloco.id}`}
					class="textarea textarea-bordered w-full font-mono min-h-32"
					value={bloco.codigo}
					oninput={(event) => alterar('codigo', event.currentTarget.value)}
					placeholder="// código aqui"
				></textarea>
			</Campo>
		{:else if bloco.tipo === 'mermaid'}
			<Campo rotulo="Definição Mermaid" id={`mermaid-${bloco.id}`}>
				{#snippet extra()}
					<select
						id={`mermaid-tema-${bloco.id}`}
						class="select select-sm select-bordered w-40 shrink-0"
						aria-label="Tema do diagrama Mermaid"
						value={bloco.tema}
						onchange={(event) => alterar('tema', event.currentTarget.value)}
					>
						{#each TEMAS_MERMAID as tema (tema.valor)}
							<option value={tema.valor}>{tema.rotulo}</option>
						{/each}
					</select>
				{/snippet}
				<textarea
					id={`mermaid-${bloco.id}`}
					class="textarea textarea-bordered w-full font-mono min-h-36"
					value={bloco.diagrama}
					oninput={(event) => alterar('diagrama', event.currentTarget.value)}
					placeholder="flowchart LR\n  A --> B"
				></textarea>
			</Campo>
		{:else if bloco.tipo === 'imagem'}
			<Campo rotulo="URL da imagem" id={`imagem-src-${bloco.id}`}>
				<input
					id={`imagem-src-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.src}
					oninput={(event) => alterar('src', event.currentTarget.value)}
					placeholder="/uploads/... ou URL"
				/>
			</Campo>
			<Campo rotulo="Legenda" id={`imagem-legenda-${bloco.id}`}>
				<input
					id={`imagem-legenda-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.legenda ?? ''}
					oninput={(event) => alterar('legenda', event.currentTarget.value || undefined)}
					placeholder="Legenda opcional"
				/>
			</Campo>
			<label class="btn btn-outline btn-sm w-fit cursor-pointer">
				<input class="hidden" type="file" accept="image/*" disabled={enviando} onchange={enviarImagem} />
				{enviando ? 'Enviando...' : 'Enviar imagem'}
			</label>
			{#if erroUpload}
				<div class="alert alert-error py-2 text-sm">{erroUpload}</div>
			{/if}
		{:else if bloco.tipo === 'link'}
			<Campo rotulo="Texto do link" id={`link-rotulo-${bloco.id}`}>
				<input
					id={`link-rotulo-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.rotulo}
					oninput={(event) => alterar('rotulo', event.currentTarget.value)}
					placeholder="Texto exibido"
				/>
			</Campo>
			<Campo rotulo="Tipo" id={`link-tipo-${bloco.id}`}>
				<select
					id={`link-tipo-${bloco.id}`}
					class="select select-sm select-bordered"
					value={bloco.tipoLink}
					onchange={(event) => alterarTipoLink(event.currentTarget.value)}
				>
					<option value="aula">Aula</option>
					<option value="anexo">Anexo</option>
					<option value="exercicio">Atividade</option>
					<option value="externo">Externo</option>
				</select>
			</Campo>
			{#if bloco.tipoLink === 'aula' || bloco.tipoLink === 'anexo' || bloco.tipoLink === 'exercicio'}
				<Campo rotulo={ROTULO_ALVO[bloco.tipoLink as TipoAlvo]}>
					<SeletorAlvo
						tipoLink={bloco.tipoLink as TipoAlvo}
						alvos={alvos?.[
							bloco.tipoLink === 'anexo'
								? 'anexos'
								: bloco.tipoLink === 'exercicio'
									? 'exercicios'
									: 'aulas'
						] ?? []}
						alvoId={bloco.alvoId}
						aoEscolher={escolherAlvo}
					/>
				</Campo>
			{:else}
				<Campo rotulo="URL" id={`link-url-${bloco.id}`}>
					<input
						id={`link-url-${bloco.id}`}
						class="input input-sm input-bordered"
						type="text"
						value={bloco.url ?? ''}
						oninput={(event) => alterar('url', event.currentTarget.value)}
						placeholder="https://..."
				/>
				</Campo>
			{/if}
	{:else if bloco.tipo === 'tabela'}
		<BarraAcoes
			rotulo="Editor da tabela"
			rotuloClass="text-xs font-semibold uppercase tracking-wide opacity-60"
		>
			<button class="btn btn-ghost btn-xs" type="button" onclick={() => atualizarTabela('addCol', 0, 0)}>
				+ Coluna
			</button>
			<button class="btn btn-ghost btn-xs" type="button" onclick={() => atualizarTabela('addLinha', 0, 0)}>
				+ Linha
			</button>
		</BarraAcoes>
		<div class="overflow-x-auto">
			<table class="table table-bordered table-sm">
				<thead>
					<tr>
						{#each bloco.cabecalho as celula, coluna}
							<th class="relative min-w-28">
								<input
									class="input input-xs input-bordered w-full"
									type="text"
									value={celula}
									oninput={(event) =>
										atualizarTabela('cellCabecalho', 0, coluna, event.currentTarget.value)}
									placeholder="Coluna"
								/>
								<button
									class="btn btn-ghost btn-xs absolute -top-2 -right-2"
									type="button"
									disabled={bloco.cabecalho.length <= 1}
									title="Remover coluna"
									onclick={() => atualizarTabela('rmCol', 0, coluna)}
								>×</button>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each bloco.linhas as linha, indiceLinha}
						<tr>
							{#each linha as celula, coluna}
								<td class="min-w-28">
									<input
										class="input input-xs input-bordered w-full"
										type="text"
										value={celula}
										oninput={(event) =>
											atualizarTabela('cellLinha', indiceLinha, coluna, event.currentTarget.value)}
										placeholder="Valor"
									/>
								</td>
							{/each}
							<td>
								<button
									class="btn btn-ghost btn-xs"
									type="button"
									disabled={bloco.linhas.length <= 1}
									title="Remover linha"
									onclick={() => atualizarTabela('rmLinha', indiceLinha, 0)}
								>×</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if bloco.tipo === 'formula'}
		<Campo rotulo="Definição LaTeX" id={`formula-${bloco.id}`}>
			<textarea
				id={`formula-${bloco.id}`}
				class="textarea textarea-bordered w-full font-mono min-h-20"
				value={bloco.latex}
				oninput={(event) => alterar('latex', event.currentTarget.value)}
				placeholder="E = mc^2"
			></textarea>
		</Campo>
		<label class="flex items-center gap-2 text-sm">
			<input
				class="toggle toggle-sm"
				type="checkbox"
				checked={bloco.destaque}
				onchange={(event) => alterar('destaque', event.currentTarget.checked)}
			/>
			Fórmula em destaque
		</label>
	{/if}
</div>
