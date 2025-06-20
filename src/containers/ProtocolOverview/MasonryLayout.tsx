import { useEffect, useRef, useState } from 'react'
import { IProtocolOverviewPageData } from './types'

type CardType = 'protocolInfo' | 'methodology' | 'yields' | 'devActivity'

interface MasonryLayoutProps {
	cards: CardType[]
	props: IProtocolOverviewPageData
}

const MasonryLayout = ({ cards, props }: MasonryLayoutProps) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const [columns, setColumns] = useState<CardType[][]>([])
	const [numColumns, setNumColumns] = useState(1)

	useEffect(() => {
		const calculateColumns = () => {
			if (!containerRef.current) return

			const containerWidth = containerRef.current.offsetWidth
			const cardWidth = 360 // Approximate card width
			const gap = 8

			// Calculate how many columns can fit
			const calculatedColumns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
			setNumColumns(calculatedColumns)
		}

		calculateColumns()
		window.addEventListener('resize', calculateColumns)
		return () => window.removeEventListener('resize', calculateColumns)
	}, [])

	useEffect(() => {
		// Distribute cards into columns (left to right)
		const newColumns: CardType[][] = Array.from({ length: numColumns }, () => [])

		cards.forEach((card, index) => {
			const columnIndex = index % numColumns
			newColumns[columnIndex].push(card)
		})

		setColumns(newColumns)
	}, [cards, numColumns])

	return (
		<div ref={containerRef} className="flex gap-2">
			{columns.map((column, columnIndex) => (
				<div key={columnIndex} className="flex flex-col gap-2 flex-1">
					{column.map((card, cardIndex) => (
						<div key={`${columnIndex}-${cardIndex}-${card}`}>
							<></>
						</div>
					))}
				</div>
			))}
		</div>
	)
}
