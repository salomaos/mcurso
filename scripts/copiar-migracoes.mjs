import fs from 'node:fs';
import path from 'node:path';

// O servidor em produção roda a partir de `build/`, não do checkout: copiar as migrações
// para dentro da saída do build deixa o deploy autocontido, sem depender de a pasta
// `drizzle/` estar publicada ao lado do `build`.
const origem = path.resolve('drizzle');
const destino = path.resolve('build/drizzle');

fs.rmSync(destino, { force: true, recursive: true });
fs.cpSync(origem, destino, { recursive: true });

console.log(`[mcurso] migrações copiadas para ${destino}`);
