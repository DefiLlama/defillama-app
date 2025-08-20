import { useState, useRef, useEffect } from 'react'
import { Icon } from '~/components/Icon'

interface DashboardSearchProps {
	searchQuery: string
	onSearchChange: (query: string) => void
}

export function DashboardSearch({ searchQuery, onSearchChange }: DashboardSearchProps) {
	return (
		<div className="max-w-3xl flex-1">
			<div className="flex flex-col gap-3 sm:flex-row">
				<div className="relative flex-1">
					<Icon name="search" height={16} width={16} className="pro-text3 absolute top-1/2 left-3 -translate-y-1/2" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search dashboards by name or description or tags..."
						className="pro-border pro-text1 placeholder:pro-text3 w-full border bg-(--bg-glass) py-2 pr-4 pl-10 focus:border-(--primary) focus:outline-hidden"
					/>
				</div>
			</div>
		</div>
	)
}
