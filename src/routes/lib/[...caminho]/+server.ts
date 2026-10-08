import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

// Biblioteca de simulação servida pela própria app: nada de CDN (o deploy tem de
// funcionar offline e o código do aluno não pode depender de terceiro). A versão
// vem do `package.json`, então `pnpm update` governa a lib.
//
// Só estes dois arquivos existem — o path do cliente não monta caminho nenhum, a
// allowlist abaixo é a superfície de leitura do disco.
const ARQUIVOS = {
	'p5.min.js': { pacote: 'p5', relativo: 'lib/p5.min.js' },
	'q5.js': { pacote: 'q5', relativo: 'q5.js' }
} as const;

const require = createRequire(import.meta.url);

// O `exports` do p5 não expõe `lib/p5.min.js` (`ERR_PACKAGE_PATH_NOT_EXPORTED`) e o
// `q5` resolve para a entrada de Node, não a de browser: então resolvemos o pacote e
// subimos até a pasta que tem o `package.json`, em vez de pedir o caminho direto.
function pastaDoPacote(nome: string): string | null {
	let dir = path.dirname(require.resolve(nome));
	for (let nivel = 0; nivel < 6; nivel++) {
		if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
		const pai = path.dirname(dir);
		if (pai === dir) break;
		dir = pai;
	}
	return null;
}

const NAO_ENCONTRADA = () => new Response('Biblioteca não encontrada', { status: 404 });

export function GET({ params, request }: { params: Record<string, string>; request: Request }) {
	const arquivo = params.caminho;
	if (!arquivo) return NAO_ENCONTRADA();
	const alvo = ARQUIVOS[arquivo as keyof typeof ARQUIVOS];
	if (!alvo) return NAO_ENCONTRADA();

	const pasta = pastaDoPacote(alvo.pacote);
	if (!pasta) return NAO_ENCONTRADA();
	const caminho = path.join(pasta, alvo.relativo);
	if (!fs.existsSync(caminho)) return NAO_ENCONTRADA();

	const conteudo = fs.readFileSync(caminho);

	// A URL não tem hash, então o conteúdo muda no `pnpm.lock` sem a URL mudar:
	// `no-cache` + ETag obriga a revalidar toda vez, e o 304 evita reenviar ~1 MB do
	// p5 para cada bloco de simulação aberto na aula. Cache de um ano só seria
	// seguro com o nome versionado (`p5-2.3.4.min.js`), o que aí precisa de build.
	const etag = `"${createHash('sha256').update(conteudo).digest('hex')}"`;
	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-cache' } });
	}

	return new Response(conteudo, {
		headers: {
			'content-type': 'text/javascript; charset=utf-8',
			'cache-control': 'no-cache',
			etag,
			'x-content-type-options': 'nosniff'
		}
	});
}