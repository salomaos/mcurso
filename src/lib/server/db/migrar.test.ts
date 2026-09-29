import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { pastaMigrations } from './migrar';

describe('pasta de migrações', () => {
	it('acha a pasta do projeto a partir da raiz', () => {
		const pasta = pastaMigrations(process.cwd());
		expect(pasta).not.toBeNull();
		expect(fs.existsSync(path.join(pasta!, 'meta', '_journal.json'))).toBe(true);
	});

	it('devolve null quando não há journal em nenhum candidato', () => {
		const vazio = fs.mkdtempSync(path.join(os.tmpdir(), 'mcurso-migrar-'));
		try {
			expect(pastaMigrations(vazio)).toBeNull();
		} finally {
			fs.rmSync(vazio, { force: true, recursive: true });
		}
	});

	it('ignora pasta sem o journal (não é pasta de migração)', () => {
		const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'mcurso-migrar-'));
		try {
			fs.mkdirSync(path.join(raiz, 'drizzle', 'meta'), { recursive: true });
			expect(pastaMigrations(raiz)).toBeNull();
		} finally {
			fs.rmSync(raiz, { force: true, recursive: true });
		}
	});
});
