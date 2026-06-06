export function dedupeNonEmpty(values: string[]): string[] {
	const seen = new Set<string>()
	for (const value of values) {
		if (!value) continue
		seen.add(value)
	}
	return [...seen]
}
