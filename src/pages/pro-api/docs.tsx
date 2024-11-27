import yamlApiSpec from '~/docs/proSpec.json'
import openApiSpec from '~/docs/resolvedSpec.json'
import 'swagger-ui/dist/swagger-ui.css'
import ApiDocs from '../docs/api'
import { useIsClient } from '~/hooks'
import { useMemo } from 'react'

export default function Docs() {
	const isClient = useIsClient()

	const finalSpec = useMemo(() => {
		const apiKey = (isClient ? window.localStorage.getItem(`pro_apikey`) : null) ?? 'APIKEY'
		const finalSpec = yamlApiSpec
		finalSpec.servers = yamlApiSpec.servers.map((s) => ({ ...s, url: s.url.replaceAll('APIKEY', apiKey) }))
		Object.entries(openApiSpec.paths).forEach(([path, val]) => {
			let server = 'api'
			const routes = Object.fromEntries(
				Object.entries(val).map(([method, route]: any) => {
					server = (route.servers?.[0]?.url ?? 'https://api.llama.fi').replace('https://', '').split('.')[0]
					return [method, { ...route, servers: undefined }]
				})
			)
			finalSpec.paths[`/${server}${path}`] = routes
		})
		return finalSpec
	}, [isClient])

	if (!isClient) {
		return null
	}

	return <ApiDocs spec={finalSpec} />
}
