import Layout from '~/layout'
import yamlApiSpec from '~/docs/resolvedSpec.json'
import { useEffect } from 'react'
import 'swagger-ui/dist/swagger-ui.css'
import Head from 'next/head'
import { useIsClient } from '~/hooks'
import { useRouter } from 'next/router'
import { Announcement } from '~/components/Announcement'
import Link from 'next/link'

export default function ApiDocs({ spec = yamlApiSpec }: { spec: any }) {
	const router = useRouter()
	const isClient = useIsClient()
	if (!isClient) return null

	return (
		<>
			<Head>
				<link rel="stylesheet" type="text/css" href="/swagger-dark.css" />
			</Head>
			<Layout title={`API Docs - DefiLlama`}>
				{router.pathname === '/docs/api' ? (
					<div className="relative p-3 text-sm text-black dark:text-white text-center rounded-md bg-[hsl(215deg_79%_51%_/_12%)]">
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
									<a href="https://defillama.com/subscribe" className="underline">
										https://defillama.com/subscribe
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
				) : (
					<div className="relative p-3 text-sm text-black dark:text-white text-center rounded-md bg-[hsl(215deg_79%_51%_/_12%)]">
						<p>
							Upgrade to the <b>Pro API</b>{' '}
							<a href="https://defillama.com/subscribe" className="underline">
								https://defillama.com/subscribe
							</a>
						</p>
					</div>
				)}
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
