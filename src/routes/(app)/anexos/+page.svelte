<script lang="ts">
	import PainelSoltos from '$lib/components/ui/PainelSoltos.svelte';
	import {
		caminhoAnexo,
		ROTULO_APRESENTAR,
		ROTULO_EDITAR,
		ROTULO_IMPRIMIR,
		type AnexoUi
	} from '$lib/conteudo';
	import type { PageData } from './$types';

	type Item = AnexoUi & { href: string };

	let { data, form } = $props<{ data: PageData; form: unknown }>();
	let busca = $state('');

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);

	function filtrar(titulo: string) {
		return !busca.trim() || titulo.toLowerCase().includes(busca.trim().toLowerCase());
	}

	const anexos = $derived(
		(data.anexos as AnexoUi[])
			.filter((anexo) => filtrar(anexo.titulo))
			.map((anexo): Item => ({ ...anexo, href: caminhoAnexo(anexo.id) }))
	);
</script>

<svelte:head>
	<title>Anexos — mcurso</title>
</svelte:head>

<PainelSoltos
	titulo="Anexos"
	singular="anexo"
	plural="anexos"
	descricao="Material de apoio solto, sem vínculo com apostila. Use em qualquer aula colocando um bloco de link para o anexo."
	rotuloCriar="+ Novo anexo"
	rotuloBusca="Buscar anexo por título"
	rotuloVazio="Nenhum anexo ainda. Crie o primeiro para usar como material de apoio nas aulas."
	nomeId="anexoId"
	rotuloTipoExcluir="anexo"
	tituloSemUso="Nenhuma aula aponta para este anexo: o aluno não consegue chegar nele."
	tituloEmUso="Remova os links que apontam para este anexo antes de excluí-lo."
	{erro}
	{busca}
	aoBuscar={(valor) => (busca = valor)}
	itens={anexos}
>
	{#snippet acoes(anexo)}
		<a href={`${anexo.href}/editar`} class="btn btn-outline btn-sm">{ROTULO_EDITAR}</a>
		<a href={`${anexo.href}/imprimir`} class="btn btn-ghost btn-sm" target="_blank">
			{ROTULO_IMPRIMIR}
		</a>
		<a href={`${anexo.href}/apresentar`} class="btn btn-ghost btn-sm">{ROTULO_APRESENTAR}</a>
	{/snippet}
</PainelSoltos>