import fs from 'node:fs';
import path from 'node:path';
import { uploadsDir } from '$lib/server/db';

const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.txt': 'text/plain',
	'.md': 'text/markdown'
};

export function GET({ params, locals }: { params: Record<string, string>; locals: App.Locals }) {
	if (!locals.session) return new Response('Não autorizado', { status: 401 });
	if (!params.caminho) return new Response('Caminho inválido', { status: 400 });

	const alvo = path.normalize(path.join(uploadsDir, params.caminho));
	if (!alvo.toLowerCase().startsWith(uploadsDir.toLowerCase())) {
		return new Response('Caminho inválido', { status: 400 });
	}

	if (!fs.existsSync(alvo) || !fs.statSync(alvo).isFile()) {
		return new Response('Não encontrado', { status: 404 });
	}

	const tipo = MIME[path.extname(alvo).toLowerCase()] ?? 'application/octet-stream';
	return new Response(fs.readFileSync(alvo), {
		headers: { 'content-type': tipo }
	});
}