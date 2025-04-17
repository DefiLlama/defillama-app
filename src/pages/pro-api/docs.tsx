import yamlApiSpec from '~/docs/proSpec.json'
import openApiSpec from '~/docs/resolvedSpec.json'
import 'swagger-ui/dist/swagger-ui.css'
import { ApiDocs } from '../docs/api'
import { useIsClient } from '~/hooks'
import { useMemo, useState, useEffect } from 'react'
import Layout from '~/layout'
import Head from 'next/head'
export default function Docs() {
	const isClient = useIsClient()
	const [apiKey, setApiKey] = useState<string | null>(null)

	useEffect(() => {
		if (isClient) {
			setApiKey(window.localStorage.getItem('pro_apikey') ?? '')
		}
	}, [isClient])

	useEffect(() => {
		if (isClient && apiKey !== null) {
			window.localStorage.setItem('pro_apikey', apiKey)
		}
	}, [apiKey, isClient])

	const finalSpec = useMemo(() => {
		const key = apiKey ?? 'APIKEY'
		const spec = JSON.parse(JSON.stringify(yamlApiSpec)) // Deep clone to avoid mutation issues
		spec.servers = spec.servers.map((s: any) => ({ ...s, url: s.url.replaceAll('APIKEY', key) }))
		Object.entries(openApiSpec.paths).forEach(([path, val]) => {
			let server = 'api'
			const routes = Object.fromEntries(
				Object.entries(val).map(([method, route]: any) => {
					server = (route.servers?.[0]?.url ?? 'https://api.llama.fi').replace('https://', '').split('.')[0]
					return [method, { ...route, servers: undefined }]
				})
			)
			spec.paths[`/${server}${path}`] = routes
		})
		return spec
	}, [apiKey])

	if (!isClient) {
		return null
	}

	return (
		<Layout title={`API Docs - DefiLlama`}>
			<Head>
				<link rel="stylesheet" type="text/css" href="/swagger-dark.css" />
			</Head>
			<div className="relative p-3 text-sm text-black dark:text-white text-center rounded-md bg-[hsl(215deg_79%_51%_/_12%)]">
				<p>
					Upgrade to the <b>Pro API</b>{' '}
					<a href="https://defillama.com/subscribe" className="underline">
						https://defillama.com/subscribe
					</a>
				</p>
			</div>
			<div className="w-full px-4 py-4 rounded-md bg-[hsl(215deg_79%_51%_/_12%)]">
				<label htmlFor="apiKeyInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Enter your Pro API Key:
				</label>
				<input
					id="apiKeyInput"
					type="text"
					value={apiKey ?? ''}
					onChange={(e) => setApiKey(e.target.value)}
					placeholder="Your API Key"
					className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-black dark:text-white"
				/>
				<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Your key is saved locally in your browser&apos;s storage.
				</p>
			</div>

			<ApiDocs spec={finalSpec} />
		</Layout>
	)
}
