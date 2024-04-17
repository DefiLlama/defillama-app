import styled from 'styled-components'
import Layout from '~/layout'
import DarkSwagger from '~/docs/swaggerDark'
import yamlApiSpec from '~/docs/proSpec.json'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useEffect } from 'react'
import 'swagger-ui/dist/swagger-ui.css'

export default function ApiDocs() {
	const [isDark] = useDarkModeManager()
	const apikey = typeof window !== 'undefined' ? window.localStorage.getItem(`pro_apikey`) : 'APIKEY'

	const Wrapper = isDark ? DarkSwagger : styled.div``

	return (
		<Layout title={`API Docs - DefiLlama`}>
			<HideSections>
				<Wrapper>
					<Swagger apiKey={apikey} />
				</Wrapper>
			</HideSections>
		</Layout>
	)
}

const HideSections = styled.div`
	.scheme-container {
		display: none;
	}
`

function Swagger(props: any) {
	useEffect(() => {
		async function init() {
			const { default: SwaggerUI } = await import('swagger-ui')
			SwaggerUI({
				dom_id: '#swagger',
				defaultModelsExpandDepth: -1,
				spec: {
					...yamlApiSpec,
					servers: yamlApiSpec.servers.map((s) => ({ ...s, url: s.url.replace('APIKEY', props.apiKey) }))
				},
				syntaxHighlight: {
					activated: false,
					theme: 'agate'
				},
				requestInterceptor: (request) => {
					request.url = request.url.replace(/%3A/g, ':').replace(/%2C/g, ',')
					return request
				}
			})
		}

		init()
	}, [])

	return <div id="swagger" />
}
