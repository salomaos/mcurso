import { applyAction, enhance } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import type { ActionResult } from '@sveltejs/kit';

type Resultado = ActionResult;

type OpcoesEnviando = {
	/** Devolve `false` para cancelar o envio (ex.: `confirm()` antes de excluir). */
	confirmar?: () => boolean;
	/** Em sucesso, roda depois de soltar os botões e antes do `applyAction`. */
	sucesso?: (resultado: Resultado) => void;
	/** Trata o resultado por conta própria, sem `applyAction` (ex.: exportar no /importar). */
	aoResultado?: (ctx: { result: Resultado }) => void;
};

/**
 * `use:enviando` no `<form>`: submete com `enhance` (fetch, sem reload) e, enquanto
 * a action roda, desabilita os botões de `type="submit"` e mostra o spinner
 * (`btn loading` da ahmardesign + `aria-busy`). O estado some quando o resultado
 * volta. Formulários de exclusão passam o `confirm()` por `confirmar` — o nativo
 * não precisa e o listener do `enhance` roda antes do `onsubmit` delegado.
 */
export function enviando(no: HTMLFormElement, opcoes: OpcoesEnviando = {}) {
	const botoes = () => [...no.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];

	const ligar = () => {
		for (const botao of botoes()) {
			botao.disabled = true;
			botao.classList.add('loading');
			botao.setAttribute('aria-busy', 'true');
		}
	};

	const desligar = () => {
		for (const botao of botoes()) {
			botao.disabled = false;
			botao.classList.remove('loading');
			botao.removeAttribute('aria-busy');
		}
	};

	const parar = enhance(no, ({ cancel }) => {
		if (opcoes.confirmar && !opcoes.confirmar()) {
			cancel();
			return;
		}
		ligar();
		return async (ctx) => {
			desligar();
			if (opcoes.aoResultado) {
				opcoes.aoResultado({ result: ctx.result });
				return;
			}
			if (opcoes.sucesso && ctx.result.type === 'success') opcoes.sucesso(ctx.result);
			if (ctx.result.type === 'success') await invalidateAll();
			await applyAction(ctx.result);
		};
	});

	return parar;
}