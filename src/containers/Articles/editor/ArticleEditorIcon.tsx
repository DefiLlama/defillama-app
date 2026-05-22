export function Icon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
	const props = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.75,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const
	}
	switch (name) {
		case 'bold':
			return (
				<svg {...props}>
					<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
				</svg>
			)
		case 'italic':
			return (
				<svg {...props}>
					<line x1="14" y1="5" x2="10" y2="19" />
					<line x1="9" y1="5" x2="15" y2="5" />
					<line x1="9" y1="19" x2="15" y2="19" />
				</svg>
			)
		case 'underline':
			return (
				<svg {...props}>
					<path d="M7 5v7a5 5 0 0 0 10 0V5" />
					<line x1="6" y1="20" x2="18" y2="20" />
				</svg>
			)
		case 'strike':
			return (
				<svg {...props}>
					<line x1="4" y1="12" x2="20" y2="12" />
					<path d="M16 7a4 4 0 0 0-8-1c0 2 2 3 4 3M8 17a4 4 0 0 0 8 1c0-1.5-1-2.5-2.5-3" />
				</svg>
			)
		case 'code':
			return (
				<svg {...props}>
					<polyline points="8 6 3 12 8 18" />
					<polyline points="16 6 21 12 16 18" />
				</svg>
			)
		case 'highlight':
			return (
				<svg {...props}>
					<path d="M15 5l4 4-9 9H6v-4z" />
					<line x1="14" y1="6" x2="18" y2="10" />
					<line x1="3" y1="22" x2="21" y2="22" />
				</svg>
			)
		case 'link':
			return (
				<svg {...props}>
					<path d="M10 13a4 4 0 0 0 5.5 0l3-3a4 4 0 0 0-5.5-5.5l-1.5 1.5" />
					<path d="M14 11a4 4 0 0 0-5.5 0l-3 3a4 4 0 0 0 5.5 5.5l1.5-1.5" />
				</svg>
			)
		case 'pencil':
			return (
				<svg {...props}>
					<path d="M14 4l6 6-10 10H4v-6z" />
					<line x1="13" y1="5" x2="19" y2="11" />
				</svg>
			)
		case 'plus':
			return (
				<svg {...props}>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			)
		case 'check':
			return (
				<svg {...props}>
					<polyline points="5 12 10 17 19 8" />
				</svg>
			)
		case 'x':
			return (
				<svg {...props}>
					<line x1="6" y1="6" x2="18" y2="18" />
					<line x1="6" y1="18" x2="18" y2="6" />
				</svg>
			)
		case 'trash':
			return (
				<svg {...props}>
					<polyline points="3 6 5 6 21 6" />
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					<line x1="10" y1="11" x2="10" y2="17" />
					<line x1="14" y1="11" x2="14" y2="17" />
				</svg>
			)
		case 'external':
			return (
				<svg {...props}>
					<path d="M14 5h5v5" />
					<line x1="10" y1="14" x2="19" y2="5" />
					<path d="M19 13v6H5V5h6" />
				</svg>
			)
		case 'h2':
			return (
				<svg {...props}>
					<text
						x="12"
						y="16"
						textAnchor="middle"
						fontSize="13"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						H2
					</text>
				</svg>
			)
		case 'h3':
			return (
				<svg {...props}>
					<text
						x="12"
						y="16"
						textAnchor="middle"
						fontSize="13"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						H3
					</text>
				</svg>
			)
		case 'list-ul':
			return (
				<svg {...props}>
					<line x1="9" y1="6" x2="20" y2="6" />
					<line x1="9" y1="12" x2="20" y2="12" />
					<line x1="9" y1="18" x2="20" y2="18" />
					<circle cx="5" cy="6" r="0.8" fill="currentColor" />
					<circle cx="5" cy="12" r="0.8" fill="currentColor" />
					<circle cx="5" cy="18" r="0.8" fill="currentColor" />
				</svg>
			)
		case 'list-ol':
			return (
				<svg {...props}>
					<line x1="10" y1="6" x2="20" y2="6" />
					<line x1="10" y1="12" x2="20" y2="12" />
					<line x1="10" y1="18" x2="20" y2="18" />
					<text
						x="4"
						y="8"
						fontSize="6"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						1
					</text>
					<text
						x="4"
						y="14"
						fontSize="6"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						2
					</text>
					<text
						x="4"
						y="20"
						fontSize="6"
						fontWeight="700"
						fontFamily="ui-sans-serif, system-ui, sans-serif"
						fill="currentColor"
						stroke="none"
					>
						3
					</text>
				</svg>
			)
		case 'quote':
			return (
				<svg {...props}>
					<path d="M7 7c-2 0-3 1.5-3 3v3h4v-3H6c0-1 .5-2 1.5-2zM17 7c-2 0-3 1.5-3 3v3h4v-3h-2c0-1 .5-2 1.5-2z" />
				</svg>
			)
		case 'code-block':
			return (
				<svg {...props}>
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<polyline points="9 10 7 12 9 14" />
					<polyline points="15 10 17 12 15 14" />
				</svg>
			)
		case 'chart':
			return (
				<svg {...props}>
					<path d="M4 19V5M4 19h16" />
					<path d="M8 15l3-4 3 3 4-7" />
				</svg>
			)
		case 'callout':
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
					<line x1="12" y1="8" x2="12" y2="13" />
					<circle cx="12" cy="16" r="0.6" fill="currentColor" />
				</svg>
			)
		case 'cite':
			return (
				<svg {...props}>
					<path d="M6 5h-2v14h2M18 5h2v14h-2" />
					<line x1="9" y1="9" x2="15" y2="9" />
					<line x1="9" y1="13" x2="15" y2="13" />
					<line x1="9" y1="17" x2="13" y2="17" />
				</svg>
			)
		case 'undo':
			return (
				<svg {...props}>
					<path d="M9 14l-4-4 4-4" />
					<path d="M5 10h9a5 5 0 1 1 0 10h-3" />
				</svg>
			)
		case 'redo':
			return (
				<svg {...props}>
					<path d="M15 14l4-4-4-4" />
					<path d="M19 10h-9a5 5 0 1 0 0 10h3" />
				</svg>
			)
		case 'sliders':
			return (
				<svg {...props}>
					<line x1="4" y1="7" x2="20" y2="7" />
					<line x1="4" y1="17" x2="20" y2="17" />
					<circle cx="9" cy="7" r="2.2" fill="var(--cards-bg)" />
					<circle cx="15" cy="17" r="2.2" fill="var(--cards-bg)" />
				</svg>
			)
		case 'eye':
			return (
				<svg {...props}>
					<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			)
		case 'table':
			return (
				<svg {...props}>
					<rect x="3.5" y="5" width="17" height="14" rx="1.5" />
					<line x1="3.5" y1="10" x2="20.5" y2="10" />
					<line x1="3.5" y1="14.5" x2="20.5" y2="14.5" />
					<line x1="9.5" y1="5" x2="9.5" y2="19" />
					<line x1="15.5" y1="5" x2="15.5" y2="19" />
				</svg>
			)
		case 'embed':
			return (
				<svg {...props}>
					<rect x="3.5" y="5" width="17" height="14" rx="1.5" />
					<path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
				</svg>
			)
		case 'more':
			return (
				<svg {...props}>
					<circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
					<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
					<circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
				</svg>
			)
		case 'image':
			return (
				<svg {...props}>
					<rect x="3" y="5" width="18" height="14" rx="1.5" />
					<circle cx="9" cy="10" r="1.5" />
					<path d="m21 16-5-5-4 4-2-2-7 7" />
				</svg>
			)
		case 'people':
			return (
				<svg {...props}>
					<circle cx="9" cy="9" r="3" />
					<path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
					<circle cx="16.5" cy="10.5" r="2.5" />
					<path d="M14.5 19a4.5 4.5 0 0 1 6 0" />
				</svg>
			)
		default:
			return null
	}
}
