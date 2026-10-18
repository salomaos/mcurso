import { building } from '$app/environment';
import type { HandleServerError } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';

export async function handle({ event, resolve }) {
	// Sessão disponível como event.locals para loads/actions guardarem acesso.
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
}

// `handleError` substitui o log padrão do SvelteKit, então ele loga os dois: o erro
// de fora e a **causa**. E é a causa que importa: o erro do drizzle sai como
// "Failed query: ..." e o código do MySQL (PROTOCOL_CONNECTION_LOST,
// ER_ACCESS_DENIED, ER_NO_SUCH_TABLE...) fica em `error.cause`, que o log padrão não
// mostra. Sem isso, um 500 no deploy vira adivinhação — foi o que aconteceu em
// 18/10/2026, com o app inteiro em 500 sem dizer por quê.
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	console.error(`[mcurso] ${status} ${event.request.method} ${event.url.pathname}`);

	if (error instanceof Error) {
		console.error(error.stack ?? error.message);

		if (error.cause) {
			console.error('[mcurso] causa:', error.cause);
		}
	} else {
		console.error(error);
	}

	return { message };
};
