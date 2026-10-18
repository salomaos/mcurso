import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { uploadsDir } from '$lib/server/db';
import { tipoDoArquivo } from '$lib/server/uploads';

// Leitura **pública** de propósito: leitura, impressão e apresentação de aula/anexo/atividade
// são públicas, então a imagem de um bloco precisa abrir sem sessão — exigindo login aqui,
// toda imagem saía quebrada para o aluno (e no "Imprimir/PDF"); quem via era só o professor
// logado. O nome é um UUID (não enumerável) e o arquivo nunca muda depois de gravado, daí o
// `immutable`: o navegador guarda e não volta a pedir. A escrita continua só com sessão.
export function GET({ params }: { params: Record<string, string> }) {
	const alvo = path.resolve(uploadsDir, params.caminho ?? '');

	// O separador importa: sem ele `/dados/uploads-x` passaria pela checagem de `/dados/uploads`.
	if (!alvo.startsWith(uploadsDir + path.sep)) {
		return new Response('Caminho inválido', { status: 400 });
	}

	let info: fs.Stats;
	try {
		info = fs.statSync(alvo);
	} catch {
		return new Response('Não encontrado', { status: 404 });
	}
	if (!info.isFile()) return new Response('Não encontrado', { status: 404 });

	return new Response(Readable.toWeb(fs.createReadStream(alvo)) as ReadableStream, {
		headers: {
			'content-type': tipoDoArquivo(alvo),
			'content-length': String(info.size),
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff',
			// SVG é o único da lista que pode trazer script embutido e o arquivo é servido
			// deste mesmo domínio: `sandbox` neutraliza quando alguém abre a URL direto.
			// (Em `<img>` o script já não roda; e fica só no SVG para não atrapalhar o
			// visualizador de PDF do navegador.)
			...(path.extname(alvo).toLowerCase() === '.svg' ? { 'content-security-policy': 'sandbox' } : {})
		}
	});
}
