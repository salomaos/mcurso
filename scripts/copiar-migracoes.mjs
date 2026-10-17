import fs from 'node:fs';
import path from 'node:path';

// O servidor em produção roda a partir de `build/`, não do checkout: copiar as migrações
// para dentro da saída do build deixa o deploy autocontido, sem depender de a pasta
// `drizzle/` estar publicada ao lado do `build`. As duas pastas vão juntas porque o
// dialeto só é escolhido em runtime (`DB_DIALECT`) — o build não sabe qual usar.
const PASTAS = [
	{ origem: 'drizzle', destino: 'build/drizzle' },
	{ origem: 'drizzle-mysql', destino: 'build/drizzle-mysql' }
];

for (const { origem, destino } of PASTAS) {
	const daqui = path.resolve(origem);

	if (!fs.existsSync(daqui)) {
		console.log(`[mcurso] pasta ${origem} não existe — nada a copiar`);
		continue;
	}

	const paraLa = path.resolve(destino);
	fs.rmSync(paraLa, { force: true, recursive: true });
	fs.cpSync(daqui, paraLa, { recursive: true });
	console.log(`[mcurso] migrações copiadas para ${paraLa}`);
}
