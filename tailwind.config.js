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
				},
				wiggle: {
					'0%': { transform: 'rotate(10deg)' },
					'50%': { transform: 'rotate(-10deg)' },
					'100%': { transform: 'rotate(0)' }
				},
				slidein: {
					'0%': {
						opacity: 1,
						right: '-100%'
					},
					'100%': {
						opacity: 1,
						right: '0%'
					}
				}
			},
			animation: {
				loader: 'loader 800ms linear infinite',
				wiggle: 'wiggle 400ms ease',
				slidein: 'slidein 200ms ease'
			}
		}
	},
	plugins: []
}
