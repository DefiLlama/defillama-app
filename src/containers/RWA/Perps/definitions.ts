import perpsDefinitionsJson from '~/public/rwa-perps-definitions.json'

type PerpsDefinitions = {
	[K in keyof typeof perpsDefinitionsJson]: (typeof perpsDefinitionsJson)[K]
}

export const perpsDefinitions: PerpsDefinitions = perpsDefinitionsJson
