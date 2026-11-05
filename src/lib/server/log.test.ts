import { afterEach, describe, expect, it, vi } from 'vitest';

// O nível mínimo é lido quando o módulo é avaliado, então cada cenário
// reimporta com o env ajustado (`vi.resetModules` + import dinâmico).
async function importarCom(nivel: string | undefined) {
	vi.resetModules();
	if (nivel === undefined) vi.unstubAllEnvs();
	else vi.stubEnv('LOG_NIVEL', nivel);
	return (await import('./log')).log;
}

function espionarConsole() {
	return {
		log: vi.spyOn(console, 'log').mockImplementation(() => {}),
		warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
		error: vi.spyOn(console, 'error').mockImplementation(() => {})
	};
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('log', () => {
	it('sem LOG_NIVEL, debug fica de fora e o resto passa', async () => {
		const log = await importarCom(undefined);
		const saida = espionarConsole();

		log.debug('não');
		log.info('sim');
		log.warn('sim');
		log.error('sim');

		expect(saida.log).toHaveBeenCalledTimes(1);
		expect(saida.warn).toHaveBeenCalledTimes(1);
		expect(saida.error).toHaveBeenCalledTimes(1);
	});

	it('LOG_NIVEL=debug deixa tudo passar', async () => {
		const log = await importarCom('debug');
		const saida = espionarConsole();

		log.debug('sim');

		expect(saida.log).toHaveBeenCalledTimes(1);
	});

	it('LOG_NIVEL=error só passa error', async () => {
		const log = await importarCom('error');
		const saida = espionarConsole();

		log.info('não');
		log.warn('não');
		log.error('sim');

		expect(saida.log).not.toHaveBeenCalled();
		expect(saida.warn).not.toHaveBeenCalled();
		expect(saida.error).toHaveBeenCalledTimes(1);
	});

	it('LOG_NÍVEL fora da lista cai no info', async () => {
		const log = await importarCom('barulho');
		const saida = espionarConsole();

		log.debug('não');
		log.info('sim');

		expect(saida.log).toHaveBeenCalledTimes(1);
	});

	it('cada linha leva o prefixo, o timestamp ISO e o nível', async () => {
		const log = await importarCom(undefined);
		const saida = espionarConsole();

		log.info('algo aconteceu');

		const [linha, mensagem] = saida.log.mock.calls[0];
		expect(linha).toMatch(/^\[mcurso\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO\s?/);
		expect(mensagem).toBe('algo aconteceu');
	});

	it('partes extras são repassadas ao console (Error continua com stack)', async () => {
		const log = await importarCom(undefined);
		const saida = espionarConsole();
		const erro = new Error('estourou');

		log.error('causa:', erro);

		expect(saida.error.mock.calls[0][1]).toBe('causa:');
		expect(saida.error.mock.calls[0][2]).toBe(erro);
	});
});
