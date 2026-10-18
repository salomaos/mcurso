import path from 'node:path';

// Política do upload num lugar só: o que pode subir (extensão e tamanho) e onde a pasta
// mora. A rota de escrita (`/api/upload`) e a de leitura (`/uploads/[...caminho]`) importam
// daqui, então o que o professor consegue enviar é o que o aluno consegue abrir.
//
// O arquivo nunca vai para o banco (nem base64 dentro do conteúdo): o bloco guarda só a URL
// `/uploads/<uuid>.<ext>` e o arquivo fica em disco, em `UPLOADS_DIR`. É por isso que a
// leitura é **pública** — leitura, impressão e apresentação de aula/anexo/atividade são
// públicas, e uma imagem que exigisse sessão apareceria quebrada para o aluno. Como o nome
// é UUID (não enumerável) e o arquivo nunca muda depois de gravado, a leitura sai com
// `immutable`. A escrita continua só com sessão.

export const EXTS_PERMITIDAS = new Set([
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

export const MIME: Record<string, string> = {
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

export const MIME_PADRAO = 'application/octet-stream';

// Limite do app: 10 MB (foto de celular cabe; vídeo não). Quem corta o corpo **antes** desta
// checagem é o `BODY_SIZE_LIMIT` do adapter-node, cujo default é 512K — por isso o boot
// compara os dois e avisa (ver `conferirUploads`).
export const LIMITE_UPLOAD_BYTES = 10 * 1024 * 1024;

export function tipoDoArquivo(caminho: string): string {
	return MIME[path.extname(caminho).toLowerCase()] ?? MIME_PADRAO;
}

/** Megabyte com uma casa decimal, em pt-BR (ex.: `0,5`). */
export function formatarMb(bytes: number): string {
	return String(Number((bytes / 1024 / 1024).toFixed(1))).replace('.', ',');
}

export type ResultadoUpload = { ok: true; ext: string } | { ok: false; erro: string };

function erroDeTamanho(bytes: number): string {
	return (
		`Arquivo de ${formatarMb(bytes)} MB passa do limite de ` +
		`${formatarMb(LIMITE_UPLOAD_BYTES)} MB`
	);
}

/** Extensão e tamanho do arquivo (o tamanho do arquivo, não do corpo da requisição). */
export function validarUpload(nome: string, tamanho: number): ResultadoUpload {
	const ext = path.extname(nome).slice(1).toLowerCase();

	if (!EXTS_PERMITIDAS.has(ext)) {
		return { ok: false, erro: ext ? `Extensão ".${ext}" não permitida` : 'Arquivo sem extensão' };
	}

	if (tamanho > LIMITE_UPLOAD_BYTES) {
		return { ok: false, erro: erroDeTamanho(tamanho) };
	}

	return { ok: true, ext };
}

/**
 * Lê `BODY_SIZE_LIMIT` como o adapter-node lê (sufixo K/M/G em potência de 1024, sem sufixo
 * = bytes), para o boot comparar o corte do adapter com o limite do app. `null` é um valor
 * que o próprio adapter recusaria na subida ("Invalid BODY_SIZE_LIMIT").
 */
export function limiteDoAdapter(texto: string | undefined): number | null {
	if (!texto || !texto.trim()) return 512 * 1024; // default do adapter-node
	const bruto = texto.trim().toUpperCase();
	const multiplicador = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[bruto[bruto.length - 1] ?? ''] ?? 1;
	const numero = Number(multiplicador === 1 ? bruto : bruto.slice(0, -1));
	return Number.isFinite(numero) ? numero * multiplicador : null;
}

/**
 * Onde a pasta de uploads vai cair e o que avisar no boot. Em produção o caminho **precisa**
 * ser absoluto e fora da pasta do app: a Hostinger recria a pasta do build a cada deploy
 * (`hbuilds/versions/<id>`) e um `data/uploads` relativo iria junto, levando os arquivos
 * enviados. Em dev o cwd é a raiz do projeto, então relativo é o normal.
 */
export function conferirUploads(entorno: {
	valor?: string;
	cwd: string;
	dev: boolean;
	bodySizeLimit?: string;
}): { caminho: string; avisos: string[] } {
	const informado = (entorno.valor ?? '').trim() || 'data/uploads';
	const relativo = !path.isAbsolute(informado);
	const caminho = relativo ? path.resolve(entorno.cwd, informado) : path.normalize(informado);
	const avisos: string[] = [];

	if (entorno.dev) return { caminho, avisos };

	if (relativo) {
		avisos.push(
			`UPLOADS_DIR é relativo ("${informado}") e resolve para ${caminho}, dentro da pasta do ` +
				'app: na Hostinger a pasta do build é recriada a cada deploy e os arquivos enviados ' +
				'somem junto. Use um caminho absoluto fora dela (ex.: /home/usuario/mcurso/uploads).'
		);
	}

	const limite = limiteDoAdapter(entorno.bodySizeLimit);
	if (limite !== null && limite < LIMITE_UPLOAD_BYTES) {
		avisos.push(
			`BODY_SIZE_LIMIT corta o corpo da requisição em ${formatarMb(limite)} MB, abaixo do ` +
				`limite de upload do app (${formatarMb(LIMITE_UPLOAD_BYTES)} MB): um envio maior falha ` +
				'com 413 antes de chegar na rota. Defina BODY_SIZE_LIMIT=12M no ambiente.'
		);
	}

	return { caminho, avisos };
}
