import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from './db';
import * as authSchema from './db/auth-schema';

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173';

export const MASTER_EMAIL = process.env.APP_MASTER_EMAIL ?? 'professor@mcurso.local';
export const MASTER_PASSWORD = process.env.APP_MASTER_PASSWORD;

if (import.meta.env.DEV && !MASTER_PASSWORD) {
	console.warn('[mcurso] APP_MASTER_PASSWORD não definido no .env — login de senha mestra não funcionará.');
}

export const auth = betterAuth({
	appName: 'mcurso',
	basePath: '/api/auth',
	baseURL,
	secret: process.env.BETTER_AUTH_SECRET ?? 'mcurso-dev-secret-troque-no-env',
	database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 6
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});