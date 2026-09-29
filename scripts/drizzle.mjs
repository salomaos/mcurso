// Gera as migrations dos três dialetos: `pnpm db:generate:all`.
//
// O `drizzle-kit generate` é síncrono e não conecta no banco — só lê o schema e
// escreve o SQL. Mesmo assim ele carrega o `drizzle.config.ts`, que lê o
// `DB_PROVIDER` do ambiente; por isso cada dialeto roda como um processo
// separado, com a variável trocada. Rodar os três num processo só não daria.
//
// O bin é invocado via `process.execPath node_modules/drizzle-kit/bin.cjs` para
// não depender do PATH/shell (no Windows o `.bin/drizzle-kit` é um `.CMD`).

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(raiz, 'node_modules', 'drizzle-kit', 'bin.cjs');

const PROVEDORES = ['sqlite', 'pg', 'mysql'];

// Placeholder só para o config não ver `DATABASE_URL` vazia; generate não
// conecta, então o valor não é usado de fato.
const PLACEHOLDER = {
	sqlite: undefined,
	pg: 'postgres://mcurso:mcurso@localhost:5432/mcurso',
	mysql: 'mysql://mcurso:mcurso@localhost:3306/mcurso'
};

for (const provedor of PROVEDORES) {
	console.log(`\n[mcurso] gerando migrations ${provedor}...`);

	const env = { ...process.env, DB_PROVIDER: provedor };
	if (!env.DATABASE_URL && PLACEHOLDER[provedor]) env.DATABASE_URL = PLACEHOLDER[provedor];

	const resultado = spawnSync(process.execPath, [bin, 'generate'], {
		cwd: raiz,
		env,
		stdio: 'inherit'
	});

	if (resultado.status !== 0) {
		console.error(`[mcurso] falhou gerando migrations de ${provedor} (saída ${resultado.status}).`);
		process.exit(resultado.status ?? 1);
	}
}

console.log('\n[mcurso] migrations dos três dialetos geradas.');
