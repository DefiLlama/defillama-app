import Layout from '~/layout'
import yamlApiSpec from '~/docs/resolvedSpec.json'
import { useEffect } from 'react'
import 'swagger-ui/dist/swagger-ui.css'
import Head from 'next/head'
import { useIsClient } from '~/hooks'

export default function ApiDocs({ spec = yamlApiSpec }: { spec: any }) {
	const isClient = useIsClient()
	if (!isClient) return null

	return (
		<>
			<Head>
				<link rel="stylesheet" type="text/css" href="/swagger-dark.css" />
			</Head>
			<Layout title={`API Docs - DefiLlama`}>
				<Swagger spec={spec} />
			</Layout>
		</>
	)
}

function Swagger({ spec }) {
	useEffect(() => {
		async function init() {
			const { default: SwaggerUI } = await import('swagger-ui')
			SwaggerUI({
				dom_id: '#swagger',
				defaultModelsExpandDepth: -1,
				spec: spec,
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
