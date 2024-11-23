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
				},
				slideup: {
					'0%': {
						opacity: 0,
						transform: 'translateY(100%)'
					},
					'100%': {
						opacity: 1,
						transform: 'translateY(0%)'
					}
				},
				linebeat: {
					'0%': {
						left: 0,
						'border-top-left-radius': '8px',
						'border-top-right-radius': 0
					},

					'50%': {
						'border-radius': '8px'
					},
					'100%': {
						left: 'calc(100% - 30%)',
						'border-top-left-radius': 0,
						'border-top-right-radius': '8px'
					}
				}
			},
			animation: {
				loader: 'loader 800ms linear infinite',
				wiggle: 'wiggle 300ms ease-out',
				slidein: 'slidein 300ms ease-out',
				slideup: 'slideup 300ms ease-out',
				linebeat: 'linebeat 1s ease-in-out infinite alternate'
			}
		}
	},
	plugins: []
}
