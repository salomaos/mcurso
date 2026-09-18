declare module '@ahmartecnologias/ahmardesign/ahmardesign.js' {
	const ahmardesign: {
		init: () => void;
		setTheme: (tema: string) => void;
		[chave: string]: unknown;
	};
	export default ahmardesign;
}