import yamlApiSpec from '~/docs/proSpec.json'
import openApiSpec from '~/docs/resolvedSpec.json'
import 'swagger-ui/dist/swagger-ui.css'
import ApiDocs from '../docs/api'

export default function Docs() {
	if (typeof window === 'undefined') {
		return <>Loading...</>
	}
	const apiKey = window.localStorage.getItem(`pro_apikey`) ?? 'APIKEY'
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
	return <ApiDocs spec={finalSpec} />
}
