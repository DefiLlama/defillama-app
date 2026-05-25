import { CHART_COLORS, oldBlue } from '~/constants/colors'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import { chainIconUrl, equityIconUrl, geckoTokenIconUrl, peggedAssetIconUrl, tokenIconUrl } from '~/utils/icons'

type AxisEntityType = NonNullable<ChartConfiguration['axes']['x']['entityType']>

export { oldBlue }

export function buildAxisLogoUrls(
	entityType: AxisEntityType | undefined,
	logoCategories: string[] | undefined
): string[] | undefined {
	if (!entityType || !logoCategories?.length) return undefined
	const builder =
		entityType === 'protocol'
			? tokenIconUrl
			: entityType === 'chain'
				? chainIconUrl
				: entityType === 'token'
					? geckoTokenIconUrl
					: entityType === 'stablecoin'
						? peggedAssetIconUrl
						: entityType === 'equity'
							? equityIconUrl
							: null
	if (!builder) return undefined
	return logoCategories.map((v) => (v ? builder(v) : ''))
}

export const getChartColor = (_entityValue?: string, seriesIndex?: number, fallbackColor: string = oldBlue): string => {
	if (seriesIndex !== undefined) {
		return CHART_COLORS[seriesIndex % CHART_COLORS.length]
	}
	return fallbackColor
}

export const parseStringNumber = (value: unknown): number => {
	if (typeof value === 'number') return value
	if (typeof value === 'string') {
		const parsed = parseFloat(value)
		return Number.isNaN(parsed) ? 0 : parsed
	}
	return 0
}
