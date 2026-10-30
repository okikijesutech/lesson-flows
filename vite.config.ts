import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Lagos Teacher Assistant',
				short_name: 'LagosLessonAI',
				description: 'NERDC Standards & Lagos State Unified Schemes AI Lesson Note Generator',
				theme_color: '#004D40',
				background_color: '#F4F6F8',
				display: 'standalone',
				icons: [
					{
						src: '/favicon.svg',
						sizes: '192x192 512x512',
						type: 'image/svg+xml'
					}
				]
			}
		})
	],
	server: {
		port: 5173,
		proxy: {
			'/api': 'http://127.0.0.1:8000'
		}
	}
});
