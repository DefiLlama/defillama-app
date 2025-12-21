import { memo } from 'react'
import { Icon } from '~/components/Icon'
import { CATEGORY_CARDS } from './CategoryCard'
import { ChartTabType } from './types'

interface CategoryCardsGridProps {
	onSelectCategory: (category: ChartTabType) => void
}

export const CategoryCardsGrid = memo(function CategoryCardsGrid({ onSelectCategory }: CategoryCardsGridProps) {
	const heroCard = CATEGORY_CARDS[0]
	const otherCards = CATEGORY_CARDS.slice(1)

	return (
		<div className="flex h-full flex-col p-4">
			<button
				onClick={() => onSelectCategory(heroCard.id)}
				className="pro-border group relative flex flex-col rounded-xl border p-5 text-left transition-all hover:border-(--primary)/50 hover:bg-(--cards-bg-alt)"
			>
				<div className="mb-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--primary)/10">
							<Icon name={heroCard.icon} height={22} width={22} className="text-(--primary)" />
						</div>
						<h3 className="pro-text1 text-lg font-semibold">{heroCard.title}</h3>
					</div>
					<Icon
						name="arrow-right"
						height={18}
						width={18}
						className="text-(--text-secondary) transition-transform group-hover:translate-x-1 group-hover:text-(--primary)"
					/>
				</div>
				<p className="pro-text2 mb-4 line-clamp-1 text-sm">{heroCard.description}</p>
				<div className="flex flex-wrap gap-1.5">
					{heroCard.tags.map((tag) => (
						<span
							key={tag}
							className="rounded-full bg-(--cards-bg-alt) px-2.5 py-1 text-xs font-medium text-(--text-secondary) transition-colors group-hover:bg-(--primary)/10 group-hover:text-(--primary)"
						>
							{tag}
						</span>
					))}
				</div>
			</button>

			<div className="mt-4">
				<span className="pro-text2 mb-2.5 block text-xs font-medium tracking-wide uppercase">Other datasets</span>
				<div className="grid grid-cols-2 gap-2">
					{otherCards.map((card) => (
						<button
							key={card.id}
							onClick={() => onSelectCategory(card.id)}
							className="pro-border group flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all hover:border-(--primary)/50 hover:bg-(--cards-bg-alt)"
						>
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--cards-bg-alt) transition-colors group-hover:bg-(--primary)/10">
								<Icon
									name={card.icon}
									height={16}
									width={16}
									className="text-(--text-secondary) group-hover:text-(--primary)"
								/>
							</div>
							<div className="min-w-0 flex-1">
								<span className="pro-text1 text-sm font-medium">{card.title}</span>
								<p className="pro-text2 mt-0.5 line-clamp-1 text-xs">{card.description}</p>
							</div>
						</button>
					))}
				</div>
			</div>
		</div>
	)
})
