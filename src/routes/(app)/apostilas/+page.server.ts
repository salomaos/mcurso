import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// A lista pública de apostilas é o index (/); /apostilas fica como atalho.
export const load: PageServerLoad = () => {
	throw redirect(308, '/');
};