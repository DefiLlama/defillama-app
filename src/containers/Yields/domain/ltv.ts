interface EffectiveLtvInput {
	project: string
	ltv?: number | null
	borrowFactor?: number | null
}

function isEulerProject(project: string) {
	return project === 'euler' || project.startsWith('euler-')
}

export function getEffectiveLtv({ project, ltv, borrowFactor }: EffectiveLtvInput) {
	if (ltv == null) return null
	if (isEulerProject(project) && typeof borrowFactor === 'number' && Number.isFinite(borrowFactor)) {
		return ltv * borrowFactor
	}

	return ltv
}

export function applyCustomLtvToMax(ltv: number, customLTV?: number | null) {
	return customLTV == null ? ltv : (customLTV / 100) * ltv
}

export function resolveOptimizerLtv(ltv: number, customLTV?: number | null) {
	return customLTV == null ? ltv : customLTV / 100
}

export function isValidStrategyCustomLtv(customLTV?: number | null) {
	return customLTV == null || (customLTV > 0 && customLTV <= 100)
}

export function isValidOptimizerCustomLtv(ltv?: number | null, customLTV?: number | null) {
	return customLTV == null || (customLTV > 0 && customLTV < 100 && ltv != null && customLTV / 100 <= ltv)
}
