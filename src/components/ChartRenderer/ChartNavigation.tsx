import React, { useState } from 'react'
import ChartRenderer, { ChartConfig } from './index'

interface ChartNavigationProps {
	charts: ChartConfig[]
}

const ChartNavigation: React.FC<ChartNavigationProps> = ({ charts }) => {
	const [activeChartIndex, setActiveChartIndex] = useState(0)

	if (!charts || charts.length === 0) {
		return null
	}

	if (charts.length === 1) {
		return <ChartRenderer chart={charts[0]} />
	}

	return (
		<div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
			<div className="border-b border-gray-200 dark:border-gray-700">
				<nav className="flex space-x-1 p-1" aria-label="Charts">
					{charts.map((chart, index) => (
						<button
							key={chart.id}
							onClick={() => setActiveChartIndex(index)}
							className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
								index === activeChartIndex
									? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
									: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
							}`}
						>
							{chart.title}
						</button>
					))}
				</nav>
			</div>

			<div className="p-4">
				<ChartRenderer chart={charts[activeChartIndex]} />
			</div>

			<div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Showing {activeChartIndex + 1} of {charts.length} charts
					{charts[activeChartIndex].description && (
						<span className="ml-2">• {charts[activeChartIndex].description}</span>
					)}
				</p>
			</div>
		</div>
	)
}

export default ChartNavigation
