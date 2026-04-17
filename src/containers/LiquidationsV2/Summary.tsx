import { TokenLogo, type LogoKind } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'

export function LiquidationsPageHeader({
	title,
	rightText,
	logo
}: {
	title: string
	rightText?: string | null
	logo?: { name: string; kind: LogoKind } | null
}) {
	return (
		<div className="flex w-full items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
			{logo ? <TokenLogo name={logo.name} kind={logo.kind} size={24} alt={`Logo of ${logo.name}`} /> : null}
			<h1 className="text-xl font-bold text-(--text-primary)">{title}</h1>
			{rightText ? <span className="ml-auto text-sm text-(--text-label)">{rightText}</span> : null}
		</div>
	)
}

export function LiquidationsSummaryStats({
	items
}: {
	items: Array<{ label: string; value: number; isUsd?: boolean }>
}) {
	return (
		<div className="flex min-h-[42px] w-full flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3.5 py-2.5">
			{items.map((item) => (
				<div key={item.label} className="flex items-baseline gap-1.5">
					<span className="text-sm text-(--text-label)">{item.label}</span>
					<span className="text-sm font-medium">
						{item.isUsd ? formattedNum(item.value, true) : formattedNum(item.value)}
					</span>
				</div>
			))}
		</div>
	)
}
