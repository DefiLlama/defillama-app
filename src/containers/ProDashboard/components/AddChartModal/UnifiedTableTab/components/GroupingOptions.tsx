import { useMemo, type ComponentProps } from 'react'
import { Icon } from '~/components/Icon'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'

type StrategyType = UnifiedTableConfig['strategyType']
type IconName = ComponentProps<typeof Icon>['name']

const PROTOCOL_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain', 'category', 'parent-protocol']
const CHAIN_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain']

const GROUPING_ICON_BY_KEY: Partial<Record<UnifiedRowHeaderType, IconName>> = {
	chain: 'chain',
	category: 'tag',
	'parent-protocol': 'protocol'
}

interface GroupingOptionsProps {
	strategyType: StrategyType
	rowHeaders: UnifiedRowHeaderType[]
	onToggleRowHeader: (header: UnifiedRowHeaderType) => void
}

export function GroupingOptions({ strategyType, rowHeaders, onToggleRowHeader }: GroupingOptionsProps) {
	const formatGroupingLabel = (header: UnifiedRowHeaderType) => {
		if (header === 'parent-protocol') {
			return 'Protocol'
		}

		return header
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ')
	}

	const groupingOptions = useMemo(() => {
		const baseOrder = strategyType === 'protocols' ? PROTOCOL_ROW_HEADER_ORDER : CHAIN_ROW_HEADER_ORDER

		return baseOrder.map((header) => ({
			value: header,
			label: formatGroupingLabel(header),
			icon: GROUPING_ICON_BY_KEY[header],
			description:
				header === 'chain'
					? 'Group rows by blockchain ecosystem.'
					: header === 'category'
						? 'Break protocols down by sector classification.'
						: 'Combine child protocols under their parent project.'
		}))
	}, [strategyType])

	const groupingSummary = useMemo(() => {
		const labels =
			strategyType === 'chains' ? CHAIN_ROW_HEADER_ORDER : rowHeaders.length ? rowHeaders : PROTOCOL_ROW_HEADER_ORDER

		return labels.map((header) => formatGroupingLabel(header)).join(' → ')
	}, [rowHeaders, strategyType])

	return (
		<>
			<div className="rounded-md border border-(--cards-border)/70 bg-(--cards-bg-alt)/50 px-2.5 py-1.5 text-[10px] text-(--text-tertiary)">
				<strong className="text-(--text-secondary)">Grouping:</strong> {groupingSummary}
			</div>
			<div className="grid gap-2 border-t border-(--cards-border)/70 pt-2 sm:grid-cols-2">
				{groupingOptions.map((option) => {
					const active = rowHeaders.includes(option.value)
					const disabled = strategyType === 'chains'
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => !disabled && onToggleRowHeader(option.value)}
							aria-pressed={active}
							disabled={disabled}
							className={`group flex h-full flex-col gap-1 rounded-lg border p-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${
								active
									? 'border-(--primary) bg-(--primary)/12 shadow-[0_2px_6px_rgba(91,133,255,0.1)]'
									: 'border-(--cards-border) hover:border-(--primary) hover:bg-(--primary)/6'
							} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
						>
							<span className="flex items-center gap-1.5">
								{option.icon && (
									<Icon
										height={13}
										width={13}
										name={option.icon}
										className={active ? 'text-(--primary)' : 'text-(--text-tertiary)'}
									/>
								)}
								<span className="text-[10px] font-semibold text-(--text-primary)">{option.label}</span>
								{active && <Icon name="check" height={11} width={11} className="text-(--primary)" />}
							</span>
							<p className="text-[10px] leading-tight text-(--text-secondary)">{option.description}</p>
						</button>
					)
				})}
			</div>
		</>
	)
}
