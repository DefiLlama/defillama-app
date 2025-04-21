import * as React from 'react'

export const LiquidationsContext = React.createContext<{
	selectedSeries: {
		[key: string]: boolean
	}
	setSelectedSeries: React.Dispatch<
		React.SetStateAction<{
			[key: string]: boolean
		}>
	>
}>(null)
