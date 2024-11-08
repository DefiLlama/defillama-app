import * as React from 'react'

export function SortIcon({ dir }: { dir: string | boolean }) {
	return (
		<div className="flex flex-col flex-shrink-0 relative top-[1px]">
			<svg
				viewBox="0 0 1024 1024"
				width="10px"
				focusable="false"
				data-icon="caret-up"
				fill={dir === 'asc' ? 'var(--blue)' : 'gray'}
				aria-hidden="true"
				className="block flex-shrink-0 relative top-[2px]"
			>
				<path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"></path>
			</svg>
			<svg
				viewBox="0 0 1024 1024"
				width="10px"
				focusable="false"
				data-icon="caret-down"
				fill={dir === 'desc' ? 'var(--blue)' : 'gray'}
				aria-hidden="true"
				className="block flex-shrink-0 relative bottom-[2px]"
			>
				<path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path>
			</svg>
		</div>
	)
}
