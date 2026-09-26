(() => {
	const $ = (selector, root = document) => root.querySelector(selector);
	const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

	function showStatus(message = 'Alterações salvas') {
		$$('[data-status]').forEach((status) => {
			status.textContent = message;
			status.classList.add('is-saving');
			window.setTimeout(() => status.classList.remove('is-saving'), 500);
		});
	}

	function initSaveButtons() {
		$$('[data-save]').forEach((button) => {
			button.addEventListener('click', () => showStatus());
		});

		document.addEventListener('keydown', (event) => {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
				event.preventDefault();
				showStatus('Salvo com Ctrl+S');
			}
		});
	}

	function initCanvas() {
		const canvas = $('[data-canvas]');
		if (!canvas) return;

		const content = $('[data-canvas-content]', canvas);
		const layout = canvas.closest('.canvas-layout') || canvas.parentElement;
		let selected = $('.canvas-block.is-selected', canvas);

		function selectBlock(block) {
			if (!block) return;
			$$('.canvas-block', canvas).forEach((item) => item.classList.remove('is-selected'));
			block.classList.add('is-selected');
			selected = block;
		}

		function refreshOutline() {
			$$('[data-outline-target]', layout).forEach((item) => {
				item.classList.toggle('is-active', item.dataset.outlineTarget === selected?.dataset.blockId);
			});
		}

		function createBlock() {
			const block = document.createElement('article');
			block.className = 'canvas-block';
			block.dataset.block = '';
			block.dataset.blockId = `novo-${Date.now()}`;
			block.innerHTML = `
				<div class="block-controls" aria-label="Controles do bloco">
					<button class="block-control" type="button" data-action="move-up" title="Mover para cima">↑</button>
					<button class="block-control" type="button" data-action="move-down" title="Mover para baixo">↓</button>
					<button class="block-control" type="button" data-action="duplicate" title="Duplicar">⧉</button>
					<button class="block-control" type="button" data-action="delete" title="Excluir">×</button>
				</div>
				<span class="block-type">Texto</span>
				<h2 contenteditable="true" spellcheck="false" class="editable">Novo bloco</h2>
				<p contenteditable="true" spellcheck="false" class="editable">Escreva o conteúdo deste bloco diretamente na aula.</p>
			`;
			content.append(block);
			selectBlock(block);
			refreshOutline();
			$('h2', block)?.focus();
		}

		function handleAction(button) {
			const block = button.closest('[data-block]');
			if (!block) return;

			const action = button.dataset.action;
			if (action === 'move-up' && block.previousElementSibling) {
				block.previousElementSibling.before(block);
			}
			if (action === 'move-down' && block.nextElementSibling) {
				block.nextElementSibling.after(block);
			}
			if (action === 'duplicate') {
				const copy = block.cloneNode(true);
				copy.classList.remove('is-selected');
				copy.dataset.blockId = `${block.dataset.blockId}-copia-${Date.now()}`;
				block.after(copy);
				selectBlock(copy);
			}
			if (action === 'delete' && content.children.length > 1) {
				const next = block.nextElementSibling || block.previousElementSibling;
				block.remove();
				selectBlock(next);
			}
			refreshOutline();
		}

		canvas.addEventListener('click', (event) => {
			const button = event.target.closest('[data-action]');
			if (button) {
				event.stopPropagation();
				handleAction(button);
				return;
			}

			const block = event.target.closest('[data-block]');
			if (block) {
				selectBlock(block);
				refreshOutline();
			}
		});

		canvas.addEventListener('dblclick', (event) => {
			const editable = event.target.closest('.editable');
			if (editable instanceof HTMLElement) editable.focus();
		});

		$$('[data-add-block]', layout).forEach((button) => {
			button.addEventListener('click', createBlock);
		});

		$$('[data-outline-target]', layout).forEach((item) => {
			item.addEventListener('click', () => {
				const block = $(`[data-block-id="${CSS.escape(item.dataset.outlineTarget || '')}"]`, canvas);
				if (block) {
					selectBlock(block);
					block.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			});
		});

		$$('[data-answer]', canvas).forEach((button) => {
			button.addEventListener('click', (event) => {
				event.stopPropagation();
				$$('[data-answer]', button.parentElement).forEach((option) => option.classList.remove('is-correct'));
				button.classList.add('is-correct');
			});
		});

		$('[data-reset-view]', layout)?.addEventListener('click', () => {
			canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
			selectBlock(selected);
			showStatus('Visualização centralizada');
		});

		refreshOutline();
	}

	function initSplit() {
		const page = $('[data-page="split"]');
		if (!page) return;

		const cards = $$('[data-preview-card]', page);
		const form = $('[data-split-form]', page);
		const titleField = $('[data-split-title]', page);
		const textField = $('[data-split-text]', page);
		const typeField = $('[data-split-type]', page);
		let selected = cards[0];

		function typeName(value) {
			return value === 'heading' ? 'Título' : value === 'callout' ? 'Callout' : 'Texto';
		}

		function selectCard(card) {
			if (!card) return;
			selected = card;
			cards.forEach((item) => item.classList.toggle('is-active', item === card));
			$$('[data-outline-target]', page).forEach((item) => {
				item.classList.toggle('is-active', item.dataset.outlineTarget === card.dataset.previewId);
			});
			titleField.value = card.dataset.title || '';
			textField.value = card.dataset.text || '';
			typeField.value = card.dataset.type || 'text';
		}

		function updateSelected() {
			if (!selected) return;
			selected.dataset.title = titleField.value;
			selected.dataset.text = textField.value;
			selected.dataset.type = typeField.value;
			$('[data-preview-card-title]', selected).textContent = titleField.value;
			$('[data-preview-card-text]', selected).textContent = textField.value;
			$('[data-preview-type]', selected).textContent = typeName(typeField.value);
			showStatus('Prévia atualizada');
		}

		cards.forEach((card) => {
			card.addEventListener('click', () => selectCard(card));
		});

		$$('[data-outline-target]', page).forEach((item) => {
			item.addEventListener('click', () => {
				const card = $(`[data-preview-id="${CSS.escape(item.dataset.outlineTarget || '')}"]`, page);
				if (card) selectCard(card);
			});
		});

		[titleField, textField, typeField].forEach((field) => field.addEventListener('input', updateSelected));
		form?.addEventListener('submit', (event) => {
			event.preventDefault();
			updateSelected();
		});

		selectCard(selected);
	}

	function initDrawer() {
		const page = $('[data-page="drawer"]');
		if (!page) return;

		const drawer = $('[data-drawer]', page);
		const overlay = $('[data-drawer-overlay]', page);
		const titleField = $('[data-drawer-title-field]', page);
		const textField = $('[data-drawer-text-field]', page);
		const typeField = $('[data-drawer-type]', page);
		const cards = $$('[data-drawer-card]', page);
		let selected = null;

		function openDrawer(card) {
			selected = card;
			cards.forEach((item) => item.classList.toggle('is-active', item === card));
			titleField.value = card.dataset.title || '';
			textField.value = card.dataset.text || '';
			typeField.value = $('[data-preview-type]', card)?.textContent || $('.preview-type', card)?.textContent || 'Texto';
			drawer.classList.add('is-open');
			drawer.setAttribute('aria-hidden', 'false');
			overlay.classList.add('is-visible');
			window.setTimeout(() => titleField.focus(), 220);
		}

		function closeDrawer() {
			drawer.classList.remove('is-open');
			drawer.setAttribute('aria-hidden', 'true');
			overlay.classList.remove('is-visible');
		}

		function applyChanges() {
			if (!selected) return;
			selected.dataset.title = titleField.value;
			selected.dataset.text = textField.value;
			$('[data-drawer-title]', selected).textContent = titleField.value;
			$$('[data-drawer-text]', selected).forEach((element) => {
				element.textContent = textField.value;
			});
			const typeLabel = $('[data-preview-type]', selected) || $('.preview-type', selected);
			if (typeLabel) typeLabel.textContent = typeField.value;
			showStatus('Bloco atualizado');
			closeDrawer();
		}

		cards.forEach((card) => {
			card.addEventListener('click', (event) => {
				if (event.target.closest('[data-answer]')) return;
				openDrawer(card);
			});
		});

		$$('[data-drawer-close]', page).forEach((button) => button.addEventListener('click', closeDrawer));
		$('[data-drawer-save]', page)?.addEventListener('click', applyChanges);
		overlay.addEventListener('click', closeDrawer);
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
		});

		$$('[data-answer]', page).forEach((button) => {
			button.addEventListener('click', (event) => {
				event.stopPropagation();
				$$('[data-answer]', button.parentElement).forEach((option) => option.classList.remove('is-correct'));
				button.classList.add('is-correct');
			});
		});
	}

	initSaveButtons();
	initCanvas();
	initSplit();
	initDrawer();
})();
