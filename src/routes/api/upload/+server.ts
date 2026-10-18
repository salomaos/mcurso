import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { json } from '@sveltejs/kit';
import { uploadsDir } from '$lib/server/db';
import { validarUpload } from '$lib/server/uploads';

// Escrita é só do professor (sessão), e a leitura é pública — ver `uploads/[...caminho]`.
export async function POST(event) {
	if (!event.locals.session) {
		return json({ erro: 'Não autenticado' }, { status: 401 });
	}

	// O corpo é lido inteiro (`formData()`) antes de qualquer conferência, então quem barra um
	// corpo absurdo é o `BODY_SIZE_LIMIT` do adapter-node. Conferir o `content-length` aqui
	// antes de ler **piora** o erro: respondendo sem consumir o corpo, o navegador ainda está
	// enviando quando a conexão fecha e o `fetch` morre com `ERR_CONNECTION_RESET` ("Failed to
	// fetch") em vez de mostrar a mensagem — o cliente undici tolera e mente que funciona, o
	// Chrome não. O que sobra é a checagem do arquivo, que é a mensagem amigável.
	const form = await event.request.formData();
	const arquivo = form.get('arquivo');

	if (!(arquivo instanceof File)) {
		return json({ erro: 'Envie um arquivo no campo "arquivo"' }, { status: 400 });
	}

	const conferido = validarUpload(arquivo.name, arquivo.size);
	if (!conferido.ok) {
		return json({ erro: conferido.erro }, { status: 400 });
	}

	await mkdir(uploadsDir, { recursive: true });
	const nome = `${crypto.randomUUID()}.${conferido.ext}`;
	await writeFile(path.join(uploadsDir, nome), Buffer.from(await arquivo.arrayBuffer()));

	return json({ src: `/uploads/${nome}` });
}
