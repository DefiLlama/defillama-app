import { ComparisonCell, PRO_COLUMN_HIGHLIGHT } from '~/containers/subscription/components'
import { PLAN_META_BY_CYCLE } from '~/containers/subscription/data'
import type { BillingCycle, ComparisonSection, PlanKey } from '~/containers/subscription/types'

/* ── Layout constants ──────────────────────────────────────────────── */

const PLAN_COL = 'w-[132px] md:w-[146px]'
const LABEL_COL = 'w-[233px] md:w-[400px]'

/* ── Style maps ────────────────────────────────────────────────────── */

const planHeadStyles = {
	pro: 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d) md:rounded-t-[16px]',
	default: 'border-(--sub-mobile-table-border) md:border-(--sub-desktop-table-border) md:bg-white dark:md:bg-transparent'
}

const planHeadButtonStyles = {
	pro: 'border-(--sub-c-1f67d2) bg-(--sub-c-1f67d2) text-white',
	default:
		'border-(--sub-c-c8d4e4) bg-white text-(--sub-c-1e293b) dark:border-(--sub-c-2f3336) dark:bg-transparent dark:text-white md:border-(--sub-c-dedede) md:text-(--sub-c-090b0c) dark:md:border-(--sub-c-2f3336) dark:md:bg-transparent dark:md:text-white'
}

/* ── ComparisonPlanHead ────────────────────────────────────────────── */

function ComparisonPlanHead({
	plan,
	billingCycle,
	isFirst,
	isLast
}: {
	plan: PlanKey
	billingCycle: BillingCycle
	isFirst: boolean
	isLast: boolean
}) {
	const meta = PLAN_META_BY_CYCLE[billingCycle][plan]
	const isPro = plan === 'pro'
	const colStyle = isPro ? planHeadStyles.pro : planHeadStyles.default
	const btnStyle = isPro ? planHeadButtonStyles.pro : planHeadButtonStyles.default

	return (
		<div
			role="columnheader"
			className={`${PLAN_COL} border-t ${colStyle} ${isFirst ? 'rounded-tl-[16px] md:rounded-tl-[24px]' : ''} ${isLast ? 'rounded-tr-[16px] md:rounded-tr-[24px]' : ''}`}
		>
			<div className="flex h-full flex-col justify-between p-3 md:p-5">
				<div>
					<p className="text-[14px] leading-4 font-medium text-(--sub-c-111f34) dark:text-white md:text-lg md:leading-5 md:text-(--sub-c-090b0c) dark:md:text-white">
						{meta.title}
					</p>
					<p
						className={`mt-1 text-[12px] leading-4 md:text-sm ${plan === 'enterprise' ? 'text-(--sub-c-4b86db)' : 'text-(--sub-mobile-text-muted) md:text-(--sub-desktop-text-muted)'}`}
					>
						{meta.price}
					</p>
				</div>
				<button
					type="button"
					className={`h-7 rounded-[6px] border px-2 text-[10px] leading-3 md:h-8 md:rounded-lg md:text-xs ${btnStyle}`}
				>
					{meta.action}
				</button>
			</div>
		</div>
	)
}

/* ── SubscriptionComparisonSection ─────────────────────────────────── */

export function SubscriptionComparisonSection({
	planOrder,
	comparisonSections,
	billingCycle
}: {
	planOrder: PlanKey[]
	comparisonSections: ComparisonSection[]
	billingCycle: BillingCycle
}) {
	return (
		<section className="mt-12 py-12 bg-(--sub-mobile-table-section-bg) md:mt-0 md:py-20 md:bg-(--sub-desktop-table-section-bg)">
			<div className="mx-auto max-w-[393px] px-4 md:max-w-none md:w-[984px] md:px-0">
				<div className="overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<div className="min-w-[761px] md:min-w-0" role="table" aria-label="Plan comparison">
						<div className="flex" role="row">
							<div role="columnheader" className={`flex h-[132px] items-center px-2 md:h-[129px] md:rounded-tl-[24px] md:px-4 ${LABEL_COL}`}>
								<h2 className="text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white md:w-[220px] md:text-[24px] md:leading-[34px] md:text-(--sub-c-090b0c) dark:md:text-white">
									Compare Plans and Features
								</h2>
							</div>

							<div className="flex h-[132px] w-[528px] rounded-t-[16px] border-t border-(--sub-mobile-table-border) md:h-[129px] md:w-[584px] md:rounded-t-[24px] md:border-(--sub-desktop-table-border)">
								{planOrder.map((plan, index) => (
									<ComparisonPlanHead
										key={`plan-head-${plan}`}
										plan={plan}
										billingCycle={billingCycle}
										isFirst={index === 0}
										isLast={index === planOrder.length - 1}
									/>
								))}
							</div>
						</div>

						<div className="overflow-hidden rounded-b-[16px] border-x border-b border-(--sub-mobile-table-border) md:rounded-b-[24px] md:border-(--sub-desktop-table-border)">
							{comparisonSections.map((section) => (
								<div key={section.title} role="rowgroup">
									<div className="flex h-10 bg-(--sub-mobile-table-header-bg) md:h-9 md:bg-(--sub-desktop-table-header-bg)" role="row">
										<div role="rowheader" className={`flex items-center px-2 text-[14px] leading-[21px] font-medium text-(--sub-c-111f34) dark:text-white md:px-4 md:text-[16px] md:leading-5 md:text-(--sub-c-090b0c) dark:md:text-white ${LABEL_COL}`}>
											{section.title}
										</div>
										{planOrder.map((plan) => (
											<div
												key={`${section.title}-header-${plan}`}
												role="cell"
												className={`${PLAN_COL} border-l border-(--sub-mobile-table-border) md:border-(--sub-desktop-table-border) ${plan === 'pro' ? PRO_COLUMN_HIGHLIGHT : ''} ${plan === 'enterprise' ? 'border-r' : ''}`}
											/>
										))}
									</div>

									{section.rows.map((row) => (
										<div
											key={`${section.title}-${row.label}`}
											role="row"
											className="flex min-h-[41px] border-b border-(--sub-mobile-table-border) md:min-h-[36px] md:border-(--sub-desktop-table-border)"
										>
											<div role="rowheader" className={`flex items-center px-2 text-[14px] leading-[21px] text-(--sub-mobile-text-muted) md:px-4 md:text-xs md:text-(--sub-desktop-text-muted) ${LABEL_COL}`}>
												{row.label}
											</div>
											{planOrder.map((plan) => (
												<ComparisonCell
													key={`${section.title}-${row.label}-${plan}`}
													value={row.values[plan]}
													plan={plan}
												/>
											))}
										</div>
									))}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
