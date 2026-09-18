import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';

export async function handle({ event, resolve }) {
	// Sessão disponível como event.locals para loads/actions guardarem acesso.
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
}