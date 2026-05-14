export const NODE_RUNTIME_MAJOR = 24

type RuntimePolicyViolation = {
	filePath: string
	message: string
	patternId: string
}

export const FORBIDDEN_RUNTIME_INVOCATIONS = [
	{
		id: 'bun-next-runtime',
		message: 'Run Next.js through Node, not Bun runtime.',
		pattern: /\bbun\s+--bun\s+next\b/
	},
	{
		id: 'bun-server-runtime',
		message: 'Run standalone Next.js server.js through Node, not Bun runtime.',
		pattern: /\bbun\s+(?:\.\/)?server\.js\b/
	},
	{
		id: 'next-start-standalone-runtime',
		message: 'Use standalone server.js on Node instead of next start for production runtime.',
		pattern: /\bnext\s+start\b/
	}
] as const

export function findRuntimePolicyViolations(
	files: Array<{ content: string; filePath: string }>
): RuntimePolicyViolation[] {
	const violations: RuntimePolicyViolation[] = []

	for (const file of files) {
		for (const forbidden of FORBIDDEN_RUNTIME_INVOCATIONS) {
			if (forbidden.pattern.test(file.content)) {
				violations.push({
					filePath: file.filePath,
					message: forbidden.message,
					patternId: forbidden.id
				})
			}
		}
	}

	return violations
}
