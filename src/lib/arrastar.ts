export interface DestinoOrdem {
	lista: string;
	indice: number;
}

export interface OpcoesArrasto {
	grupo: string;
	aoMover: (origemId: string, destino: DestinoOrdem) => void;
}

const MARGEM_ROLAGEM = 72;
const PASSO_ROLAGEM = 14;

const listasPorGrupo = new Map<string, Set<HTMLElement>>();

export function moverItem<T>(lista: T[], de: number, para: number): T[] {
	if (de < 0 || de >= lista.length) return lista;
	const copia = [...lista];
	const [item] = copia.splice(de, 1);
	copia.splice(Math.max(0, Math.min(para, copia.length)), 0, item);
	return copia;
}

function emOrdemDoDocumento(a: HTMLElement, b: HTMLElement): number {
	const posicao = a.compareDocumentPosition(b);
	if (posicao & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
	if (posicao & Node.DOCUMENT_POSITION_PRECEDING) return 1;
	return 0;
}

function listasDoGrupo(grupo: string): HTMLElement[] {
	return [...(listasPorGrupo.get(grupo) ?? [])].sort(emOrdemDoDocumento);
}

export function itensDaLista(lista: HTMLElement, exceto?: HTMLElement | null): HTMLElement[] {
	return [...lista.querySelectorAll<HTMLElement>('[data-arrasto-item]')].filter(
		(item) => item !== exceto
	);
}

function itensDoGrupo(grupo: string, exceto?: HTMLElement | null): HTMLElement[] {
	return listasDoGrupo(grupo).flatMap((lista) => itensDaLista(lista, exceto));
}

function listaDoItem(item: HTMLElement): string {
	return item.closest<HTMLElement>('[data-arrasto-lista]')?.dataset.arrastoLista ?? '';
}

export function arrastar(opcoes: OpcoesArrasto) {
	const { grupo, aoMover } = opcoes;
	return (node: HTMLElement) => iniciar(node, grupo, aoMover);
}

function iniciar(node: HTMLElement, grupo: string, aoMover: OpcoesArrasto['aoMover']) {
	const listas = listasPorGrupo.get(grupo) ?? new Set<HTMLElement>();
	listas.add(node);
	listasPorGrupo.set(grupo, listas);

	let origem: HTMLElement | null = null;
	let origemId = '';
	let inicioY = 0;
	let alvo: HTMLElement | null = null;
	let alvoFim = false;
	let destino: DestinoOrdem | null = null;

	function marcar(item: HTMLElement, fim: boolean) {
		if (alvo === item && alvoFim === fim) return;
		alvo?.classList.remove('arrasto-alvo', 'arrasto-alvo-fim');
		alvo = item;
		alvoFim = fim;
		item.classList.add(fim ? 'arrasto-alvo-fim' : 'arrasto-alvo');
	}

	function limpar() {
		if (origem) {
			origem.classList.remove('arrastando');
			origem.style.transform = '';
		}
		alvo?.classList.remove('arrasto-alvo', 'arrasto-alvo-fim');
		origem = null;
		origemId = '';
		alvo = null;
		alvoFim = false;
		destino = null;
	}

	function atualizar(clientY: number) {
		if (!origem) return;

		const anterior = window.scrollY;
		if (clientY < MARGEM_ROLAGEM) window.scrollBy(0, -PASSO_ROLAGEM);
		else if (clientY > window.innerHeight - MARGEM_ROLAGEM) window.scrollBy(0, PASSO_ROLAGEM);
		inicioY -= window.scrollY - anterior;

		origem.style.transform = `translateY(${clientY - inicioY}px)`;

		const itens = itensDoGrupo(grupo, origem);
		if (itens.length === 0) return;

		const caixa = origem.getBoundingClientRect();
		const centro = caixa.top + caixa.height / 2;

		let indice = itens.length;
		for (let i = 0; i < itens.length; i += 1) {
			const rect = itens[i].getBoundingClientRect();
			if (centro < rect.top + rect.height / 2) {
				indice = i;
				break;
			}
		}

		const referencia = indice >= itens.length ? itens[itens.length - 1] : itens[indice];
		marcar(referencia, indice >= itens.length);
		destino = { lista: listaDoItem(referencia), indice };
	}

	function pressionar(event: PointerEvent) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		const alca = (event.target as HTMLElement).closest('[data-arrasto-alca]');
		if (!alca || !node.contains(alca)) return;
		const item = alca.closest<HTMLElement>('[data-arrasto-item]');
		if (!item) return;

		origem = item;
		origemId = item.dataset.arrastoItem ?? '';
		inicioY = event.clientY;
		item.classList.add('arrastando');
		item.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function arrastarPonteiro(event: PointerEvent) {
		if (!origem) return;
		event.preventDefault();
		atualizar(event.clientY);
	}

	function soltar() {
		const alvoFinal = destino;
		const id = origemId;
		limpar();
		if (alvoFinal && id) aoMover(id, alvoFinal);
	}

	function cancelar() {
		limpar();
	}

	function teclas(event: KeyboardEvent) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		const alca = (event.target as HTMLElement).closest('[data-arrasto-alca]');
		if (!alca || !node.contains(alca)) return;
		const item = alca.closest<HTMLElement>('[data-arrasto-item]');
		if (!item) return;

		const itens = itensDaLista(node);
		const posicao = itens.indexOf(item);
		if (posicao === -1) return;
		const indice = event.key === 'ArrowUp' ? posicao - 1 : posicao + 1;
		if (indice < 0 || indice > itens.length - 2) return;

		event.preventDefault();
		aoMover(item.dataset.arrastoItem ?? '', { lista: node.dataset.arrastoLista ?? '', indice });
	}

	function teclaDeEscape(event: KeyboardEvent) {
		if (event.key === 'Escape' && origem) cancelar();
	}

	node.addEventListener('pointerdown', pressionar);
	node.addEventListener('pointermove', arrastarPonteiro);
	node.addEventListener('pointerup', soltar);
	node.addEventListener('pointercancel', cancelar);
	node.addEventListener('keydown', teclas);
	window.addEventListener('keydown', teclaDeEscape);

	return () => {
		cancelar();
		listas.delete(node);
		if (listas.size === 0) listasPorGrupo.delete(grupo);
		node.removeEventListener('pointerdown', pressionar);
		node.removeEventListener('pointermove', arrastarPonteiro);
		node.removeEventListener('pointerup', soltar);
		node.removeEventListener('pointercancel', cancelar);
		node.removeEventListener('keydown', teclas);
		window.removeEventListener('keydown', teclaDeEscape);
	};
}
