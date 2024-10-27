/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'selector',
	content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			fontFamily: {
				inter: ['Inter var', 'sans-serif'],
				jetbrains: ['JetBrains Mono', 'monospace']
			},
			colors: {},
			keyframes: {
				loader: {
					'0%': { transform: 'scale(1)' },
					'60%': { transform: 'scale(1.1)' },
					'100%': { transform: 'scale(1)' }
				}
			},
			animation: {
				loader: 'loader 800ms linear infinite'
			}
		}
	},
	plugins: []
}
