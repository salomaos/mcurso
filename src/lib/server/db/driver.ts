import 'dotenv/config';

// Dialeto do banco, escolhido por `DB_PROVIDER` no `.env` (padrão: `sqlite`).
// O resto do app é idêntico nos três: o schema tem uma variante por dialeto e
// `schema/index.ts` é o único ponto onde a escolha vira tipo (o app é tipado
// pelo schema do SQLite). As diferenças que a tipagem não cobre — `RETURNING`,
// transação síncrona, `count()`/`max()` que voltam como string — estão isoladas
// em `inserir.ts` e `transacao.ts`.

export const PROVEDORES = ['sqlite', 'pg', 'mysql'] as const;
export type Provedor = (typeof PROVEDORES)[number];

// `pg` (e não `postgres`) para o valor casar com o `provider` do `drizzleAdapter`
// do Better Auth. O drizzle-kit chama de `postgresql`; a tradução fica lá.
export function lerProvedor(bruto = process.env.DB_PROVIDER): Provedor {
	const valor = (bruto ?? 'sqlite').trim().toLowerCase();

	if (!PROVEDORES.includes(valor as Provedor)) {
		throw new Error(
			`[mcurso] DB_PROVIDER inválido: "${valor}". Valores aceitos: ${PROVEDORES.join(', ')}.`
		);
	}

	return valor as Provedor;
}

export const PROVEDOR = lerProvedor();

// Cada dialeto tem sua própria pasta de migrations: o SQL gerado não é o mesmo
// (`AUTOINCREMENT` vs `serial` vs `auto_increment`, `text` vs `jsonb` vs `json`).
export const PASTA_MIGRACOES: Record<Provedor, string> = {
	sqlite: 'drizzle/sqlite',
	pg: 'drizzle/postgres',
	mysql: 'drizzle/mysql'
};

// A pasta que `pnpm db:generate` escreve (mesma chave, pra não divergir do boot).
export const SUFIXO_PASTA: Record<Provedor, string> = {
	sqlite: 'sqlite',
	pg: 'postgres',
	mysql: 'mysql'
};

// Caminho do arquivo do SQLite (o dialeto padrão, sem servidor para configurar).
export function caminhoSqlite(): string {
	return process.env.DB_PATH?.trim() || 'data/mcurso.db';
}

const ESQUEMAS = {
	pg: ['postgres://', 'postgresql://'],
	mysql: ['mysql://']
} as const satisfies Record<Exclude<Provedor, 'sqlite'>, readonly string[]>;

const EXEMPLOS = {
	pg: 'postgres://usuario:senha@host:5432/mcurso',
	mysql: 'mysql://usuario:senha@host:3306/mcurso'
} as const satisfies Record<Exclude<Provedor, 'sqlite'>, string>;

/**
 * URL de conexão dos dialetos com servidor. Falha no boot (e não na primeira
 * query) se faltar ou vier do dialeto errado — trocar a URL do MySQL no lugar
 * da do PostgreSQL é erro de `.env` que só apareceria em produção.
 */
export function urlDoBanco(provedor: Provedor = PROVEDOR): string | null {
	if (provedor === 'sqlite') return null;

	const url = process.env.DATABASE_URL?.trim() ?? '';

	if (!url) {
		throw new Error(
			`[mcurso] DB_PROVIDER=${provedor} exige DATABASE_URL no .env ` +
				`(ex.: ${EXEMPLOS[provedor]}).`
		);
	}

	const esquemas = ESQUEMAS[provedor];
	if (!esquemas.some((esquema) => url.startsWith(esquema))) {
		// Só o esquema aparece na mensagem: a URL pode ter senha.
		const recebido = url.split('://')[0] || '(sem esquema)';
		throw new Error(
			`[mcurso] DB_PROVIDER=${provedor} não bate com o DATABASE_URL (esquema "${recebido}"). ` +
				`Esperado ${esquemas.map((e) => `"${e}"`).join(' ou ')}.`
		);
	}

	return url;
}
