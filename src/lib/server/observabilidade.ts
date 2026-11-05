// Observabilidade do processo: o que sobe, o que derruba e como está a memória.
// Importado pelo `hooks.server.ts` pelo efeito colateral. Em dev o HMR do Vite
// reavalia este módulo; sem a guarda em `globalThis`, cada recarga empilharia
// handler de sinal e intervalo duplicados.
//
// Nada aqui muda o comportamento do processo: `uncaughtExceptionMonitor`
// observa o crash sem "torná-lo seguro" (o processo continua caindo como o
// Node faria sozinho), e o handler de `unhandledRejection` só garante a stack
// no log antes de repetir a saída padrão do Node ≥ 15.

import { building } from '$app/environment';
import { log } from '$lib/server/log';

const INTERVALO_MEMORIA_MS = 5 * 60 * 1000;

const guarda = globalThis as unknown as { __mcursoObservabilidade?: boolean };

if (!building && !guarda.__mcursoObservabilidade) {
	guarda.__mcursoObservabilidade = true;

	log.info(`servidor subindo (node ${process.version}, pid ${process.pid})`);

	// `uncaughtExceptionMonitor` (e não `uncaughtException`) de propósito: o
	// monitor loga e deixa o encerramento padrão acontecer.
	process.on('uncaughtExceptionMonitor', (erro) => {
		log.error('exceção não capturada — o processo vai cair:', erro);
	});

	process.on('unhandledRejection', (razao) => {
		log.error('promessa rejeitada sem handler — encerrando:', razao);
		process.exit(1);
	});

	for (const sinal of ['SIGTERM', 'SIGINT'] as const) {
		process.on(sinal, () => log.info(`sinal ${sinal} recebido — encerrando`));
	}

	// `unref()` para o timer não segurar o processo aberto (nem atrapalhar o
	// vitest, que importa esses módulos indiretamente).
	const timer = setInterval(() => {
		const memoria = process.memoryUsage();
		const mb = (valor: number) => `${Math.round(valor / 1024 / 1024)}MB`;
		log.info(
			`mem rss=${mb(memoria.rss)} heap=${mb(memoria.heapUsed)}/${mb(memoria.heapTotal)} uptime=${Math.round(process.uptime())}s`
		);
	}, INTERVALO_MEMORIA_MS);
	timer.unref();
}
