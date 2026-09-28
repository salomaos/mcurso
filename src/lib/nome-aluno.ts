// Nome do aluno na página da atividade.
//
// `sessionStorage` (e não `localStorage`) porque a intenção é esquecer ao fim da
// sessão do navegador: o nome fica no aba, some ao fechar e não viaja para o
// próximo aluno do mesmo computador. Nada é enviado ao servidor — o valor vai no
// `form` da própria action, junto com as respostas.

export const CHAVE_NOME = 'mcurso:atividade:nome';

// `sessionStorage` pode lançar (modo privado, storage bloqueado): aí é só não ter
// memória do nome entre visitas.
export function lerNome(): string {
	try {
		return sessionStorage.getItem(CHAVE_NOME) ?? '';
	} catch {
		return '';
	}
}

export function guardarNome(nome: string) {
	try {
		if (nome) sessionStorage.setItem(CHAVE_NOME, nome);
		else sessionStorage.removeItem(CHAVE_NOME);
	} catch {
		// Sem storage disponível: o campo segue funcionando na sessão da página.
	}
}
