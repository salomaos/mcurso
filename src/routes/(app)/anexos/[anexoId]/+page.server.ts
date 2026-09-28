import { buscarAnexo } from '$lib/server/anexo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	return { anexo: await buscarAnexo(Number(event.params.anexoId)) };
};
