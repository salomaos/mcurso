import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth-schema';
import { auth, MASTER_EMAIL, MASTER_PASSWORD } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.session) throw redirect(303, '/apostilas');
	return {};
};

export const actions: Actions = {
	entrar: async (event) => {
		const dados = await event.request.formData();
		const senha = String(dados.get('senha') ?? '');

		if (!MASTER_PASSWORD || senha !== MASTER_PASSWORD) {
			return fail(400, { erro: 'Senha incorreta.' });
		}

		const [existente] = await db
			.select()
			.from(user)
			.where(eq(user.email, MASTER_EMAIL))
			.limit(1);

		if (!existente) {
			await auth.api.signUpEmail({
				body: { email: MASTER_EMAIL, password: senha, name: 'Professor' }
			});
		}

		await auth.api.signInEmail({ body: { email: MASTER_EMAIL, password: senha } });
		throw redirect(303, '/apostilas');
	}
};