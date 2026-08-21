import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	const apiProxy = {
		target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
		changeOrigin: true,
		rewrite: (requestPath: string) => requestPath.replace(/^\/api/, ''),
	}

	return {
		plugins: [react()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, 'src'),
			},
		},
		server:{
			host: true,
			proxy: {
				'/api': apiProxy,
			},
			watch:{
				usePolling: true,
			},
		},
		preview: {
			host: true,
			proxy: {
				'/api': apiProxy,
			},
		},
	}
})
