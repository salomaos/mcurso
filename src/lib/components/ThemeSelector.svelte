<script lang="ts">
	import { TEMAS, getTema, definirTema } from '$lib/theme.svelte';

	let tema = $derived(getTema());
</script>

<label class="flex items-center gap-1 text-sm opacity-80">
	<span>Tema</span>
	<select
		class="select select-sm select-ghost"
		value={tema}
		onchange={(e) => definirTema(e.currentTarget.value as (typeof TEMAS)[number])}
	>
		{#each TEMAS as t}
			<option value={t}>{t}</option>
		{/each}
	</select>
</label>