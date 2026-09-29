import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Gera `src/lib/server/db/auth-schema/{sqlite,postgres,mysql}.ts` chamando o
// `@better-auth/cli` uma vez por dialeto, com `DB_PROVIDER` trocado por
// processo. Rodar os três é o que mantém as tabelas do Better Auth em paridade:
// o CLI escolhe os tipos pelo `provider` do `drizzleAdapter` (o SQLite usa
// `unixepoch` e inteiro em ms; o PostgreSQL, `now()` e `timestamp`; o MySQL,
// `varchar(36)` na chave e `timestamp(3)`).
//
// Os arquivos saem como o CLI escreve (2 espaços, aspas duplas) para que
// regerar seja um diff limpo em vez de uma reformatação.

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = 'src/lib/server/auth-cli.ts';

// O CLI não conecta no banco no `generate`, mas o `auth-cli.ts` constrói a
// conexão para montar o `drizzleAdapter` — e `urlDoBanco()` lança sem
// `DATABASE_URL`. Sem este placeholder a config não carrega, o CLI avisa do
// "schema mismatch" e **escreve o arquivo do SQLite mesmo assim** (foi
// exatamente o que aconteceu na primeira versão deste script). A checagem no
// fim existe para esse fallback não voltar a passar em silêncio.
const PLACEHOLDER = {
	sqlite: undefined,
	pg: 'postgres://mcurso:mcurso@localhost:5432/mcurso',
	mysql: 'mysql://mcurso:mcurso@localhost:3306/mcurso'
};

// Helper de tabela que o CLI deveria ter usado em cada dialeto.
const ESPERADO = {
	sqlite: 'sqliteTable',
	pg: 'pgTable',
	mysql: 'mysqlTable'
};

const PROVEDORES = ['sqlite', 'pg', 'mysql'];

for (const provedor of PROVEDORES) {
	const pasta = provedor === 'pg' ? 'postgres' : provedor;
	const saida = `src/lib/server/db/auth-schema/${pasta}.ts`;

	console.log(`\n[mcurso] gerando auth-schema ${provedor} → ${saida}`);

	const env = { ...process.env, DB_PROVIDER: provedor };
	if (!env.DATABASE_URL && PLACEHOLDER[provedor]) env.DATABASE_URL = PLACEHOLDER[provedor];

	const r = spawnSync(
		process.execPath,
		[
			'node_modules/@better-auth/cli/dist/index.mjs',
			'generate',
			'--config',
			config,
			'--output',
			saida,
			'--yes'
		],
		{ cwd: raiz, stdio: 'inherit', env }
	);

	if (r.status !== 0) {
		console.error(`[mcurso] falhou o auth-schema de ${provedor} (código ${r.status}).`);
		process.exit(r.status ?? 1);
	}

	conferirSaida(provedor, saida);
}

console.log('\n[mcurso] auth-schema dos três dialetos gerados.');

function conferirSaida(provedor, saida) {
	const caminho = path.join(raiz, saida);

	if (!existsSync(caminho)) {
		console.error(`[mcurso] o CLI disse que gerou, mas ${saida} não existe.`);
		process.exit(1);
	}

	const conteudo = readFileSync(caminho, 'utf8');
	const esperado = ESPERADO[provedor];
	const outro = Object.entries(ESPERADO).find(([_, helper]) => helper !== esperado)?.[1];

	if (!conteudo.includes(`${esperado}(`)) {
		const usado = outro && conteudo.includes(`${outro}(`) ? outro : '(desconhecido)';
		throw new Error(
			`[mcurso] ${saida} saiu com ${usado}, não com ${esperado}. ` +
				'O CLI provavelmente caiu no dialeto padrão — confira DATABASE_URL no .env.'
		);
	}
}
