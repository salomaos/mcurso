import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	conferirUploads,
	formatarMb,
	limiteDoAdapter,
	LIMITE_UPLOAD_BYTES,
	tipoDoArquivo,
	validarUpload
} from './uploads';

describe('validação do upload', () => {
	it('aceita as extensões da lista, sem depender da caixa', () => {
		for (const nome of ['aula.png', 'foto.JPG', 'grafico.webp', 'desenho.gif', 'lista.pdf', 'notas.md', 'texto.txt', 'vetor.svg']) {
			expect(validarUpload(nome, 1024).ok).toBe(true);
		}
	});

	it('recusa extensão fora da lista e arquivo sem extensão', () => {
		expect(validarUpload('script.exe', 10)).toEqual({
			ok: false,
			erro: 'Extensão ".exe" não permitida'
		});
		expect(validarUpload('relatorio', 10)).toEqual({ ok: false, erro: 'Arquivo sem extensão' });
	});

	// O limite é sobre o arquivo: exatamente no limite passa, um byte acima não.
	it('aceita exatamente no limite e recusa acima', () => {
		expect(validarUpload('foto.png', LIMITE_UPLOAD_BYTES)).toEqual({ ok: true, ext: 'png' });
		expect(validarUpload('foto.png', LIMITE_UPLOAD_BYTES + 1).ok).toBe(false);
		expect(validarUpload('foto.png', 12 * 1024 * 1024)).toEqual({
			ok: false,
			erro: 'Arquivo de 12 MB passa do limite de 10 MB'
		});
	});

	it('mostra o tamanho em MB com vírgula decimal', () => {
		expect(formatarMb(1536 * 1024)).toBe('1,5');
		expect(formatarMb(512 * 1024)).toBe('0,5');
		expect(formatarMb(LIMITE_UPLOAD_BYTES)).toBe('10');
	});
});

describe('resolução da pasta de uploads', () => {
	const cwd = path.resolve('/projeto');

	it('resolve o caminho relativo contra o cwd e não avisa em dev', () => {
		const { caminho, avisos } = conferirUploads({ valor: 'data/uploads', cwd, dev: true });
		expect(caminho).toBe(path.resolve(cwd, 'data/uploads'));
		expect(avisos).toEqual([]);
	});

	it('usa o padrão `data/uploads` quando a variável não vem', () => {
		expect(conferirUploads({ cwd, dev: true }).caminho).toBe(path.resolve(cwd, 'data/uploads'));
	});

	// A pasta do build da Hostinger é recriada a cada deploy (`hbuilds/versions/<id>`): um
	// caminho relativo em produção é perda de arquivo anunciada.
	it('em produção, caminho relativo vira aviso com o caminho resolvido', () => {
		const { caminho, avisos } = conferirUploads({
			valor: 'data/uploads',
			cwd: '/home/u/app',
			dev: false,
			bodySizeLimit: '12M'
		});
		expect(caminho).toBe(path.resolve('/home/u/app', 'data/uploads'));
		expect(avisos).toHaveLength(1);
		expect(avisos[0]).toContain('UPLOADS_DIR é relativo');
		expect(avisos[0]).toContain(caminho);
	});

	it('em produção, caminho absoluto não gera aviso nenhum', () => {
		const { caminho, avisos } = conferirUploads({
			valor: '/home/u/mcurso/uploads',
			cwd: '/home/u/app',
			dev: false,
			bodySizeLimit: '12M'
		});
		expect(caminho).toBe(path.normalize('/home/u/mcurso/uploads'));
		expect(avisos).toEqual([]);
	});

	it('em produção, BODY_SIZE_LIMIT abaixo do limite do app vira aviso', () => {
		const { avisos } = conferirUploads({
			valor: '/home/u/mcurso/uploads',
			cwd: '/home/u/app',
			dev: false
		});
		expect(avisos).toHaveLength(1);
		expect(avisos[0]).toContain('BODY_SIZE_LIMIT');
	});
});

describe('BODY_SIZE_LIMIT do adapter', () => {
	it('lê como o adapter lê (K/M/G em potência de 1024, sem sufixo = bytes)', () => {
		expect(limiteDoAdapter(undefined)).toBe(512 * 1024);
		expect(limiteDoAdapter('')).toBe(512 * 1024);
		expect(limiteDoAdapter('512K')).toBe(512 * 1024);
		expect(limiteDoAdapter('12M')).toBe(12 * 1024 * 1024);
		expect(limiteDoAdapter(' 1G ')).toBe(1024 ** 3);
		expect(limiteDoAdapter('1048576')).toBe(1048576);
	});

	it('devolve null para valor que o próprio adapter recusaria', () => {
		expect(limiteDoAdapter('muito')).toBeNull();
	});
});

describe('tipo do arquivo da leitura', () => {
	it('sai pela extensão, com fallback binário', () => {
		expect(tipoDoArquivo('/x/foto.PNG')).toBe('image/png');
		expect(tipoDoArquivo('/x/nota.md')).toBe('text/markdown');
		expect(tipoDoArquivo('/x/estranho.xyz')).toBe('application/octet-stream');
	});
});
