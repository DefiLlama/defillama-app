import { useCallback, useEffect, useRef, useState } from 'react'
import { ComparisonCell, SELECTED_COLUMN_HIGHLIGHT } from '~/containers/Subscription/components'
import { PLAN_META_BY_CYCLE } from '~/containers/Subscription/data'
import type { BillingCycle, ComparisonSection, PlanKey } from '~/containers/Subscription/types'

/* ── Style maps ────────────────────────────────────────────────────── */

const planHeadStyles = {
	selected:
		'border-x border-(--sub-brand-primary) bg-[rgba(31,103,210,0.06)] dark:bg-(--sub-brand-primary-alpha-5) md:rounded-t-[16px]',
	default:
		'border-(--sub-mobile-table-border) md:border-(--sub-desktop-table-border) md:bg-white dark:md:bg-transparent'
}

const planHeadButtonStyles = {
	selected: 'border-(--sub-brand-primary) bg-(--sub-brand-primary) text-white',
	default:
		'border-(--sub-border-slate-200) bg-white text-(--sub-text-slate-900) dark:border-(--sub-border-strong) dark:bg-transparent dark:text-white md:border-(--sub-border-muted) md:text-(--sub-ink-primary) dark:md:border-(--sub-border-strong) dark:md:bg-transparent dark:md:text-white'
}

