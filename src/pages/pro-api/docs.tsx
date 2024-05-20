import yamlApiSpec from '~/docs/proSpec.json'
import 'swagger-ui/dist/swagger-ui.css'
import ApiDocs from '../docs/api'

export default function Docs() {
	if (typeof window === 'undefined') {
		return <>Loading...</>
	}
	const apiKey = window.localStorage.getItem(`pro_apikey`)
	if (apiKey === null) {
		return <>You are not subscribed or logged in</>
	}
	return (
		<ApiDocs
			spec={{
				...yamlApiSpec,
				servers: yamlApiSpec.servers.map((s) => ({ ...s, url: s.url.replaceAll('APIKEY', apiKey) }))
			}}
		/>
	)
}
