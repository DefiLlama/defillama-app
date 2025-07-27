import { useState } from 'react'
import { PullToRefresh } from '~/components/PullToRefresh'
import Layout from '~/layout'
import { useRouter } from 'next/router'

export default function TestPullRefresh() {
	const router = useRouter()
	const [items, setItems] = useState([
		'Protocol A - $1.2B TVL', 
		'Protocol B - $890M TVL', 
		'Protocol C - $567M TVL', 
		'Protocol D - $234M TVL',
		'Protocol E - $123M TVL',
		'Protocol F - $89M TVL',
		'Protocol G - $45M TVL',
		'Protocol H - $23M TVL',
		'Protocol I - $12M TVL',
		'Protocol J - $5M TVL'
	])
	const [refreshCount, setRefreshCount] = useState(0)

	const handleRefresh = async () => {
		console.log('Pull to refresh triggered!')
		// Simulate API call like real pages
		await new Promise(resolve => setTimeout(resolve, 2000))
		
		// Simulate new data
		const newCount = refreshCount + 1
		setItems(prev => [`New Protocol ${newCount} - $${Math.floor(Math.random() * 1000)}M TVL`, ...prev])
		setRefreshCount(newCount)
	}

	const handlePageRefresh = async () => {
		console.log('Page pull to refresh triggered!')
		await new Promise(resolve => setTimeout(resolve, 1500))
		router.reload()
	}

	return (
		<Layout title="Pull to Refresh Test - DefiLlama" defaultSEO>
			<PullToRefresh onRefresh={handlePageRefresh} className="min-h-screen">
				<div className="flex items-center justify-between flex-wrap -mb-6">
					<h1 className="text-2xl font-semibold text-(--text1)">Pull to Refresh Test</h1>
				</div>

				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md p-4 mb-6">
					<p className="text-(--text2) text-sm">
						This page tests pull-to-refresh. Pull down anywhere on the page to refresh. 
						Refreshed {refreshCount} times.
					</p>
				</div>

				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
					<div className="p-6">
						<h2 className="text-lg font-semibold text-(--text1) mb-4">DeFi Protocols</h2>
						<div className="space-y-3">
							{items.map((item, index) => (
								<div 
									key={`${item}-${index}`}
									className="flex items-center justify-between p-4 bg-(--bg1) rounded-md hover:bg-(--bg2) transition-colors"
								>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
											{index + 1}
										</div>
										<span className="text-(--text1)">{item}</span>
									</div>
									<div className="text-(--text3) text-sm">
										24h: +{(Math.random() * 10).toFixed(2)}%
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</PullToRefresh>
		</Layout>
	)
}