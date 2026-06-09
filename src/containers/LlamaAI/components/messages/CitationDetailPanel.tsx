import { useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { PillBody } from './CitationPill'
import {
	accentFor,
	badgeFor,
	citedRowDate,
	describeFigure,
	findCitedCell,
	iconFor,
	mismatchLabel,
	shouldFlagMismatch,
	shouldFlagUnverified,
	unverifiedLabel
} from './citationPillHelpers'
import { useCitationSheet } from './CitationSheetContext'

export function CitationDetailPanel({
	onBackToDashboard,
	advancedProvenance
}: {
	onBackToDashboard?: () => void
	advancedProvenance: boolean
}) {
	const { activeRef, close } = useCitationSheet()
	const [entered, setEntered] = useState(false)

	useEffect(() => {
		if (!activeRef) {
			setEntered(false)
			return
		}
		const raf = requestAnimationFrame(() => setEntered(true))
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close()
		}
		window.addEventListener('keydown', onKey)
		return () => {
			cancelAnimationFrame(raf)
			window.removeEventListener('keydown', onKey)
		}
	}, [activeRef, close])

	if (!activeRef) return null

	const accent = accentFor(activeRef.sourceType)
	const badge = badgeFor(activeRef.sourceType)
	const iconName = iconFor(activeRef.sourceType)
	const headline = activeRef.value ?? activeRef.label
	const citedCell = findCitedCell(activeRef.rows, activeRef.columns, {
		field: activeRef.field,
		rowIndex: activeRef.rowIndex,
		value: activeRef.value
	})
	const description = activeRef.sourceType === 'data' ? describeFigure(activeRef, citedCell) : null
	const citedRow = citedCell && activeRef.rows ? activeRef.rows[citedCell.rowIndex] : null
	const citedDate =
		activeRef.sourceType === 'data' && citedRow
			? citedRowDate(citedRow, activeRef.columns ?? Object.keys(citedRow))
			: null
	const asOfText = citedDate ?? activeRef.asOf
	const mismatch = shouldFlagMismatch(activeRef.verification)
	const unverified = !mismatch && shouldFlagUnverified(activeRef.verification)

	return (
		<>
			<button
				type="button"
				aria-label="Close source detail"
				onClick={close}
				className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden ${
					entered ? 'opacity-100' : 'opacity-0'
				}`}
			/>
			<div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 lg:shrink-0 lg:overflow-hidden lg:pl-2.5">
				<div
					className={`relative flex flex-col overflow-hidden border border-[#e6e6e6] bg-(--cards-bg) transition-all duration-200 ease-out max-lg:max-h-[85vh] max-lg:w-full max-lg:rounded-t-2xl lg:h-full lg:w-[min(26vw,420px)] lg:min-w-[320px] lg:rounded-lg dark:border-[#222324] ${
						entered
							? 'translate-y-0 opacity-100 lg:translate-x-0'
							: 'translate-y-6 opacity-0 lg:translate-x-3 lg:translate-y-0'
					}`}
				>
					<div className="absolute top-0 left-0 h-full w-[3px]" style={{ backgroundColor: accent }} />

					<div className="flex justify-center pt-2 lg:hidden">
						<span className="h-1 w-9 rounded-full bg-[#ccc] dark:bg-[#444]" />
					</div>

					<div className="flex items-start gap-2.5 border-b border-[#e6e6e6] py-3 pr-3 pl-4 dark:border-[#222324]">
						<span
							className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md"
							style={{ backgroundColor: `${accent}1f`, color: accent }}
						>
							<Icon name={iconName} height={12} width={12} />
						</span>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="text-[10.5px] font-semibold tracking-[0.08em] uppercase" style={{ color: accent }}>
								{badge}
							</span>
							{headline ? (
								<span className="text-lg leading-tight font-semibold text-[#111] tabular-nums dark:text-white">
									{headline}
								</span>
							) : null}
							{description ? <span className="text-xs text-[#666] dark:text-[#999]">{description}</span> : null}
							{asOfText ? <span className="text-[11px] text-[#999] dark:text-[#777]">as of {asOfText}</span> : null}
						</div>
						<div className="flex shrink-0 items-center gap-1">
							{onBackToDashboard ? (
								<button
									onClick={onBackToDashboard}
									className="rounded-md px-2 py-1 text-[11px] font-medium text-[#666] transition-colors hover:bg-[#e6e6e6] dark:text-[#999] dark:hover:bg-[#222324]"
								>
									‹ Dashboard
								</button>
							) : null}
							<button
								onClick={close}
								aria-label="Close"
								className="flex size-7 items-center justify-center rounded-md text-[#636e72] transition-colors hover:bg-[#e6e6e6] dark:text-[#8a8f98] dark:hover:bg-[#222324]"
							>
								<Icon name="x" className="size-4" />
							</button>
						</div>
					</div>

					<div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
						{mismatch ? (
							<div className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-2 text-[12px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
								<Icon name="alert-triangle" height={13} width={13} className="mt-px shrink-0" />
								<span>{mismatchLabel(activeRef)}</span>
							</div>
						) : unverified ? (
							<div className="flex items-start gap-1.5 rounded-md bg-[#f4f4f5] px-2.5 py-2 text-[12px] text-[#777] dark:bg-[#1f1f23] dark:text-[#999]">
								<Icon name="help-circle" height={13} width={13} className="mt-px shrink-0" />
								<span>{unverifiedLabel()}</span>
							</div>
						) : null}
						<PillBody reference={activeRef} citedCell={citedCell} advancedProvenance={advancedProvenance} />
					</div>
				</div>
			</div>
		</>
	)
}
