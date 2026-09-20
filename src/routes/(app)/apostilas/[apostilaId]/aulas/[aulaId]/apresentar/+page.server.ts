import type { PageServerLoad } from './$types';
import { buscarAulaPublica } from '$lib/server/aula';

export const load: PageServerLoad = async (event) => {
	const apostilaId = Number(event.params.apostilaId);
	const aulaId = Number(event.params.aulaId);
	return buscarAulaPublica(apostilaId, aulaId);
};
