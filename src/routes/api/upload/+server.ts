import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { json } from '@sveltejs/kit';
import { uploadsDir } from '$lib/server/db';

const EXTS_PERMITIDAS = new Set([
	'png',
	'jpg',
	'jpeg',
	'webp',
	'gif',
	'svg',
	'pdf',
	'txt',
	'md'
]);

export async function POST(event) {
	if (!event.locals.session) {
		return json({ erro: 'Não autenticado' }, { status: 401 });
	}

	const form = await event.request.formData();
	const arquivo = form.get('arquivo');

	if (!(arquivo instanceof File)) {
		return json({ erro: 'Envie um arquivo no campo "arquivo"' }, { status: 400 });
	}

	const ext = path.extname(arquivo.name).slice(1).toLowerCase();
	if (!EXTS_PERMITIDAS.has(ext)) {
		return json({ erro: `Extensão ".${ext || '(vazio)'}" não permitida` }, { status: 400 });
	}

	await mkdir(uploadsDir, { recursive: true });
	const nome = `${crypto.randomUUID()}.${ext}`;
	await writeFile(path.join(uploadsDir, nome), Buffer.from(await arquivo.arrayBuffer()));

	return json({ src: `/uploads/${nome}` });
}