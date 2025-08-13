import { useState, useRef, useEffect } from 'react'
import { Icon } from '~/components/Icon'

interface DashboardSearchProps {
	searchQuery: string
	onSearchChange: (query: string) => void
}

export function DashboardSearch({ searchQuery, onSearchChange }: DashboardSearchProps) {
	return (
		<div className="flex-1 max-w-3xl">
			<div className="flex flex-col sm:flex-row gap-3">
				<div className="flex-1 relative">
					<Icon name="search" height={16} width={16} className="absolute left-3 top-1/2 -translate-y-1/2 pro-text3" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search dashboards by name or description or tags..."
						className="w-full pl-10 pr-4 py-2 bg-(--bg-glass) border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary)"
					/>
				</div>
			</div>
		</div>
	)
}
