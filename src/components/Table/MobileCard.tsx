import { useState, useEffect } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent } from '~/utils'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ICONS_CDN } from '~/constants'

interface MobileCardProps {
	data: any
	columns: Array<{
		accessorKey: string
		header: string
		cell?: (info: any) => React.ReactNode
		enableSorting?: boolean
		meta?: {
			align?: 'start' | 'end' | 'center'
			headerHelperText?: string
		}
	}>
	onRowClick?: (data: any) => void
	href?: string
	className?: string
}

export function MobileCard({ data, columns, onRowClick, href, className = '' }: MobileCardProps) {
	const [expanded, setExpanded] = useState(false)
	
	// Extract primary fields (shown by default)
	const primaryFields = columns.slice(0, 3)
	const secondaryFields = columns.slice(3)
	
	const CardContent = () => (
		<div className={`bg-(--cards-bg) border border-[#d4d4d8] dark:border-[#3f3f46] rounded-lg p-4 mobile-card mobile-shadow ${className}`}>
			{/* Header with name and primary metric */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					{data.slug && (
						<TokenLogo 
							logo={`${ICONS_CDN}/protocols/${data.slug}?w=48&h=48`}
							size={32}
						/>
					)}
					<div className="min-w-0 flex-1">
						<h3 className="font-medium text-(--text1) truncate">
							{data.name || data.displayName}
						</h3>
						{data.category && (
							<p className="text-xs text-(--text3) truncate">
								{data.category}
							</p>
						)}
					</div>
				</div>
				
				{/* Primary metric (usually TVL or volume) */}
				{primaryFields[1] && (
					<div className="text-right">
						<div className="font-medium text-(--text1)">
							{renderCell(primaryFields[1], data)}
						</div>
						<div className="text-xs text-(--text3)">
							{primaryFields[1].header}
						</div>
					</div>
				)}
			</div>
			
			{/* Key metrics row */}
			<div className="grid grid-cols-2 gap-4 mb-3">
				{primaryFields.slice(2).map((column, index) => (
					<div key={column.accessorKey} className="text-center">
						<div className="font-medium text-(--text1) text-sm">
							{renderCell(column, data)}
						</div>
						<div className="text-xs text-(--text3)">
							{column.header}
						</div>
					</div>
				))}
			</div>
			
			{/* Expandable section */}
			{secondaryFields.length > 0 && (
				<>
					<button
						onClick={(e) => {
							e.stopPropagation()
							setExpanded(!expanded)
						}}
						className="flex items-center justify-center gap-2 w-full py-2 text-sm text-(--text3) hover:text-(--text1) transition-colors mobile-button-feedback mobile-touch-target"
					>
						<span>{expanded ? 'Show less' : 'Show more'}</span>
						<Icon 
							name="chevron-down" 
							height={16} 
							width={16}
							className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
						/>
					</button>
					
					{expanded && (
						<div className="pt-3 border-t border-[#e5e7eb] dark:border-[#374151] mt-3">
							<div className="grid grid-cols-2 gap-4">
								{secondaryFields.map((column) => (
									<div key={column.accessorKey} className="text-center">
										<div className="font-medium text-(--text1) text-sm">
											{renderCell(column, data)}
										</div>
										<div className="text-xs text-(--text3)">
											{column.header}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	)
	
	if (href) {
		return (
			<BasicLink href={href} className="block">
				<CardContent />
			</BasicLink>
		)
	}
	
	if (onRowClick) {
		return (
			<button 
				onClick={() => onRowClick(data)}
				className="block w-full text-left mobile-touch-target"
			>
				<CardContent />
			</button>
		)
	}
	
	return <CardContent />
}

function renderCell(column: any, data: any) {
	let value;
	
	// Get value using accessor function if available, otherwise use accessorKey
	if (column.accessorFn && typeof column.accessorFn === 'function') {
		value = column.accessorFn(data)
	} else if (column.accessorKey) {
		value = data[column.accessorKey]
	} else {
		value = null
	}
	
	// Use the original cell function if available with proper context
	if (column.cell && typeof column.cell === 'function') {
		try {
			return column.cell({ 
				getValue: () => value, 
				row: { original: data },
				renderValue: () => value,
				cell: { getContext: () => ({ getValue: () => value, row: { original: data } }) }
			})
		} catch (error) {
			// Fall back to simple value rendering if cell function fails
			console.warn('Mobile card cell rendering error:', error)
		}
	}
	
	// Fallback: Format the value based on column type
	if (value === null || value === undefined) {
		return '-'
	}
	
	// Auto-format common data types
	if (typeof value === 'number') {
		// Handle percentage changes
		if (column.id?.includes('change') || column.id?.includes('percent')) {
			return (
				<span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
					{formattedPercent(value)}
				</span>
			)
		}
		// Handle currency values (TVL, fees, revenue)
		if (column.id?.includes('tvl') || column.id?.includes('fees') || column.id?.includes('revenue')) {
			return formattedNum(value, true)
		}
		return formattedNum(value)
	}
	
	return value || '-'
}

// Hook for mobile detection
export function useMobileView() {
	const [isMobile, setIsMobile] = useState(false)
	
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}
		
		checkMobile()
		window.addEventListener('resize', checkMobile)
		
		return () => window.removeEventListener('resize', checkMobile)
	}, [])
	
	return isMobile
}