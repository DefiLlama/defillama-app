export const EXTENDED_COLOR_PALETTE = [
	'#E91E63', // Hot Pink
	'#2196F3', // Bright Blue
	'#4CAF50', // Green
	'#FF9800', // Orange
	'#9C27B0', // Purple
	'#00BCD4', // Cyan
	'#FF5722', // Deep Orange
	'#3F51B5', // Indigo
	'#8BC34A', // Light Green
	'#FFC107', // Amber
	'#673AB7', // Deep Purple
	'#009688', // Teal
	'#F44336', // Red
	'#03A9F4', // Light Blue
	'#CDDC39', // Lime
	'#FF6F00', // Dark Orange
	'#7C4DFF', // Light Purple
	'#00E676', // Green Accent
	'#FF4081', // Pink Accent
	'#1976D2', // Dark Blue
	'#FDD835', // Yellow
	'#6A1B9A', // Dark Purple
	'#00ACC1', // Dark Cyan
	'#D32F2F', // Dark Red
	'#40C4FF', // Light Cyan
	'#76FF03', // Light Lime
	'#E040FB', // Purple Accent
	'#00C853', // Dark Green
	'#FF6E40', // Deep Orange Accent
	'#448AFF', // Blue Accent
	'#FFD600', // Dark Yellow
	'#AA00FF', // Purple A700
	'#00E5FF', // Cyan Accent
	'#FF3D00', // Deep Orange A400
	'#1DE9B6', // Teal Accent
	'#D500F9' // Purple A400
]

export const COLOR_PALETTE_2 = [
	'#FF5722', // Deep Orange
	'#40C4FF', // Light Cyan
	'#4CAF50', // Green
	'#9C27B0', // Purple
	'#FFC107', // Amber
	'#00BCD4', // Cyan
	'#E91E63', // Hot Pink
	'#8BC34A', // Light Green
	'#673AB7', // Deep Purple
	'#2196F3', // Bright Blue
	'#CDDC39', // Lime
	'#FF4081', // Pink Accent
	'#3F51B5', // Indigo
	'#00E676', // Green Accent
	'#FDD835', // Yellow
	'#7C4DFF', // Light Purple
	'#009688', // Teal
	'#F44336', // Red
	'#00ACC1', // Dark Cyan
	'#76FF03', // Light Lime
	'#1976D2', // Dark Blue
	'#6A1B9A', // Dark Purple
	'#03A9F4', // Light Blue
	'#D32F2F', // Dark Red
	'#00C853', // Dark Green
	'#E040FB', // Purple Accent
	'#448AFF', // Blue Accent
	'#FFD600', // Dark Yellow
	'#00E5FF', // Cyan Accent
	'#AA00FF', // Purple A700
	'#1DE9B6', // Teal Accent
	'#D500F9', // Purple A400
	'#FF9800', // Orange
	'#FF6F00', // Dark Orange
	'#FF6E40', // Deep Orange Accent
	'#FF3D00' // Deep Orange A400
]

function simpleHash(str: string): number {
	let hash = 0
	let prime = 31

	for (let i = 0; i < str.length; i++) {
		hash = (hash * prime + str.charCodeAt(i) * (i + 1)) >>> 0
	}

	return hash
}

export const generateConsistentChartColor = (
	itemName: string,
	fallbackColor: string,
	itemType: 'protocol' | 'chain' = 'protocol',
	useConsistentColors: boolean = true
): string => {
	if (!useConsistentColors || !itemName || itemName === 'unknown') {
		return fallbackColor
	}

	const hash = simpleHash(`${itemType}-${itemName}`)

	const colorIndex = hash % EXTENDED_COLOR_PALETTE.length

	return EXTENDED_COLOR_PALETTE[colorIndex]
}

export const colorManager = {
	getItemColor: (itemName: string, itemType: 'protocol' | 'chain', fallbackColor?: string) => {
		return generateConsistentChartColor(itemName, fallbackColor || '#8884d8', itemType, true)
	}
}
