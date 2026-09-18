import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function requerSessao(event: RequestEvent) {
	if (!event.locals.session) throw redirect(303, '/login');
}