function SelectedColumnRails({
	left,
	width,
	roundBottom = false
}: {
	left: number
	width: number
	roundBottom?: boolean
}) {
	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none absolute -top-px bottom-0 z-20 border-x border-(--sub-brand-primary) ${roundBottom ? 'rounded-b-[16px] border-b' : ''}`}
			style={{ left: `${left}px`, width: `${width}px` }}
		/>
	)
}

function PlanGridBottomOutline({ left, width }: { left: number; width: number }) {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute bottom-0 z-0 h-[41px] rounded-br-[16px] rounded-bl-[16px] border-b border-(--sub-mobile-table-border) md:h-[36px] md:rounded-br-[24px] md:rounded-bl-[24px] md:border-(--sub-desktop-table-border)"
			style={{ left: `${left}px`, width: `${width}px` }}
		/>
	)
}

/* ── ComparisonPlanHead ────────────────────────────────────────────── */

function ComparisonPlanHead({
	plan,
	billingCycle,
	isFirst,
	isLast,
	isSelected,
	onAction
}: {
	plan: PlanKey
	billingCycle: BillingCycle
	isFirst: boolean
	isLast: boolean
	isSelected: boolean
	onAction?: (plan: PlanKey) => void
}) {
	const meta = PLAN_META_BY_CYCLE[billingCycle][plan]
	const colStyle = isSelected ? planHeadStyles.selected : planHeadStyles.default
	const btnStyle = isSelected ? planHeadButtonStyles.selected : planHeadButtonStyles.default
	const edgeBorderClass = isSelected ? '' : `${isFirst ? 'border-l' : ''} ${isLast ? 'border-r' : ''}`
	const slashIdx = meta.price.indexOf('/')
	const priceValue = slashIdx >= 0 ? meta.price.slice(0, slashIdx) : meta.price
	const priceUnit = slashIdx >= 0 ? meta.price.slice(slashIdx) : null

	return (
		<div
			role="columnheader"
			className={`box-border w-[132px] shrink-0 border-t md:w-[146px] ${colStyle} ${edgeBorderClass} ${isFirst ? 'rounded-tl-[16px] md:rounded-tl-[24px]' : ''} ${isLast ? 'rounded-tr-[16px] md:rounded-tr-[24px]' : ''}`}
		>
			<div className="flex h-full flex-col justify-between p-3 md:p-5">
				<div>
					<p className="text-[14px] leading-4 font-medium text-(--sub-text-navy-900) md:text-lg md:leading-5 md:text-(--sub-ink-primary) dark:text-white dark:md:text-white">
						{meta.title}
					</p>
					<div className="mt-1 flex items-end gap-px">
						<p className="bg-linear-to-r from-(--sub-brand-secondary) to-(--sub-brand-softest) bg-clip-text text-[12px] leading-[17px] font-medium text-transparent md:text-sm">
							{priceValue}
						</p>
						{priceUnit ? (
							<p className="text-[12px] leading-4 text-(--sub-mobile-text-muted) md:text-xs md:text-(--sub-desktop-text-muted)">
								{priceUnit}
							</p>
						) : null}
					</div>
				</div>
				<button
					type="button"
					className={`h-7 rounded-[6px] border px-2 text-[10px] leading-3 md:h-8 md:rounded-lg md:text-xs ${btnStyle}`}
					onClick={() => onAction?.(plan)}
				>
					{meta.action}
				</button>
			</div>
		</div>
	)
}

/* ── Overlay metrics from known column widths ─────────────────────── */

const LABEL_W = { mobile: 233, desktop: 400 }
const PLAN_W = { mobile: 132, desktop: 146 }
const HORIZONTAL_SCROLL_AREA_CLASSNAME =
	'no-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]'
const COMPARISON_ROW_CLASSNAME = 'relative flex h-[41px] md:h-[36px]'
const WRAPPED_COMPARISON_ROW_CLASSNAME = 'relative flex min-h-[41px] md:h-[36px]'
const COMPARISON_ROW_HEADER_CLASSNAME =
	'sticky left-0 z-30 box-border flex shrink-0 w-[233px] items-center bg-white px-2 text-[14px] leading-[21px] text-(--sub-mobile-text-muted) md:w-[400px] md:px-4 md:text-xs md:text-(--sub-desktop-text-muted) dark:bg-(--sub-mobile-table-section-bg) dark:md:bg-(--sub-desktop-table-section-bg)'
const WRAPPED_COMPARISON_ROW_HEADER_CLASSNAME =
	'sticky left-0 z-30 box-border flex shrink-0 w-[233px] items-start bg-white px-2 py-2 text-[14px] leading-[21px] text-(--sub-mobile-text-muted) md:w-[400px] md:items-center md:px-4 md:py-0 md:text-xs md:text-(--sub-desktop-text-muted) dark:bg-(--sub-mobile-table-section-bg) dark:md:bg-(--sub-desktop-table-section-bg)'
const COMPARISON_ROW_LABEL_CLASSNAME = 'block w-full overflow-hidden text-ellipsis whitespace-nowrap'
const WRAPPED_COMPARISON_ROW_LABEL_CLASSNAME =
	'block w-full whitespace-normal break-words md:overflow-hidden md:text-ellipsis md:whitespace-nowrap'

function computeOverlayMetrics(planOrder: PlanKey[], selectedPlan: PlanKey) {
	const isMd = window.matchMedia('(min-width: 768px)').matches
	const labelW = isMd ? LABEL_W.desktop : LABEL_W.mobile
	const planW = isMd ? PLAN_W.desktop : PLAN_W.mobile
	const selectedIndex = planOrder.indexOf(selectedPlan)

	return {
		selectedLeft: labelW + selectedIndex * planW,
		selectedWidth: planW,
		planGridLeft: labelW,
		planGridWidth: planOrder.length * planW
	}
}

/* ── SubscriptionComparisonSection ─────────────────────────────────── */

export function SubscriptionComparisonSection({
	planOrder,
	comparisonSections,
	billingCycle,
	selectedPlan,
	onPlanAction
}: {
	planOrder: PlanKey[]
	comparisonSections: ComparisonSection[]
	billingCycle: BillingCycle
	selectedPlan: PlanKey
	onPlanAction?: (plan: PlanKey) => void
}) {
	const bodyScrollRef = useRef<HTMLDivElement>(null)
	const headerPlanTrackRef = useRef<HTMLDivElement>(null)

	const [overlayMetrics, setOverlayMetrics] = useState<{
		selectedLeft: number
		selectedWidth: number
		planGridLeft: number
		planGridWidth: number
	} | null>(null)

	/* ── Compute overlay metrics from known widths ── */
	useEffect(() => {
		const update = () => setOverlayMetrics(computeOverlayMetrics(planOrder, selectedPlan))
		update()

		const mq = window.matchMedia('(min-width: 768px)')
		mq.addEventListener('change', update)

		return () => {
			mq.removeEventListener('change', update)
		}
	}, [selectedPlan, planOrder])

	/* ── Sync horizontal scroll: body → header track ── */
	const syncHeaderTrackOffset = useCallback((nextScrollLeft?: number) => {
		const headerPlanTrack = headerPlanTrackRef.current
		const bodyScroll = bodyScrollRef.current
		if (!headerPlanTrack || !bodyScroll) return

		const scrollLeft = nextScrollLeft ?? bodyScroll.scrollLeft
		headerPlanTrack.style.transform = `translate3d(${-scrollLeft}px, 0, 0)`
	}, [])

	const onBodyScroll = useCallback(() => {
		syncHeaderTrackOffset()
	}, [syncHeaderTrackOffset])

	useEffect(() => {
		syncHeaderTrackOffset()
	}, [syncHeaderTrackOffset, billingCycle, planOrder, selectedPlan])

	return (
		<section className="mt-12 bg-white py-12 md:mt-0 md:py-20 dark:bg-(--sub-mobile-table-section-bg) md:dark:bg-(--sub-desktop-table-section-bg)">
			<div className="mx-auto w-full px-2 md:max-w-[984px] md:px-0">
				{/* ── Sticky plan header (mobile: sticky top-0, desktop: static) ── */}
				<div className="sticky top-0 z-40 overflow-hidden bg-white md:static dark:bg-(--sub-mobile-table-section-bg) dark:md:bg-(--sub-desktop-table-section-bg)">
					<div className="flex" role="row">
						<div
							role="columnheader"
							className="sticky left-0 z-30 box-border flex h-[132px] w-[233px] shrink-0 items-center bg-white px-2 md:h-[129px] md:w-[400px] md:rounded-tl-[24px] md:px-4 dark:bg-(--sub-mobile-table-section-bg) dark:md:bg-(--sub-desktop-table-section-bg)"
						>
							<h2 className="text-[20px] leading-7 font-semibold text-(--sub-text-navy-900) md:w-[220px] md:text-[24px] md:leading-[34px] md:text-(--sub-ink-primary) dark:text-white dark:md:text-white">
								Compare Plans and Features
							</h2>
						</div>

						<div className="min-w-0 flex-1 overflow-hidden">
							<div ref={headerPlanTrackRef} className="w-max [will-change:transform]">
								<div className="flex h-[132px] rounded-t-[16px] border-t border-(--sub-mobile-table-border) md:h-[129px] md:rounded-t-[24px] md:border-(--sub-desktop-table-border)">
									{planOrder.map((plan, index) => (
										<ComparisonPlanHead
											key={`plan-head-${plan}`}
											plan={plan}
											billingCycle={billingCycle}
											isFirst={index === 0}
											isLast={index === planOrder.length - 1}
											isSelected={plan === selectedPlan}
											onAction={onPlanAction}
										/>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ── Scrollable body ── */}
				<div
					ref={bodyScrollRef}
					className={`relative isolate ${HORIZONTAL_SCROLL_AREA_CLASSNAME}`}
					onScroll={onBodyScroll}
				>
					<div className="w-max" role="table" aria-label="Plan comparison">
						<div className="relative">
							{comparisonSections.map((section, sectionIndex) => {
								const isLastSection = sectionIndex === comparisonSections.length - 1
								const hasWrappedLastRow = section.rows[section.rows.length - 1]?.wrapLabel
								return (
									<div key={section.title} role="rowgroup" className="relative isolate">
										<div
											className="relative z-[25] flex h-10 bg-(--sub-mobile-table-header-bg) md:h-9 md:bg-(--sub-desktop-table-header-bg)"
											role="row"
										>
											<div
												role="rowheader"
												className="sticky left-0 z-30 box-border flex w-[233px] shrink-0 items-center bg-(--sub-mobile-table-header-bg) px-2 text-[14px] leading-[21px] font-medium text-(--sub-text-navy-900) md:w-[400px] md:bg-(--sub-desktop-table-header-bg) md:px-4 md:text-[16px] md:leading-5 md:text-(--sub-ink-primary) dark:text-white dark:md:text-white"
											>
												{section.title}
											</div>
											{planOrder.map((plan, planIndex) => {
												const prevPlan = planIndex > 0 ? planOrder[planIndex - 1] : null
												return (
													<div
														key={`${section.title}-header-${plan}`}
														role="cell"
														className={`box-border w-[132px] shrink-0 md:w-[146px] ${prevPlan === selectedPlan || plan === selectedPlan ? '' : 'border-l'} ${plan === selectedPlan ? 'relative z-10 border-x border-(--sub-brand-primary)' : 'border-(--sub-mobile-table-border) md:border-(--sub-desktop-table-border)'} ${plan === selectedPlan ? SELECTED_COLUMN_HIGHLIGHT : ''} ${plan !== selectedPlan && plan === 'enterprise' ? 'border-r' : ''}`}
													/>
												)
											})}
										</div>

										{section.rows.map((row, rowIndex) => {
											const isLastRow = isLastSection && rowIndex === section.rows.length - 1
											const rowClassName = row.wrapLabel ? WRAPPED_COMPARISON_ROW_CLASSNAME : COMPARISON_ROW_CLASSNAME
											const rowHeaderDividerClassName = isLastRow
												? ''
												: 'border-b border-(--sub-mobile-table-border) md:border-(--sub-desktop-table-border)'
											const rowCellDividerClassName = isLastRow
												? ''
												: 'border-b border-b-(--sub-mobile-table-border) md:border-b-(--sub-desktop-table-border)'
											const rowHeaderClassName = row.wrapLabel
												? `${WRAPPED_COMPARISON_ROW_HEADER_CLASSNAME} ${rowHeaderDividerClassName}`
												: `${COMPARISON_ROW_HEADER_CLASSNAME} ${rowHeaderDividerClassName}`
											const rowLabelClassName = row.wrapLabel
												? WRAPPED_COMPARISON_ROW_LABEL_CLASSNAME
												: COMPARISON_ROW_LABEL_CLASSNAME
											return (
												<div key={`${section.title}-${row.label}`} role="row" className={rowClassName}>
													<div role="rowheader" className={rowHeaderClassName}>
														{row.link ? (
															<a
																href={row.link}
																className={`${rowLabelClassName} text-current no-underline underline-offset-2 hover:text-(--sub-text-navy-900) hover:underline md:hover:text-(--sub-ink-primary) dark:hover:text-white`}
															>
																{row.label}
															</a>
														) : (
															<span className={rowLabelClassName}>{row.label}</span>
														)}
													</div>
													{planOrder.map((plan, planIndex) => {
														const prevPlan = planIndex > 0 ? planOrder[planIndex - 1] : null
														let lastRowCls = ''
														if (isLastRow) {
															lastRowCls = 'border-b'
															if (planIndex === 0) lastRowCls += ' rounded-bl-[16px] md:rounded-bl-[24px]'
															if (planIndex === planOrder.length - 1)
																lastRowCls += ' rounded-br-[16px] md:rounded-br-[24px]'
															if (plan === selectedPlan)
																lastRowCls += ' border-b-(--sub-brand-primary) rounded-b-[16px]'
														}
														return (
															<ComparisonCell
																key={`${section.title}-${row.label}-${plan}`}
																value={row.values[plan]}
																plan={plan}
																isSelected={plan === selectedPlan}
																hideBorderLeft={prevPlan === selectedPlan}
																className={`${rowCellDividerClassName} ${lastRowCls}`.trim() || undefined}
															/>
														)
													})}
												</div>
											)
										})}

										{isLastSection && overlayMetrics && !hasWrappedLastRow ? (
											<PlanGridBottomOutline left={overlayMetrics.planGridLeft} width={overlayMetrics.planGridWidth} />
										) : null}
										{overlayMetrics ? (
											<SelectedColumnRails
												left={overlayMetrics.selectedLeft}
												width={overlayMetrics.selectedWidth}
												roundBottom={isLastSection}
											/>
										) : null}
									</div>
								)
							})}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
