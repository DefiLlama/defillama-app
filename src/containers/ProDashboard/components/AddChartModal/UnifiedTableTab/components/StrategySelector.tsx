import type { ComponentProps } from 'react'
import { Icon } from '~/components/Icon'
import type { UnifiedTableConfig } from '~/containers/ProDashboard/types'

type StrategyType = UnifiedTableConfig['strategyType']
type IconName = ComponentProps<typeof Icon>['name']

const STRATEGY_OPTIONS: Array<{
	value: StrategyType
	label: string
	description: string
	icon: 'protocol' | 'chain'
}> = [
	{
		value: 'protocols',
		label: 'Protocols',
		description: 'Compare and group individual protocols across multiple chains.',
		icon: 'protocol'
	},
	{
		value: 'chains',
		label: 'Chains',
		description: 'Focus on chain-level insights and ecosystem-wide performance.',
		icon: 'chain'
	}
]

interface StrategySelectorProps {
	strategyType: StrategyType
	onStrategyChange: (strategy: StrategyType) => void
}

export function StrategySelector({ strategyType, onStrategyChange }: StrategySelectorProps) {
	return (
		<div className="grid gap-2 sm:grid-cols-2">
			{STRATEGY_OPTIONS.map((option) => {
				const active = strategyType === option.value
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => onStrategyChange(option.value)}
						aria-pressed={active}
						className={`group flex h-full flex-col gap-1 rounded-lg border p-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${
							active
								? 'border-(--primary) bg-(--primary)/12 shadow-[0_4px_10px_rgba(91,133,255,0.12)]'
								: 'border-(--cards-border) hover:border-(--primary) hover:bg-(--primary)/6'
						}`}
					>
						<span className="flex items-center gap-1.5">
							<Icon
								height={14}
								width={14}
								name={option.icon}
								className={active ? 'text-(--primary)' : 'text-(--text-tertiary)'}
							/>
							<span className="text-xs font-semibold text-(--text-primary)">{option.label}</span>
						</span>
						<p className="text-[10px] leading-tight text-(--text-secondary)">{option.description}</p>
					</button>
				)
			})}
		</div>
	)
}
