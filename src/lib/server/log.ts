// Logger do servidor: tudo vai para o stdout/stderr do processo Node, que é
// exatamente o que o painel "Logs de execução" da Hostinger mostra. Sem
// dependência e sem arquivo — o console do processo **é** o destino.
//
// Formato: `[mcurso] <ISO> <NÍVEL> <mensagem>`. O timestamp ISO é o que permite
// casar uma linha do app com o mesmo instante no painel da hospedagem e nos
// logs de acesso do domínio.
//
// O nível é lido uma vez no boot (módulo avaliado uma única vez em produção) e
// vem de `LOG_NIVEL` (`debug` | `info` | `warn` | `error`, case-insensitivo).
// Fora da lista cai no `info`. `debug` e `info` saem por `console.log`
// (stdout); `warn`/`error` por `console.warn`/`console.error` (stderr), de modo
// que o filtro "Nível de gravidade" do painel da Hostinger classifica direito.
//
// Cada chamada aceita partes extras (`log.error('causa:', erro)`), repassadas
// ao console — assim um `Error` continua sendo inspecionado com stack, como no
// `console.error` puro.

const NIVEIS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Nivel = keyof typeof NIVEIS;

function nivelDe(valor: string | undefined): Nivel {
	const normalizado = valor?.trim().toLowerCase() as Nivel | undefined;
	return normalizado && normalizado in NIVEIS ? normalizado : 'info';
}

const MINIMO = NIVEIS[nivelDe(process.env.LOG_NIVEL)];

function escrever(nivel: Nivel, partes: unknown[]): void {
	if (NIVEIS[nivel] < MINIMO) return;
	const linha = `[mcurso] ${new Date().toISOString()} ${nivel.toUpperCase().padEnd(5)}`;
	if (nivel === 'warn') console.warn(linha, ...partes);
	else if (nivel === 'error') console.error(linha, ...partes);
	else console.log(linha, ...partes);
}

export const log = {
	debug: (...partes: unknown[]) => escrever('debug', partes),
	info: (...partes: unknown[]) => escrever('info', partes),
	warn: (...partes: unknown[]) => escrever('warn', partes),
	error: (...partes: unknown[]) => escrever('error', partes)
};
