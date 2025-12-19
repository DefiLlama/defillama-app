import { useRef, useState, useEffect, useCallback } from 'react'
import type { UnifiedRowHeaderType } from '../../../types'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { Icon } from '~/components/Icon'

export type CsvExportLevel = 'all' | UnifiedRowHeaderType

const EXPORT_LEVEL_LABELS: Record<CsvExportLevel, string> = {
	all: 'All Protocols',
	chain: 'Chains Only',
	category: 'Categories Only',
	'parent-protocol': 'Protocol Groups Only',
	protocol: 'Protocols Only'
}

interface CsvExportDropdownProps {
	rowHeaders: UnifiedRowHeaderType[]
	onExport: (level: CsvExportLevel) => void
	isLoading: boolean
	disabled: boolean
}

export function CsvExportDropdown({ rowHeaders, onExport, isLoading, disabled }: CsvExportDropdownProps) {
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	const exportOptions: CsvExportLevel[] = ['all', ...rowHeaders.filter((h) => h !== 'protocol')]

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen])

	const handleOptionClick = useCallback(
		(level: CsvExportLevel) => {
			setIsOpen(false)
			onExport(level)
		},
		[onExport]
	)

	const handleButtonClick = useCallback(() => {
		if (disabled) return
		setIsOpen((prev) => !prev)
	}, [disabled])

	return (
		<div ref={dropdownRef} className="relative">
			<ProTableCSVButton
				onClick={handleButtonClick}
				isLoading={isLoading}
				className={`pro-border pro-bg1 pro-hover-bg pro-text1 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
					disabled ? 'cursor-not-allowed opacity-60' : ''
				}`}
			/>
			{isOpen && (
				<div className="absolute top-full right-0 z-50 mt-1 min-w-[180px] rounded-md border border-(--cards-border) bg-(--cards-bg) py-1 shadow-lg">
					{exportOptions.map((level) => (
						<button
							key={level}
							type="button"
							onClick={() => handleOptionClick(level)}
							className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--text-primary) hover:bg-(--divider) transition-colors"
						>
							<Icon name="download-paper" className="h-3 w-3 shrink-0 text-(--text-tertiary)" />
							{EXPORT_LEVEL_LABELS[level]}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
