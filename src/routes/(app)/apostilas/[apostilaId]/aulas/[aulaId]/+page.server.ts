import { buscarAulaPublica } from '$lib/server/aula';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	return buscarAulaPublica(Number(event.params.apostilaId), Number(event.params.aulaId));
};
