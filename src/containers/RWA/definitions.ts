import rwaDefinitionsJson from '~/rwa-definitions.json'

type WithLookupValues<T> = {
	[K in keyof T]: T[K] extends { values: Record<string, string> }
		? Omit<T[K], 'values'> & { values: Record<string, string> }
		: T[K]
}

export const definitions: WithLookupValues<typeof rwaDefinitionsJson> = rwaDefinitionsJson
