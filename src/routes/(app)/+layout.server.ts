import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Guarda de autenticação: tudo dentro de (app) exige sessão.
export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.session) throw redirect(303, '/login');
	return {};
};