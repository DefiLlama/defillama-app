export type MetadataPolicyEnv = {
	[key: string]: string | boolean | undefined
	API_KEY?: string
	CI?: string | boolean
	NODE_ENV?: string
}

export function isLocalDevWithoutApiKey(env: MetadataPolicyEnv = process.env): boolean {
	return env.NODE_ENV === 'development' && !env.API_KEY
}

export function shouldWriteMetadataStubsOnFailure(env: MetadataPolicyEnv = process.env): boolean {
	const ci = env.CI === true || env.CI === 'true' || env.CI === '1'
	return ci || env.NODE_ENV === 'development'
}

export function shouldSkipMetadataRefresh(env: MetadataPolicyEnv = process.env): boolean {
	return isLocalDevWithoutApiKey(env)
}
