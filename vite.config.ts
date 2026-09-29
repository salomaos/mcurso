import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	ssr: {
		// `mysql2` já é externo por estar em `dependencies`, mas o subpath
		// `/promise` estava sendo reescrito para o pacote raiz no bundle do
		// servidor — e o `mysql2` da raiz é a API de **callback**, cujo `query()`
		// devolve um `Query` que não é promise. O drizzle dá `await` no retorno e
		// o app morria no boot com "You have tried to call .then()...". Listar o
		// subpath aqui mantém o `import` como está escrito.
		external: ['mysql2', 'mysql2/promise']
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Node/SSR: rodamos como servidor próprio (login + SQLite local).
			adapter: adapter()
		})
	]
});
