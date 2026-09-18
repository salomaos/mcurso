import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [...configDefaults.exclude, 'e2e/**'],
		environment: 'node'
	}
});