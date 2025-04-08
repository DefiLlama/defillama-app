import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import toast from 'react-hot-toast'
import { Subscription } from '~/hooks/useSubscribe'

interface SubscriberContentProps {
	apiKey: string | null
	isApiKeyLoading: boolean
	generateNewKey: () => void
	credits: number | null
	isCreditsLoading: boolean
	subscription: Subscription
	createPortalSession: () => Promise<string | null>
	isPortalSessionLoading: boolean
}

export const SubscriberContent = ({
	apiKey,
	isApiKeyLoading,
	generateNewKey,
	credits,
	isCreditsLoading,
	subscription,
	createPortalSession,
	isPortalSessionLoading
}: SubscriberContentProps) => {
	const isContributor = subscription?.type === 'contributor'
	const creditsLimit = isContributor ? 200_000 : 1_000_000

	return (
		<>
			<div className="relative overflow-hidden bg-gradient-to-b from-[#222429] to-[#1d1f24] border border-[#39393E] rounded-xl shadow-xl">
				<div className="absolute -inset-1 blur-[100px] bg-gradient-to-r from-[#5C5EFC]/20 to-[#462A92]/20 opacity-70 -z-10"></div>

				<div className="border-b border-[#39393E]/40 p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="relative">
								<div className="bg-[#5C5CF9]/10 text-[#5C5CF9] p-2.5 rounded-lg relative">
									<Icon name="file-plus" height={20} width={20} />
								</div>
							</div>
							<div>
								<h3 className="text-xl font-bold">API Access</h3>
								<p className="text-sm text-[#b4b7bc]">Manage your Pro API integration</p>
							</div>
						</div>
						<a
							href="https://defillama.com/pro-api/docs"
							target="_blank"
							rel="noreferrer noopener"
							className="px-4 py-2 bg-[#5C5CF9]/10 hover:bg-[#5C5CF9]/20 text-[#5C5CF9] rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
							aria-label="View API documentation"
						>
							<Icon name="file-text" height={14} width={14} />
							<span>API Documentation</span>
						</a>
					</div>
				</div>

				<div className="p-6">
					{isApiKeyLoading ? (
						<div className="py-12 flex flex-col items-center justify-center">
							<div className="relative h-14 w-14 mb-4">
								<div className="absolute inset-0 h-full w-full border-4 border-[#5C5CF9]/30 rounded-full"></div>
								<div className="absolute inset-0 h-full w-full border-4 border-transparent border-t-[#5C5CF9] rounded-full animate-spin"></div>
							</div>
							<p className="text-[#b4b7bc]">Fetching your API credentials...</p>
						</div>
					) : apiKey ? (
						<div className="space-y-6">
							<div className="bg-gradient-to-r from-[#1a1b1f] to-[#1a1b1f]/80 border border-[#39393E] rounded-lg overflow-hidden">
								<div className="p-4 border-b border-[#39393E]/60 flex justify-between items-center">
									<h4 className="font-medium flex items-center gap-2">
										<Icon name="file-plus" height={16} width={16} className="text-[#5C5CF9]" />
										Your API Key
									</h4>
									<div className="flex items-center gap-1">
										<button
											className="p-2 text-[#5C5CF9] hover:text-[#4A4AF0] hover:bg-[#5C5CF9]/5 rounded-lg transition-colors group"
											onClick={() => {
												navigator.clipboard.writeText(apiKey)
												toast.success('API key copied to clipboard')
											}}
											aria-label="Copy API key to clipboard"
										>
											<Icon name="copy" height={16} width={16} className="group-hover:scale-110 transition-transform" />
										</button>
										<button
											onClick={generateNewKey}
											className="p-2 text-[#5C5CF9] hover:text-[#4A4AF0] hover:bg-[#5C5CF9]/5 rounded-lg transition-colors group flex items-center gap-1.5 text-sm"
											disabled={isApiKeyLoading}
											aria-label="Regenerate API key"
										>
											<Icon
												name="repeat"
												height={14}
												width={14}
												className={isApiKeyLoading ? 'animate-spin' : 'group-hover:rotate-90 transition-transform'}
											/>
											<span>Regenerate</span>
										</button>
									</div>
								</div>

								<div className="p-4 relative group">
									<div className="p-3 bg-gradient-to-r from-[#13141a] to-[#181a1f] border border-[#39393E]/60 rounded-lg font-mono text-sm break-all">
										<div className="absolute inset-0 flex items-center justify-center bg-[#181a1f]/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
											<button
												onClick={() => {
													navigator.clipboard.writeText(apiKey)
													toast.success('API key copied to clipboard')
												}}
												className="px-4 py-2 bg-[#5C5CF9] text-white rounded-lg flex items-center gap-2 shadow-lg"
											>
												<Icon name="copy" height={16} width={16} />
												<span>Copy Key</span>
											</button>
										</div>
										{apiKey}
									</div>
								</div>
							</div>

							<div className="p-5 bg-gradient-to-r from-[#1a1b1f] to-[#1a1b1f]/80 border border-[#39393E] rounded-lg">
								<div className="flex items-center justify-between mb-5">
									<h4 className="font-medium">Usage Dashboard</h4>
									<span className="text-xs text-[#5C5CF9] bg-[#5C5CF9]/10 px-3 py-1 rounded-full">
										Current Billing Cycle
									</span>
								</div>

								<div className="grid md:grid-cols-2 gap-6">
									<div>
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-1.5">
												<Icon name="pie-chart" height={14} width={14} className="text-[#5C5CF9]" />
												<span className="text-sm">API Calls</span>
												<Ariakit.TooltipProvider timeout={0}>
													<Ariakit.TooltipAnchor>
														<Icon name="circle-help" height={12} width={12} className="text-[#8a8c90]" />
													</Ariakit.TooltipAnchor>
													<Ariakit.Tooltip className="bg-black border border-[#39393E] rounded-lg p-3 max-w-xs text-xs shadow-xl">
														Number of API calls remaining in the current billing cycle.
													</Ariakit.Tooltip>
												</Ariakit.TooltipProvider>
											</div>
											<div className="flex items-baseline gap-1">
												{isCreditsLoading ? (
													<span className="text-[#8a8c90] text-xs">Loading...</span>
												) : credits ? (
													<>
														<span className="text-white font-semibold">{credits}</span>
														<span className="text-[#8a8c90] text-xs">/ {creditsLimit.toLocaleString()}</span>
													</>
												) : (
													<span className="text-[#8a8c90] text-xs">No calls available</span>
												)}
											</div>
										</div>

										<div className="h-3 bg-[#39393E]/20 rounded-full overflow-hidden mb-2">
											{credits && (
												<div
													className={`relative h-full w-[${((credits / creditsLimit) * 100).toFixed(
														1
													)}%] bg-gradient-to-r from-[#5C5CF9]/80 to-[#5842C3]`}
												>
													<div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(92,92,249,0.4)_50%,transparent_75%)] bg-[length:1rem_1rem] animate-shimmer"></div>
												</div>
											)}
										</div>

										<div className="flex justify-between items-center text-xs text-[#8a8c90]">
											<span>{credits ? `${credits.toLocaleString()} remaining` : 'No calls available'}</span>
											<span>{credits ? `${((credits / creditsLimit) * 100).toFixed(1)}% remaining` : '-'}</span>
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-1.5">
												<Icon name="pie-chart" height={14} width={14} className="text-[#5C5CF9]" />
												<span className="text-sm">Rate Limit</span>
											</div>
											<div className="flex items-baseline gap-1">
												<span className="text-white font-semibold">
													{subscription?.status === 'active' || subscription?.status === 'contributor'
														? '1,000'
														: '100'}
												</span>
												<span className="text-[#8a8c90] text-xs">requests/minute</span>
											</div>
										</div>

										<div className="h-3 bg-[#39393E]/20 rounded-full overflow-hidden mb-2">
											<div className="relative h-full w-full bg-gradient-to-r from-[#5C5CF9]/80 to-[#5842C3]">
												<div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(92,92,249,0.4)_50%,transparent_75%)] bg-[length:1rem_1rem] animate-shimmer"></div>
											</div>
										</div>

										<div className="flex justify-between items-center text-xs text-[#8a8c90]">
											<span>
												{subscription?.status === 'active'
													? 'Pro tier access'
													: subscription?.status === 'contributor'
													? 'Contributor tier access'
													: 'LlamaFeed tier'}
											</span>
											<span>
												{subscription?.status === 'active'
													? 'Pro & Contributor'
													: subscription?.status === 'contributor'
													? 'Contributor'
													: 'LlamaFeed'}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="text-center py-8 space-y-6">
							<div className="max-w-md mx-auto">
								<div className="bg-[#5C5CF9]/10 text-[#5C5CF9] p-3 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
									<Icon name="file-plus" height={24} width={24} />
								</div>
								<h4 className="text-lg font-semibold mb-2">Generate Your API Key</h4>
								<p className="text-[#b4b7bc] mb-6">
									Create your unique API key to start integrating Pro data into your applications and dashboards.
								</p>
							</div>

							<button
								onClick={generateNewKey}
								className="relative px-6 py-3.5 font-medium bg-gradient-to-r from-[#5C5CF9] to-[#5842C3] hover:from-[#4A4AF0] hover:to-[#4335A8] text-white rounded-lg transition-colors flex items-center gap-2 mx-auto shadow-lg group"
								disabled={isApiKeyLoading}
							>
								{isApiKeyLoading ? (
									<>
										<span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
										<span>Generating...</span>
									</>
								) : (
									<>
										<Icon
											name="file-plus"
											height={16}
											width={16}
											className="group-hover:scale-110 transition-transform"
										/>
										<span>Generate API Key</span>
									</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>

			<div className="bg-gradient-to-b from-[#222429] to-[#1d1f24] border border-[#39393E] rounded-xl shadow-lg overflow-hidden">
				<div className="border-b border-[#39393E]/40 p-6">
					<div className="flex items-center gap-3">
						<div className="relative">
							<div className="bg-[#5C5CF9]/10 text-[#5C5CF9] p-2.5 rounded-lg relative">
								<Icon name="card" height={20} width={20} />
							</div>
						</div>
						<div>
							<h3 className="text-xl font-bold">Subscription</h3>
							<p className="text-sm text-[#b4b7bc]">
								Manage your <span className="font-bold">{isContributor ? 'Contributor' : 'Pro'}</span> subscription
								details
							</p>
						</div>
					</div>
				</div>

				<div className="p-6">
					<div className="space-y-6">
						<div className="p-5 bg-gradient-to-r from-[#1a1b1f] to-[#1a1b1f]/80 border border-[#39393E] rounded-lg">
							<div className="flex justify-between items-center mb-4">
								<h4 className="font-medium flex items-center gap-2">
									<Icon name="bookmark" height={16} width={16} className="text-[#5C5CF9]" />
									<span>{isContributor ? 'Contributor' : 'Pro'} Plan</span>
								</h4>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<span className="h-2 w-2 bg-green-400 rounded-full"></span>
										<span className="text-sm font-medium text-white">Active</span>
									</div>
									<button
										onClick={createPortalSession}
										disabled={isPortalSessionLoading}
										className="px-4 py-2 bg-[#5C5CF9]/10 hover:bg-[#5C5CF9]/20 text-[#5C5CF9] rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
									>
										{isPortalSessionLoading ? (
											<>
												<span className="h-3 w-3 border-2 border-[#5C5CF9]/30 border-t-[#5C5CF9] rounded-full animate-spin"></span>
												<span>Loading...</span>
											</>
										) : (
											<>
												<Icon name="settings" height={14} width={14} />
												<span>Manage Subscription</span>
											</>
										)}
									</button>
								</div>
							</div>

							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<div className="bg-[#13141a]/60 p-3 rounded-lg">
									<p className="text-xs text-[#8a8c90] mb-1">Billing Cycle</p>
									<p className="font-medium">Monthly</p>
								</div>

								<div className="bg-[#13141a]/60 p-3 rounded-lg">
									<p className="text-xs text-[#8a8c90] mb-1">Price</p>
									<p className="font-medium">{isContributor ? '$15.00 USD' : '$300.00 USD'}</p>
								</div>

								<div className="bg-[#13141a]/60 p-3 rounded-lg">
									<p className="text-xs text-[#8a8c90] mb-1">Next billing date</p>
									<p className="font-medium">
										{subscription?.expires_at
											? new Date(+subscription.expires_at * 1000).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
											  })
											: 'Not available'}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
