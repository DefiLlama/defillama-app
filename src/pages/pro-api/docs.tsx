import yamlApiSpec from '~/docs/proSpec.json'
import openApiSpec from '~/docs/resolvedSpec.json'
import 'swagger-ui/dist/swagger-ui.css'
import { ApiDocs } from '../docs/api'
import { useIsClient } from '~/hooks'
import { useState, useEffect } from 'react'
import Layout from '~/layout'
import Head from 'next/head'

export default function Docs() {
	const isClient = useIsClient()
	const [savedApiKey, setSavedApiKey] = useState<string | null>(null)
	const [inputApiKey, setInputApiKey] = useState<string>('')

	useEffect(() => {
		if (isClient) {
			const storedKey = window.localStorage.getItem('pro_apikey') ?? ''
			setSavedApiKey(storedKey)
			setInputApiKey(storedKey)
		}
	}, [isClient])

	const handleSaveApiKey = () => {
		if (isClient) {
			window.localStorage.setItem('pro_apikey', inputApiKey)
			window.location.reload()
		}
	}

	const finalSpec = (() => {
		const spec = JSON.parse(JSON.stringify(yamlApiSpec))
		spec.servers = spec.servers.map((s: any) => ({ ...s, url: s.url.replaceAll('APIKEY', savedApiKey ?? 'APIKEY') }))
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
	})()

	useEffect(() => {
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = '/swagger-dark.css'
		document.head.appendChild(link)
	}, [])

	return (
		<Layout title={`API Docs - DefiLlama`}>
			<div className="relative p-3 text-sm text-black dark:text-white text-center rounded-md bg-[hsl(215deg_79%_51%/12%)]">
				<p>
					Upgrade to the <b>Pro API</b>{' '}
					<a href="https://defillama.com/subscription" className="underline">
						https://defillama.com/subscription
					</a>
				</p>
			</div>
			<div className="w-full px-4 py-4 rounded-md bg-[hsl(215deg_79%_51%/12%)]">
				<label htmlFor="apiKeyInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Enter your Pro API Key:
				</label>
				<div className="flex items-center space-x-2">
					<input
						id="apiKeyInput"
						type="text"
						value={inputApiKey}
						onChange={(e) => setInputApiKey(e.target.value)}
						placeholder="Your API Key"
						className="grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-black dark:text-white"
					/>
					<button
						onClick={handleSaveApiKey}
						className="px-4 py-2 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
					>
						Save
					</button>
				</div>
				<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Your key is saved locally in your browser&apos;s storage.
				</p>
			</div>

			<ApiDocs spec={{ ...finalSpec }} />
		</Layout>
	)
}
