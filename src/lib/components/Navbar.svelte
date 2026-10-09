<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeSelector from './ThemeSelector.svelte';
	import { authClient } from '$lib/auth-client';

	let { user = $bindable(null) } = $props();

	async function sair() {
		await authClient.signOut();
		goto('/');
	}
</script>

<header class="navbar bg-base-200 border-b-2 border-base-300">
	<div class="flex-1 flex items-center gap-4">
		<a href="/" class="btn btn-ghost text-xl px-2">
			<span class="font-bold">mcurso</span>
		</a>

		{#if user}
			<nav class="flex items-center gap-1">
				<a href="/" class="btn btn-ghost btn-sm">Apostilas</a>
				<a href="/anexos" class="btn btn-ghost btn-sm">Anexos</a>
				<a href="/exercicios" class="btn btn-ghost btn-sm">Atividades</a>
				<a href="/quiz" class="btn btn-ghost btn-sm">Quiz</a>
				<a href="/importar" class="btn btn-ghost btn-sm">Importar</a>
			</nav>
		{:else}
			<!-- Visão do aluno: entra na sala sem decorar a URL. -->
			<nav class="flex items-center gap-1">
				<a href="/quiz/jogar" class="btn btn-ghost btn-sm">Entrar no quiz</a>
			</nav>
		{/if}
	</div>

	<div class="flex items-center gap-2">
		{#if user}
			<span class="text-sm opacity-80 hidden sm:inline">{user.email}</span>
			<button class="btn btn-ghost btn-sm" onclick={sair}>Sair</button>
		{/if}
		<ThemeSelector />
	</div>
</header>