import { createAuthClient } from 'better-auth/svelte';
import { browser } from '$app/environment';

export const authClient =
	browser && typeof window !== 'undefined'
		? createAuthClient({ baseURL: window.location.origin })
		: createAuthClient();