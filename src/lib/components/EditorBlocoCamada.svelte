<script lang="ts">
	import type { Bloco } from '$lib/blocks';

	type Props = {
		bloco: Bloco;
		atualizar: (transformar: (atual: Bloco) => Bloco) => void;
	};

	let { bloco, atualizar }: Props = $props();
	let enviando = $state(false);
	let erroUpload = $state<string | null>(null);

	function alterar(campo: string, valor: string | number | boolean | undefined) {
		atualizar((atual) => ({ ...atual, [campo]: valor } as Bloco));
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

	function atualizarExercicio(
		sub: 'alternativa' | 'addAlt' | 'rmAlt' | 'correta',
		indice: number,
		valor?: string
	) {
		atualizar((atual) => {
			if (atual.tipo !== 'exercicio') return atual;
			const copia = { ...atual, alternativas: [...atual.alternativas] };
			if (sub === 'alternativa') {
				copia.alternativas[indice] = valor ?? '';
			} else if (sub === 'addAlt') {
				copia.alternativas.push('');
			} else if (sub === 'rmAlt' && copia.alternativas.length > 2) {
				const correta = copia.correta;
				copia.alternativas.splice(indice, 1);
				if (correta === indice) copia.correta = Math.min(indice, copia.alternativas.length - 1);
				else if (correta > indice) copia.correta = correta - 1;
			} else if (sub === 'correta') {
				copia.correta = indice;
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
		<div class="form-control">
			<label class="label" for={`linguagem-${bloco.id}`}>
				<span class="label-text">Linguagem</span>
			</label>
			<input
				id={`linguagem-${bloco.id}`}
				class="input input-sm input-bordered"
				type="text"
				value={bloco.linguagem}
				oninput={(event) => alterar('linguagem', event.currentTarget.value)}
				placeholder="js, ts, python..."
			/>
		</div>
		<div class="form-control">
			<label class="label" for={`codigo-${bloco.id}`}>
				<span class="label-text">Código fonte</span>
			</label>
			<textarea
				id={`codigo-${bloco.id}`}
				class="textarea textarea-bordered w-full max-w-full font-mono min-h-32"
				value={bloco.codigo}
				oninput={(event) => alterar('codigo', event.currentTarget.value)}
				placeholder="// código aqui"
			></textarea>
		</div>
	{:else if bloco.tipo === 'mermaid'}
		<div class="form-control">
			<label class="label" for={`mermaid-${bloco.id}`}>
				<span class="label-text">Definição Mermaid</span>
			</label>
			<textarea
				id={`mermaid-${bloco.id}`}
				class="textarea textarea-bordered w-full max-w-full font-mono min-h-36"
				value={bloco.diagrama}
				oninput={(event) => alterar('diagrama', event.currentTarget.value)}
				placeholder="flowchart LR\n  A --> B"
			></textarea>
		</div>
	{:else if bloco.tipo === 'imagem'}
		<div class="form-control">
			<label class="label" for={`imagem-src-${bloco.id}`}>
				<span class="label-text">URL da imagem</span>
			</label>
			<input
				id={`imagem-src-${bloco.id}`}
				class="input input-sm input-bordered"
				type="text"
				value={bloco.src}
				oninput={(event) => alterar('src', event.currentTarget.value)}
				placeholder="/uploads/... ou URL"
			/>
		</div>
		<div class="form-control">
			<label class="label" for={`imagem-legenda-${bloco.id}`}>
				<span class="label-text">Legenda</span>
			</label>
			<input
				id={`imagem-legenda-${bloco.id}`}
				class="input input-sm input-bordered"
				type="text"
				value={bloco.legenda ?? ''}
				oninput={(event) => alterar('legenda', event.currentTarget.value || undefined)}
				placeholder="Legenda opcional"
			/>
		</div>
		<label class="btn btn-sm btn-outline w-fit cursor-pointer">
			<input class="hidden" type="file" accept="image/*" disabled={enviando} onchange={enviarImagem} />
			{enviando ? 'Enviando...' : 'Enviar imagem'}
		</label>
		{#if erroUpload}
			<div class="alert alert-error py-2 text-sm">{erroUpload}</div>
		{/if}
	{:else if bloco.tipo === 'link'}
		<div class="form-control">
			<label class="label" for={`link-rotulo-${bloco.id}`}>
				<span class="label-text">Texto do link</span>
			</label>
			<input
				id={`link-rotulo-${bloco.id}`}
				class="input input-sm input-bordered"
				type="text"
				value={bloco.rotulo}
				oninput={(event) => alterar('rotulo', event.currentTarget.value)}
				placeholder="Texto exibido"
			/>
		</div>
		<div class="form-control">
			<label class="label" for={`link-tipo-${bloco.id}`}>
				<span class="label-text">Tipo</span>
			</label>
			<select
				id={`link-tipo-${bloco.id}`}
				class="select select-sm select-bordered"
				value={bloco.tipoLink}
				onchange={(event) => alterar('tipoLink', event.currentTarget.value)}
			>
				<option value="exercicio">Exercício</option>
				<option value="anexo">Anexo</option>
				<option value="aula">Aula</option>
				<option value="externo">Externo</option>
			</select>
		</div>
		{#if bloco.tipoLink === 'aula'}
			<div class="form-control">
				<label class="label" for={`link-aula-${bloco.id}`}>
					<span class="label-text">ID da aula</span>
				</label>
				<input
					id={`link-aula-${bloco.id}`}
					class="input input-sm input-bordered"
					type="number"
					value={bloco.aulaId ?? ''}
					oninput={(event) => {
						const valor = event.currentTarget.value;
						alterar('aulaId', valor === '' ? undefined : Number(valor));
					}}
					placeholder="ID da aula"
				/>
			</div>
		{:else}
			<div class="form-control">
				<label class="label" for={`link-url-${bloco.id}`}>
					<span class="label-text">URL</span>
				</label>
				<input
					id={`link-url-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.url ?? ''}
					oninput={(event) => alterar('url', event.currentTarget.value)}
					placeholder="https://..."
				/>
			</div>
		{/if}
	{:else if bloco.tipo === 'tabela'}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-xs font-semibold uppercase tracking-wide opacity-60">Editor da tabela</span>
			<div class="flex gap-1">
				<button class="btn btn-xs btn-ghost" type="button" onclick={() => atualizarTabela('addCol', 0, 0)}>
					+ Coluna
				</button>
				<button class="btn btn-xs btn-ghost" type="button" onclick={() => atualizarTabela('addLinha', 0, 0)}>
					+ Linha
				</button>
			</div>
		</div>
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
		<div class="form-control">
			<label class="label" for={`formula-${bloco.id}`}>
				<span class="label-text">Definição LaTeX</span>
			</label>
			<textarea
				id={`formula-${bloco.id}`}
				class="textarea textarea-bordered w-full max-w-full font-mono min-h-20"
				value={bloco.latex}
				oninput={(event) => alterar('latex', event.currentTarget.value)}
				placeholder="E = mc^2"
			></textarea>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input
				class="toggle toggle-sm"
				type="checkbox"
				checked={bloco.destaque}
				onchange={(event) => alterar('destaque', event.currentTarget.checked)}
			/>
			Fórmula em destaque
		</label>
	{:else if bloco.tipo === 'exercicio'}
		<div class="form-control">
			<label class="label" for={`pergunta-${bloco.id}`}>
				<span class="label-text">Enunciado</span>
			</label>
			<textarea
				id={`pergunta-${bloco.id}`}
				class="textarea textarea-bordered w-full max-w-full min-h-20"
				value={bloco.pergunta}
				oninput={(event) => alterar('pergunta', event.currentTarget.value)}
				placeholder="Enunciado do exercício"
			></textarea>
		</div>
		<div class="flex items-center justify-between gap-2">
			<span class="text-xs font-semibold uppercase tracking-wide opacity-60">Alternativas</span>
			<button class="btn btn-xs btn-ghost" type="button" onclick={() => atualizarExercicio('addAlt', 0)}>
				+ Alternativa
			</button>
		</div>
		<div class="space-y-2">
			{#each bloco.alternativas as alternativa, indice}
				<div class="flex items-center gap-2">
					<span class="text-xs font-bold opacity-60">{String.fromCharCode(65 + indice)})</span>
					<input
						class="input input-sm input-bordered flex-1"
						type="text"
						value={alternativa}
						oninput={(event) => atualizarExercicio('alternativa', indice, event.currentTarget.value)}
						placeholder={`Alternativa ${String.fromCharCode(65 + indice)}`}
					/>
					<input
						class="radio radio-sm"
						type="radio"
						name={`correta-${bloco.id}`}
						checked={bloco.correta === indice}
						onchange={() => atualizarExercicio('correta', indice)}
						title="Marcar como correta"
					/>
					<button
						class="btn btn-ghost btn-xs"
						type="button"
						disabled={bloco.alternativas.length <= 2}
						title="Remover alternativa"
						onclick={() => atualizarExercicio('rmAlt', indice)}
					>×</button>
				</div>
			{/each}
		</div>
		<div class="form-control">
			<label class="label" for={`explicacao-${bloco.id}`}>
				<span class="label-text">Explicação</span>
			</label>
			<textarea
				id={`explicacao-${bloco.id}`}
				class="textarea textarea-bordered w-full max-w-full min-h-20"
				value={bloco.explicacao ?? ''}
				oninput={(event) => alterar('explicacao', event.currentTarget.value || undefined)}
				placeholder="Explicação exibida após responder"
			></textarea>
		</div>
	{/if}
</div>
