import { useState } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent } from '~/utils'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

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
					{data.logo && (
						<TokenLogo 
							logo={data.logo} 
							fallbackLogo={data.fallbackLogo}
							className="w-8 h-8 flex-shrink-0"
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
	if (column.cell) {
		return column.cell({ getValue: () => data[column.accessorKey], row: { original: data } })
	}
	
	const value = data[column.accessorKey]
	
	// Auto-format common data types
	if (typeof value === 'number') {
		if (column.accessorKey.includes('percent') || column.accessorKey.includes('change')) {
			return formattedPercent(value)
		}
		if (column.accessorKey.includes('tvl') || column.accessorKey.includes('volume')) {
			return formattedNum(value, true)
		}
		return formattedNum(value)
	}
	
	return value || '-'
}

// Hook for mobile detection
export function useMobileView() {
	const [isMobile, setIsMobile] = useState(false)
	
	useState(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}
		
		checkMobile()
		window.addEventListener('resize', checkMobile)
		
		return () => window.removeEventListener('resize', checkMobile)
	}, [])
	
	return isMobile
}