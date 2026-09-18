<script lang="ts">
	import { TIPOS_BLOCO, criarBloco } from '$lib/blocks';
	import type { Blocos, Bloco } from '$lib/blocks';

	let {
		blocos,
		atualizar
	}: {
		blocos: Blocos;
		atualizar: (novos: Blocos) => void;
	} = $props();

	let novoTipo: Bloco['tipo'] = $state('texto');

	function adicionarBloco() {
		atualizar([...blocos, criarBloco(novoTipo)]);
	}

	function removerBloco(idx: number) {
		atualizar(blocos.filter((_, i) => i !== idx));
	}

	function trocarTipo(idx: number, novo: Bloco['tipo']) {
		const atual = blocos[idx];
		if (!atual || atual.tipo === novo) return;
		const bloco = criarBloco(novo);
		// Preservar dados compatíveis
		if ('texto' in bloco && 'texto' in atual) bloco.texto = (atual as any).texto ?? '';
		if ('conteudo' in bloco && 'conteudo' in atual) bloco.conteudo = (atual as any).conteudo ?? '';
		if ('codigo' in bloco && 'codigo' in atual) bloco.codigo = (atual as any).codigo ?? '';
		if ('diagrama' in bloco && 'diagrama' in atual) bloco.diagrama = (atual as any).diagrama ?? '';
		if ('src' in bloco && 'src' in atual) bloco.src = (atual as any).src ?? '';
		atualizar(blocos.map((b, i) => (i === idx ? bloco : b)));
	}

	function mover(idx: number, delta: -1 | 1) {
		const nIdx = idx + delta;
		if (nIdx < 0 || nIdx >= blocos.length) return;
		const copia = [...blocos];
		[copia[idx], copia[nIdx]] = [copia[nIdx], copia[idx]];
		atualizar(copia);
	}

	function atualizarCampo(idx: number, campo: string, valor: string | number) {
		const copia = blocos.map((b, i) => {
			if (i !== idx) return b;
			return { ...b, [campo]: valor } as Bloco;
		});
		atualizar(copia);
	}
</script>

