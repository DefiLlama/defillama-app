interface PercentChangeDisplay {
	finalValue: string
	isPositive: boolean
	isNegative: boolean
}

function getPercentChangeDisplay(percent: unknown, noSign?: boolean): PercentChangeDisplay | null {
	if (!percent && percent !== 0) {
		return null
	}

	const parsedPercent = parseFloat(String(percent))
	let isPositive = false
	let isNegative = false
	let finalValue = ''

	if (!parsedPercent || parsedPercent === 0) {
		finalValue = '0%'
	} else if (parsedPercent > 0 && parsedPercent < 0.0001) {
		isPositive = true
		finalValue = '< 0.0001%'
	} else if (parsedPercent < 0 && parsedPercent > -0.0001) {
		isNegative = true
		finalValue = '< 0.0001%'
	} else {
		const fixedPercent = parsedPercent.toFixed(2)
		const fixedNum = Number(fixedPercent)

		if (fixedNum === 0) {
			finalValue = '0%'
		} else if (fixedNum > 0) {
			isPositive = true
			const prefix = noSign ? '' : '+'
			finalValue = fixedNum > 100 ? `${prefix}${parsedPercent.toFixed(0)}%` : `${prefix}${fixedPercent}%`
		} else {
			isNegative = true
			finalValue = `${fixedPercent}%`
		}
	}

	return { finalValue, isPositive, isNegative }
}

interface PercentChangeProps {
	percent: unknown
	noSign?: boolean
	fontWeight?: number
}

export function formatPercentChangeText(percent: unknown, noSign?: boolean): string | null {
	return getPercentChangeDisplay(percent, noSign)?.finalValue ?? null
}

export function PercentChange({ percent, noSign, fontWeight }: PercentChangeProps): React.JSX.Element | null {
	const display = getPercentChangeDisplay(percent, noSign)
	if (!display) {
		return null
	}

	const colorClass = noSign ? '' : display.isPositive ? 'text-(--success)' : display.isNegative ? 'text-(--error)' : ''
	const weight = fontWeight ?? 400

	return weight > 400 ? (
		<span className={colorClass} style={{ fontWeight: weight }}>
			{display.finalValue}
		</span>
	) : (
		<span className={colorClass}>{display.finalValue}</span>
	)
}

export function renderPercentChange(
	percent: unknown,
	noSign: boolean | undefined,
	fontWeight: number | undefined,
	returnTextOnly: true
): string | null
export function renderPercentChange(
	percent: unknown,
	noSign?: boolean,
	fontWeight?: number,
	returnTextOnly?: false
): React.JSX.Element | null
export function renderPercentChange(
	percent: unknown,
	noSign?: boolean,
	fontWeight?: number,
	returnTextOnly?: boolean
): string | null | React.JSX.Element
export function renderPercentChange(
	percent: unknown,
	noSign?: boolean,
	fontWeight?: number,
	returnTextOnly?: boolean
): string | null | React.JSX.Element {
	if (returnTextOnly) {
		return formatPercentChangeText(percent, noSign)
	}

	return <PercentChange percent={percent} noSign={noSign} fontWeight={fontWeight} />
}
