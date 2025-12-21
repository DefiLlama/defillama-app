import { memo } from 'react'
import { CATEGORY_CARDS, CategoryCard } from './CategoryCard'
import { ChartTabType } from './types'

interface CategoryCardsGridProps {
	onSelectCategory: (category: ChartTabType) => void
}

export const CategoryCardsGrid = memo(function CategoryCardsGrid({ onSelectCategory }: CategoryCardsGridProps) {
	return (
		<div className="grid h-full grid-cols-2 auto-rows-fr gap-3 p-3">
			{CATEGORY_CARDS.map((card) => (
				<CategoryCard key={card.id} card={card} onClick={() => onSelectCategory(card.id)} />
			))}
		</div>
	)
})
