export function testEnv(values: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
	return { NODE_ENV: 'test', ...values } as NodeJS.ProcessEnv
}