<div class="space-y-3">
	{#each blocos as bloco, idx (bloco.id)}
		<div class="card card-bordered p-3 space-y-2 border-l-4 border-l-primary">
			<!-- Toolbar -->
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-1">
					<button
						class="btn btn-xs btn-ghost"
						type="button"
						onclick={() => mover(idx, -1)}
						disabled={idx === 0}
						title="Mover para cima"
					>↑</button>
					<button
						class="btn btn-xs btn-ghost"
						type="button"
						onclick={() => mover(idx, 1)}
						disabled={idx === blocos.length - 1}
						title="Mover para baixo"
					>↓</button>
					<select
						class="select select-xs select-ghost"
						value={bloco.tipo}
						onchange={(e) => trocarTipo(idx, e.currentTarget.value as Bloco['tipo'])}
					>
						{#each TIPOS_BLOCO as t}
							<option value={t.id}>{t.rotulo}</option>
						{/each}
					</select>
				</div>
				<button
					class="btn btn-xs btn-error btn-ghost"
					type="button"
					onclick={() => removerBloco(idx)}
				>
					Remover
				</button>
			</div>

			<!-- Campos por tipo -->
			{#if bloco.tipo === 'titulo'}
				<input
					class="input input-sm input-bordered w-full"
					type="text"
					value={bloco.texto}
					oninput={(e) => atualizarCampo(idx, 'texto', e.currentTarget.value)}
					placeholder="Título"
				/>
				<select
					class="select select-sm select-bordered w-full"
					value={bloco.nivel}
					onchange={(e) =>
						atualizarCampo(idx, 'nivel', Number(e.currentTarget.value) as 1 | 2 | 3)}
				>
					<option value={1}>H1</option>
					<option value={2}>H2</option>
					<option value={3}>H3</option>
				</select>
			{:else if bloco.tipo === 'texto'}
				<textarea
					class="textarea textarea-bordered w-full min-h-24"
					value={bloco.conteudo}
					oninput={(e) => atualizarCampo(idx, 'conteudo', e.currentTarget.value)}
					placeholder="Texto da seção..."
				></textarea>
			{:else if bloco.tipo === 'codigo'}
				<input
					class="input input-sm input-bordered"
					type="text"
					value={bloco.linguagem}
					oninput={(e) => atualizarCampo(idx, 'linguagem', e.currentTarget.value)}
					placeholder="linguagem (js, ts, python...)"
				/>
				<textarea
					class="textarea textarea-bordered w-full font-mono min-h-32"
					value={bloco.codigo}
					oninput={(e) => atualizarCampo(idx, 'codigo', e.currentTarget.value)}
					placeholder="// código aqui"
				></textarea>
			{:else if bloco.tipo === 'mermaid'}
				<textarea
					class="textarea textarea-bordered w-full font-mono min-h-32"
					value={bloco.diagrama}
					oninput={(e) => atualizarCampo(idx, 'diagrama', e.currentTarget.value)}
					placeholder="graph LR"
				></textarea>
			{:else if bloco.tipo === 'imagem'}
				<div class="flex flex-col gap-2">
					<input
						class="input input-sm input-bordered"
						type="text"
						value={bloco.src}
						oninput={(e) => atualizarCampo(idx, 'src', e.currentTarget.value)}
						placeholder="/uploads/... ou URL"
					/>
					<input
						class="input input-sm input-bordered"
						type="text"
						value={bloco.legenda ?? ''}
						oninput={(e) => atualizarCampo(idx, 'legenda', e.currentTarget.value)}
						placeholder="Legenda (opcional)"
					/>
					<label class="btn btn-sm btn-outline gap-1 cursor-pointer">
						<input
							type="file"
							class="hidden"
							accept="image/*"
							onchange={async (e) => {
								const arquivo = e.currentTarget.files?.[0];
								if (!arquivo) return;
								const fd = new FormData();
								fd.append('arquivo', arquivo);
								const res = await fetch('/api/upload', { method: 'POST', body: fd });
								const dados = await res.json();
								if (dados.src) atualizarCampo(idx, 'src', dados.src);
							}}
						/>
						Enviar imagem
					</label>
				</div>
			{:else if bloco.tipo === 'link'}
				<input
					class="input input-sm input-bordered"
					type="text"
					value={bloco.rotulo}
					oninput={(e) => atualizarCampo(idx, 'rotulo', e.currentTarget.value)}
					placeholder="Texto do link"
				/>
				<select
					class="select select-sm select-bordered"
					value={bloco.tipoLink}
					onchange={(e) =>
						atualizarCampo(idx, 'tipoLink', e.currentTarget.value)}
				>
					<option value="exercicio">Exercício</option>
					<option value="anexo">Anexo</option>
					<option value="aula">Aula</option>
					<option value="externo">Externo</option>
				</select>
				{#if bloco.tipoLink === 'aula'}
					<input
						class="input input-sm input-bordered"
						type="number"
						value={bloco.aulaId ?? ''}
						oninput={(e) => atualizarCampo(idx, 'aulaId', Number(e.currentTarget.value))}
						placeholder="ID da aula (mesma apostila)"
					/>
				{:else}
					<input
						class="input input-sm input-bordered"
						type="url"
						value={bloco.url ?? ''}
						oninput={(e) => atualizarCampo(idx, 'url', e.currentTarget.value)}
						placeholder="https://..."
					/>
				{/if}
			{/if}
		</div>
	{/each}

	<!-- Adicionar novo bloco -->
	<div class="flex items-center gap-2 mt-2">
		<select class="select select-sm select-bordered" bind:value={novoTipo}>
			{#each TIPOS_BLOCO as t}
				<option value={t.id}>{t.rotulo}</option>
			{/each}
		</select>
		<button class="btn btn-sm btn-outline" type="button" onclick={adicionarBloco}>
			Adicionar bloco
		</button>
	</div>
</div>