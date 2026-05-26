export function sumApyParts(base: number | null | undefined, reward: number | null | undefined) {
	if (base == null && reward == null) return null

	return (base ?? 0) + (reward ?? 0)
}

export function calculateApyNet7d(apyBase7d: number | null | undefined, il7d: number | null | undefined) {
	if (apyBase7d == null || il7d == null || apyBase7d <= 0) return null

	return Math.max(apyBase7d + il7d * 52, -100)
}
