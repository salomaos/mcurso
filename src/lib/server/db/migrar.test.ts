import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { pastaMigrations } from './migrar';
import { PROVEDOR } from './driver';

describe('pasta de migrações', () => {
	it('acha a pasta do projeto a partir da raiz', () => {
		const pasta = pastaMigrations(PROVEDOR, process.cwd());
		expect(pasta).not.toBeNull();
		expect(fs.existsSync(path.join(pasta!, 'meta', '_journal.json'))).toBe(true);
	});

	it('devolve null quando não há journal em nenhum candidato', () => {
		const vazio = fs.mkdtempSync(path.join(os.tmpdir(), 'mcurso-migrar-'));
		try {
			expect(pastaMigrations(PROVEDOR, vazio)).toBeNull();
		} finally {
			fs.rmSync(vazio, { force: true, recursive: true });
		}
	});

	it('ignora pasta sem o journal (não é pasta de migração)', () => {
		const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'mcurso-migrar-'));
		try {
			// A subpasta certa do dialeto, mas sem o `_journal.json`: o teste prova
			// que a checagem é do journal, não só da existência da pasta.
			fs.mkdirSync(path.join(raiz, 'drizzle', 'sqlite', 'meta'), { recursive: true });
			expect(pastaMigrations('sqlite', raiz)).toBeNull();
		} finally {
			fs.rmSync(raiz, { force: true, recursive: true });
		}
	});

	it('cada dialeto procura na sua própria subpasta', () => {
		const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'mcurso-migrar-'));

		try {
			// Só o MySQL tem journal; pedir os outros tem que devolver null, senão
			// um banco aplicaria o SQL do dialeto errado.
			const pasta = path.join(raiz, 'drizzle', 'mysql');
			fs.mkdirSync(path.join(pasta, 'meta'), { recursive: true });
			fs.writeFileSync(path.join(pasta, 'meta', '_journal.json'), '{"entries":[]}');

			expect(pastaMigrations('mysql', raiz)).toBe(pasta);
			expect(pastaMigrations('sqlite', raiz)).toBeNull();
			expect(pastaMigrations('pg', raiz)).toBeNull();
		} finally {
			fs.rmSync(raiz, { force: true, recursive: true });
		}
	});
});
