import fs from 'node:fs';
import path from 'node:path';

// O servidor em produção roda a partir de `build/`, não do checkout: copiar as migrações
// para dentro da saída do build deixa o deploy autocontido, sem depender de a pasta
// `drizzle/` estar publicada ao lado do `build`.
//
// A cópia é da pasta inteira, então as três subpastas de dialeto
// (`sqlite/`, `postgres/`, `mysql/`) vêm junto — o deploy não precisa saber
// qual delas o `DB_PROVIDER` vai pedir, e trocar de dialeto no `.env` não exige
// rebuild.
const origem = path.resolve('drizzle');
const destino = path.resolve('build/drizzle');

fs.rmSync(destino, { force: true, recursive: true });
fs.cpSync(origem, destino, { recursive: true });

const dialetos = fs
	.readdirSync(destino, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => e.name);

console.log(`[mcurso] migrações copiadas para ${destino} (${dialetos.join(', ')})`);
