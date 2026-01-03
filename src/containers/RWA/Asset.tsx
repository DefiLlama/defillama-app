import { CopyHelper } from '~/components/Copy'
import { Icon } from '~/components/Icon'
import { chainIconUrl, formattedNum } from '~/utils'
import { getBlockExplorer } from '~/utils/blockExplorers'
import type { IRWAAssetData } from './queries'

interface ClassificationItemProps {
	label: string
	value?: string | null
	positive?: boolean | null | undefined
	description?: string
}

const ClassificationItem = ({ label, value, positive, description }: ClassificationItemProps) => {
	if (value == null && positive == null) return null

	const isBoolean = positive != null
	const displayValue = isBoolean ? (positive ? 'Yes' : 'No') : value

	return (
		<div
			className={`flex items-center justify-between gap-2 rounded-md border p-2 ${
				isBoolean
					? positive
						? 'border-green-600/30 bg-green-600/10'
						: 'border-red-600/30 bg-red-600/10'
					: 'border-(--cards-border) bg-(--cards-bg)'
			}`}
		>
			<div className="flex flex-col">
				<span
					className={`text-xs ${isBoolean ? (positive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400') : 'text-(--text-label)'}`}
				>
					{label}
				</span>
				{description && <span className="text-[10px] text-(--text-disabled)">{description}</span>}
			</div>
			{isBoolean ? (
				<Icon
					name={positive ? 'check-circle' : 'x'}
					className={`h-4 w-4 ${positive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
				/>
			) : (
				<span className="text-sm font-medium">{displayValue}</span>
			)}
		</div>
	)
}

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
		<h2 className="font-semibold">{title}</h2>
		{children}
	</div>
)

const ChainBadge = ({
	chain,
	isPrimary = false,
	showPrimaryStyle = true
}: {
	chain: string
	isPrimary?: boolean
	showPrimaryStyle?: boolean
}) => (
	<div
		className={`flex items-center gap-1.5 rounded-md border p-2 ${
			isPrimary && showPrimaryStyle ? 'border-blue-500/30 bg-blue-500/10' : 'border-(--cards-border) bg-(--cards-bg)'
		}`}
	>
		<img src={chainIconUrl(chain)} alt={chain} className="h-5 w-5 rounded-full" loading="lazy" />
		<span className="text-sm font-medium">{chain}</span>
		{isPrimary && showPrimaryStyle && <span className="ml-auto text-[10px] text-(--text-disabled)">Primary</span>}
	</div>
)

const ContractItem = ({ chain, address }: { chain: string; address: string }) => {
	const truncatedAddress = address.length > 24 ? `${address.slice(0, 10)}...${address.slice(-10)}` : address
	const { blockExplorerLink } = getBlockExplorer(`${chain.toLowerCase()}:${address}`)

	return (
		<div className="flex flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
			<span className="text-xs text-(--text-label)">{chain}</span>
			<div className="flex items-center justify-between gap-2">
				{blockExplorerLink ? (
					<a
						href={blockExplorerLink}
						target="_blank"
						rel="noopener noreferrer"
						className="font-mono text-xs text-(--link-text) hover:underline"
					>
						{truncatedAddress}
					</a>
				) : (
					<span className="font-mono text-xs">{truncatedAddress}</span>
				)}
				<CopyHelper toCopy={address} />
			</div>
		</div>
	)
}

export const RWAAssetPage = ({ asset }: { asset: IRWAAssetData }) => {
	// Parse contracts - they come as "chain:address" format
	const parsedContracts = (asset.contracts ?? []).map((contract) => {
		const [chain, address] = contract.split(':')
		return { chain: chain || 'Unknown', address: address || contract }
	})

	// Get attestation links as array
	const attestationLinks = asset.attestationLinks
		? Array.isArray(asset.attestationLinks)
			? asset.attestationLinks
			: [asset.attestationLinks]
		: []

	return (
		<div className="flex flex-col gap-2">
			{/* Header */}
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex items-center gap-2">
					<h1 className="text-xl font-bold">{asset.name}</h1>
					{asset.ticker && <span className="text-(--text-disabled)">({asset.ticker})</span>}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{asset.website?.map((url) => (
						<a
							key={url}
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
						>
							<Icon name="external-link" className="h-3 w-3" />
							Website
						</a>
					))}
					{asset.twitter && (
						<a
							href={`https://twitter.com/${asset.twitter}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
						>
							<Icon name="external-link" className="h-3 w-3" />
							Twitter
						</a>
					)}
				</div>
			</div>

			{/* Stats Row */}
			<div className="flex flex-wrap gap-2">
				<div className="flex flex-1 flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-xs text-(--text-label)">On-chain Marketcap</span>
					<span className="font-jetbrains text-lg font-semibold">
						{formattedNum(asset.onChainMarketcap.total, true)}
					</span>
				</div>
				<div className="flex flex-1 flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-xs text-(--text-label)">DeFi Active TVL</span>
					<span className="font-jetbrains text-lg font-semibold">{formattedNum(asset.defiActiveTvl.total, true)}</span>
				</div>
				<div className="flex flex-1 flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-xs text-(--text-label)">Chains</span>
					<span className="font-jetbrains text-lg font-semibold">{asset.chain?.length ?? 0}</span>
				</div>
			</div>

			<div className="grid gap-2 lg:grid-cols-2">
				{/* Left Column */}
				<div className="flex flex-col gap-2">
					{/* Token Properties */}
					<SectionCard title="Token Properties">
						<div className="grid grid-cols-2 gap-2">
							<p className="flex flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<span className="text-xs text-(--text-label)">Category</span>
								<span className="text-sm font-medium">{asset.category?.join(', ') || '-'}</span>
							</p>
							<p className="flex flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<span className="text-xs text-(--text-label)">Asset Class</span>
								<span className="text-sm font-medium">{asset.assetClass?.join(', ') || '-'}</span>
							</p>
							<p className="flex flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<span className="text-xs text-(--text-label)">Type</span>
								<span className="text-sm font-medium">{asset.type || '-'}</span>
							</p>
							<p className="flex flex-col gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<span className="text-xs text-(--text-label)">RWA Classification</span>
								<span className="text-sm font-medium">{asset.rwaClassification || '-'}</span>
							</p>
						</div>
					</SectionCard>

					{/* Classification Flags */}
					<SectionCard title="Classification">
						{asset.accessModel && (
							<div className="flex flex-col gap-0.5 rounded-md border border-blue-600/30 bg-blue-600/10 p-2">
								<div className="flex items-center gap-1.5">
									<Icon name="layers" className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
									<span className="text-xs text-blue-700 dark:text-blue-400">Access Model</span>
								</div>
								<span className="text-sm font-medium">{asset.accessModel}</span>
								{asset.accessModel === 'Permissionless' && (
									<span className="text-xs text-(--text-disabled)">
										Anyone can access and interact with this asset without restrictions
									</span>
								)}
							</div>
						)}
						<div className="grid grid-cols-2 gap-2">
							<ClassificationItem
								label="Redeemable"
								positive={asset.redeemable}
								description="Can be exchanged for underlying asset"
							/>
							<ClassificationItem
								label="KYC Required"
								positive={
									asset.kyc == null
										? undefined
										: asset.kyc === true || (Array.isArray(asset.kyc) && asset.kyc.length > 0)
								}
								description="Required to mint and redeem"
							/>
							<ClassificationItem
								label="Transferable"
								positive={asset.transferable}
								description="Can be sent to other wallets"
							/>
							<ClassificationItem
								label="Self Custody"
								positive={asset.selfCustody}
								description="Hold in your own wallet"
							/>
							<ClassificationItem
								label="CEX Listed"
								positive={asset.cexListed}
								description="Available on centralized exchanges"
							/>
							<ClassificationItem
								label="Attestations"
								positive={asset.attestations}
								description="Third-party verification available"
							/>
						</div>
					</SectionCard>

					{/* Contracts */}
					{parsedContracts.length > 0 && (
						<SectionCard title="Contracts">
							<div className="grid grid-cols-2 gap-2">
								{parsedContracts.map((contract, idx) => (
									<ContractItem key={idx} chain={contract.chain} address={contract.address} />
								))}
							</div>
						</SectionCard>
					)}
				</div>

				{/* Right Column */}
				<div className="flex flex-col gap-2">
					{/* Issuer Information */}
					<SectionCard title="Issuer Information">
						<div className="flex flex-col gap-2">
							<div>
								<span className="text-xs text-(--text-label)">Issuer Name</span>
								<p className="text-sm font-medium">{asset.issuer || '-'}</p>
							</div>
							{asset.issuerRegistryInfo && asset.issuerRegistryInfo.length > 0 && (
								<div>
									<span className="text-xs text-(--text-label)">Registry Information</span>
									<p className="text-xs">{asset.issuerRegistryInfo.join('; ')}</p>
								</div>
							)}
							{asset.issuerSourceLink && (
								<div>
									<span className="text-xs text-(--text-label)">Source</span>
									<a
										href={asset.issuerSourceLink}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 text-xs break-all text-(--link-text) hover:underline"
									>
										<Icon name="external-link" className="h-3 w-3 shrink-0" />
										{asset.issuerSourceLink}
									</a>
								</div>
							)}
						</div>
					</SectionCard>

					{/* Chain Availability */}
					{asset.chain && asset.chain.length > 0 && (
						<SectionCard title="Chain Availability">
							<div className="flex flex-col gap-2">
								{asset.primaryChain && (
									<div>
										<span className="text-xs text-(--text-label)">Primary Chain</span>
										<div className="mt-1">
											<ChainBadge chain={asset.primaryChain} isPrimary />
										</div>
									</div>
								)}
								<div>
									<span className="text-xs text-(--text-label)">
										Available on {asset.chain.length} {asset.chain.length === 1 ? 'chain' : 'chains'}
									</span>
									<div className="mt-1 grid grid-cols-2 gap-1.5">
										{asset.chain.map((chain) => (
											<ChainBadge
												key={chain}
												chain={chain}
												isPrimary={chain === asset.primaryChain}
												showPrimaryStyle={asset.chain!.length > 1}
											/>
										))}
									</div>
								</div>
							</div>
						</SectionCard>
					)}

					{/* Attestations */}
					{attestationLinks.length > 0 && (
						<SectionCard title="Attestations">
							{attestationLinks.map((link, idx) => (
								<a
									key={idx}
									href={link}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 hover:bg-(--link-hover-bg)"
								>
									<div className="flex items-center gap-2">
										<Icon name="check-circle" className="h-4 w-4 text-(--text-label)" />
										<div className="flex flex-col">
											<span className="text-sm font-medium">View Attestations</span>
											<span className="text-xs text-(--text-disabled)">Third-party verification reports</span>
										</div>
									</div>
									<Icon name="external-link" className="h-3 w-3 text-(--text-disabled)" />
								</a>
							))}
						</SectionCard>
					)}
				</div>
			</div>

			{/* Description Notes */}
			{asset.descriptionNotes && (
				<SectionCard title="Notes">
					<p className="text-xs text-(--text-secondary)">{asset.descriptionNotes}</p>
				</SectionCard>
			)}
		</div>
	)
}
