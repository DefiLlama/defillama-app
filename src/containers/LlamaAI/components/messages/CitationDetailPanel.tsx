import * as Ariakit from '@ariakit/react'
import { useEffect, useMemo, useState } from 'react'
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

function useIsMobileCitationSheet() {
	const [isMobile, setIsMobile] = useState(() =>
		typeof window === 'undefined' ? false : window.matchMedia('(max-width: 1023px)').matches
	)

	useEffect(() => {
		const media = window.matchMedia('(max-width: 1023px)')
		const update = () => setIsMobile(media.matches)
		update()
		media.addEventListener('change', update)
		return () => media.removeEventListener('change', update)
	}, [])

	return isMobile
}

export function CitationDetailPanel({
	onBackToDashboard,
	advancedProvenance
}: {
	onBackToDashboard?: () => void
	advancedProvenance: boolean
}) {
	const { activeRef, close } = useCitationSheet()
	const isMobile = useIsMobileCitationSheet()
	const [entered, setEntered] = useState(false)

	useEffect(() => {
		if (!activeRef) {
			setEntered(false)
			return
		}
		const raf = requestAnimationFrame(() => setEntered(true))
		return () => {
			cancelAnimationFrame(raf)
		}
	}, [activeRef])

	const citedCell = useMemo(
		() =>
			activeRef
				? findCitedCell(activeRef.rows, activeRef.columns, {
						field: activeRef.field,
						rowIndex: activeRef.rowIndex,
						value: activeRef.value
					})
				: null,
		[activeRef]
	)

	if (!activeRef) return null

	const accent = accentFor(activeRef.sourceType)
	const badge = badgeFor(activeRef.sourceType)
	const iconName = iconFor(activeRef.sourceType)
	const headline = activeRef.value ?? activeRef.label
	const description = activeRef.sourceType === 'data' ? describeFigure(activeRef, citedCell) : null
	const citedRow = citedCell && activeRef.rows ? activeRef.rows[citedCell.rowIndex] : null
	const citedDate =
		activeRef.sourceType === 'data' && citedRow
			? citedRowDate(citedRow, activeRef.columns ?? Object.keys(citedRow))
			: null
	const asOfText = citedDate ?? activeRef.asOf
	const mismatch = shouldFlagMismatch(activeRef.verification)
	const unverified = !mismatch && shouldFlagUnverified(activeRef.verification)

	const panel = (mode: 'mobile' | 'desktop') => {
		const panelClass =
			mode === 'mobile'
				? `relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#e6e6e6] bg-(--cards-bg) transition-all duration-200 ease-out dark:border-[#222324] ${
						entered ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
					}`
				: `relative flex h-full w-[min(26vw,420px)] min-w-[320px] flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) transition-all duration-200 ease-out dark:border-[#222324] ${
						entered ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0'
					}`

		return (
			<div className={panelClass}>
				<div className="absolute top-0 left-0 h-full w-[3px]" style={{ backgroundColor: accent }} />

				{mode === 'mobile' ? (
					<div className="flex justify-center pt-2">
						<span className="h-1 w-9 rounded-full bg-[#ccc] dark:bg-[#444]" />
					</div>
				) : null}

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
								type="button"
								onClick={onBackToDashboard}
								className="rounded-md px-2 py-1 text-[11px] font-medium text-[#666] transition-colors hover:bg-[#e6e6e6] dark:text-[#999] dark:hover:bg-[#222324]"
							>
								‹ Dashboard
							</button>
						) : null}
						{mode === 'mobile' ? (
							<Ariakit.DialogDismiss
								aria-label="Close"
								className="flex size-7 items-center justify-center rounded-md text-[#636e72] transition-colors hover:bg-[#e6e6e6] dark:text-[#8a8f98] dark:hover:bg-[#222324]"
							>
								<Icon name="x" className="size-4" />
							</Ariakit.DialogDismiss>
						) : (
							<button
								type="button"
								onClick={close}
								aria-label="Close"
								className="flex size-7 items-center justify-center rounded-md text-[#636e72] transition-colors hover:bg-[#e6e6e6] dark:text-[#8a8f98] dark:hover:bg-[#222324]"
							>
								<Icon name="x" className="size-4" />
							</button>
						)}
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
		)
	}

	if (isMobile) {
		return (
			<Ariakit.DialogProvider
				open={true}
				setOpen={(open) => {
					if (!open) close()
				}}
			>
				<Ariakit.Dialog
					aria-label="Source detail"
					portal
					unmountOnHide
					backdrop={
						<div
							className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
								entered ? 'opacity-100' : 'opacity-0'
							}`}
						/>
					}
					className="fixed inset-x-0 bottom-0 z-50 m-0 bg-transparent p-0 outline-none"
				>
					{panel('mobile')}
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		)
	}

	return <div className="hidden shrink-0 overflow-hidden pl-2.5 lg:block">{panel('desktop')}</div>
}
