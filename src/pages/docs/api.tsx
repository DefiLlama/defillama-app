import Layout from '~/layout'
import yamlApiSpec from '~/docs/resolvedSpec.json'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export function ApiDocs({ spec }: { spec: any }) {
	const router = useRouter()

	const downloadSpec = () => {
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(spec, null, 2))
		const downloadAnchorNode = document.createElement('a')
		downloadAnchorNode.setAttribute('href', dataStr)
		downloadAnchorNode.setAttribute('download', 'defillama-api-spec.json')
		document.body.appendChild(downloadAnchorNode)
		downloadAnchorNode.click()
		downloadAnchorNode.remove()
	}

	useEffect(() => {
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = '/swagger-dark.css'
		document.head.appendChild(link)
	}, [])

	return (
		<>
			{router.pathname === '/docs/api' ? (
				<div className="relative p-3 text-sm text-black dark:text-white text-center rounded-md bg-[hsl(215deg_79%_51%/12%)]">
					<div className="flex flex-col items-center">
						<div className="flex flex-col items-start gap-4">
							<p>
								Need more from the DefiLlama API? Our <b>Pro API</b> gives you:
							</p>

							<ul className="list-disc list-inside flex flex-col items-start gap-2">
								<li>Access to all data – including raises, unlocks, active users, and more.</li>
								<li>Higher rate limits – handle more requests.</li>
								<li>Priority support – get help when you need it.</li>
							</ul>

							<p>
								Upgrade here:{' '}
								<a href="https://defillama.com/subscription" className="underline">
									https://defillama.com/subscription
								</a>
							</p>

							<p>
								Full <b>Pro API</b> documentation here:{' '}
								<a href="https://defillama.com/pro-api/docs" className="underline">
									https://defillama.com/pro-api/docs
								</a>
							</p>
						</div>
					</div>
				</div>
			) : null}
			<div className="flex justify-end w-full">
				<button
					onClick={downloadSpec}
					className="px-4 py-2 bg-[#2172E5] hover:bg-[#4285f4] text-white rounded-md transition-colors"
				>
					Download API Spec
				</button>
			</div>
			<SwaggerUI
				defaultModelsExpandDepth={-1}
				spec={spec}
				syntaxHighlight={{
					activated: false,
					theme: 'agate'
				}}
				requestInterceptor={(request) => {
					request.url = request.url.replace(/%3A/g, ':').replace(/%2C/g, ',')
					return request
				}}
				responseInterceptor={(response) => {
					if (response.url.includes('https://api.llama.fi/protocols')) {
						const data = response.body.slice(0, 10)
						response.body = data
						response.data = JSON.stringify(data)
						response.text = JSON.stringify(data)
						response.obj = data
						return response
					}

					if (response.url.includes('https://api.llama.fi/protocol/')) {
						try {
							const tokens = response.body.tokens?.slice(0, 2) ?? []
							const tokensInUsd = response.body.tokensInUsd?.slice(0, 2) ?? []
							const tvl = response.body.tvl?.slice(0, 2) ?? []

							const data = response.body

							if (data.tokens) {
								data.tokens = tokens
							}
							if (data.tokensInUsd) {
								data.tokensInUsd = tokensInUsd
							}
							if (data.tvl) {
								data.tvl = tvl
							}

							data.chainTvls = {}

							response.data = JSON.stringify(data)
							response.text = JSON.stringify(data)
							response.obj = data
							return response
						} catch (e) {
							console.warn('Could not process response for size limiting:', e)
						}
					}

					return response
				}}
			/>
		</>
	)
}

export default function ApiDocsPage() {
	return (
		<Layout title="DefiLlama API Docs">
			<ApiDocs spec={yamlApiSpec} />
		</Layout>
	)
}
