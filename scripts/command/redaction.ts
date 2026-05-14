const SECRET_ENV_KEY_PATTERN =
	/(^|_)(API_KEY|TOKEN|SECRET|PASSWORD|AUTH|WEBHOOK|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL|COOKIE)(_|$)/i
const MIN_SECRET_LENGTH = 6

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getSecretValues(env: NodeJS.ProcessEnv): string[] {
	const values: string[] = []

	for (const key in env) {
		const value = env[key]
		// Redaction is intentionally env-name based: secret-like variable names
		// define values that are scrubbed wherever they appear in command output.
		if (value && value.length >= MIN_SECRET_LENGTH && SECRET_ENV_KEY_PATTERN.test(key)) {
			values.push(value)
		}
	}

	return values.sort((a, b) => b.length - a.length)
}

export function createSecretRedactor(env: NodeJS.ProcessEnv = process.env): (text: string) => string {
	const secretValues = getSecretValues(env)
	if (secretValues.length === 0) {
		return (text) => text
	}

	const secretPattern = new RegExp(secretValues.map(escapeRegExp).join('|'), 'g')
	return (text) => text.replace(secretPattern, '[REDACTED]')
}
