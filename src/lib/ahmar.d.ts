// Tipagem global do helper AHMAR injetado por ahmardesign.js (cliente apenas).

export interface AHMARApi {
	init(): void;
	setTheme(theme: string): void;
	toast(message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number): void;
	openModal(id: string): void;
	closeModal(id: string): void;
}

declare global {
	interface Window {
		AHMAR?: AHMARApi;
	}
}

export {};