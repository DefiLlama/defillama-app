const MAX_FORK_TO_ORIGINAL_TVL_PERCENT = 1e18

export function getForkToOriginalTvlPercent(forkTvl: number, parentTvl: number | null | undefined): number | null {
	if (!Number.isFinite(forkTvl) || forkTvl < 0 || parentTvl == null || !Number.isFinite(parentTvl) || parentTvl <= 0) {
		return null
	}

	const ratioPercent = (forkTvl / parentTvl) * 100
	if (!Number.isFinite(ratioPercent) || ratioPercent > MAX_FORK_TO_ORIGINAL_TVL_PERCENT) {
		return null
	}

	return Math.round(ratioPercent * 100) / 100
}
