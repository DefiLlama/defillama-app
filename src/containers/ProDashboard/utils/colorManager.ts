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
	'#9C27B0', // Purple
	'#4CAF50', // Green
	'#7c2d12', // brown
	'#E91E63', // hot pink
	'#1f67d2', // old blue
	'#8BC34A', // Light Green
	'#673AB7', // Deep Purple
	'#A0522D', // Light Shiny Brown
	'#FF1493', // Deep Pink
	'#00ACC1', // Dark Cyan
	'#CDDC39', // Lime
	'#D500F9', // Purple A400,
	'#BC8F8F', // Rosy Brown
	'#FF4081', // Pink Accent
	'#2196F3', // Bright Blue
	'#00E676', // Green Accent
	'#7C4DFF', // Light Purple
	'#DEB887', // Burlywood
	'#E74C3C', // Alizarin Red
	'#3498DB', // Peter River Blue
	'#2E8B57', // Sea Green
	'#8A2BE2', // Blue Violet
	'#D2B48C', // Tan
	'#FFC107', // Amber
	'#03A9F4', // Light Blue
	'#228B22', // Forest Green
	'#9370DB', // Medium Purple
	'#FF9800', // Orange
	'#8B7D6B', // Dark Khaki
	'#1976D2', // Dark Blue
	'#76FF03', // Light Lime
	'#6A1B9A', // Dark Purple
	'#CD853F', // Peru Brown
	'#FF4500', // Orange Red
	'#0080FF', // Azure Blue
	'#32CD32' // Lime Green
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
