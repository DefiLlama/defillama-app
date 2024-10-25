/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'selector',
	content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			fontFamily: {
				inter: ['Inter var', 'sans-serif'],
				jetbrains: ['JetBrains Mono', 'monospace']
			}
		}
	},
	plugins: []
}
