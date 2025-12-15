import { memo, useCallback } from 'react'
import { CategoryCard, CATEGORY_CARDS } from './CategoryCard'
import { ChartTabType } from './types'

interface CategoryCardsGridProps {
	onSelectCategory: (category: ChartTabType) => void
}

export const CategoryCardsGrid = memo(function CategoryCardsGrid({ onSelectCategory }: CategoryCardsGridProps) {
	return (
		<div className="grid h-full grid-cols-2 grid-rows-2 gap-3 p-3">
			{CATEGORY_CARDS.map((card) => (
				<CategoryCard key={card.id} card={card} onClick={() => onSelectCategory(card.id)} />
			))}
		</div>
	)
})
