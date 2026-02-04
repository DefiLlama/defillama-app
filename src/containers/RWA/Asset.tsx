import { Fragment, lazy, Suspense, useMemo } from 'react'
import { CopyHelper } from '~/components/Copy'
import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import definitions from '~/public/rwa-definitions.json'
import { chainIconUrl, formattedNum } from '~/utils'
import { getBlockExplorer } from '~/utils/blockExplorers'
import type { IRWAAssetData } from './queries'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

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
			className={`flex items-start justify-between gap-2 rounded-md border p-2 ${
				isBoolean
					? positive
						? 'border-green-600/30 bg-green-600/10'
						: 'border-red-600/30 bg-red-600/10'
					: 'border-(--cards-border) bg-(--cards-bg)'
			}`}
		>
			<div className="flex flex-col gap-1">
				<span
					className={`font-medium ${
						isBoolean
							? positive
								? 'text-green-700 dark:text-green-400'
								: 'text-red-700 dark:text-red-400'
							: 'text-(--text-label)'
					}`}
				>
					{label}
				</span>
				{description && <span className="text-sm text-(--text-disabled)">{description}</span>}
			</div>
			{isBoolean ? (
				<Icon
					name={positive ? 'check-circle' : 'x'}
					className={`h-5 w-5 shrink-0 ${positive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
				/>
			) : (
				<span className="font-medium">{displayValue}</span>
			)}
		</div>
	)
}

// KYC items: true = warning (amber), false = green (no KYC required is good)
const KYCItem = ({
	label,
	required,
	description
}: {
	label: string
	required: boolean | null
	description?: string
}) => {
	if (required == null) return null

	return (
		<div
			className={`flex items-start justify-between gap-2 rounded-md border p-2 ${
				required ? 'border-amber-600/30 bg-amber-600/10' : 'border-green-600/30 bg-green-600/10'
			}`}
		>
			<div className="flex flex-col gap-1">
				<span
					className={`font-medium ${required ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}
				>
					{label}
				</span>
				{description && <span className="text-sm text-(--text-disabled)">{description}</span>}
			</div>
			<Icon
				name={required ? 'alert-triangle' : 'check-circle'}
				className={`h-5 w-5 shrink-0 ${required ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}
			/>
		</div>
	)
}

const SectionCard = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
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
		{isPrimary && showPrimaryStyle && <span className="ml-auto text-xs text-(--text-disabled)">Primary</span>}
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
	console.log(asset.chartDataset)
	const displayName = asset.name ?? asset.ticker ?? 'Unknown asset'
	const keyBase = asset.ticker ?? asset.name ?? 'asset'

	// Get attestation links as array
	const attestationLinks = asset.attestationLinks
		? Array.isArray(asset.attestationLinks)
			? asset.attestationLinks
			: [asset.attestationLinks]
		: []

	const contractsEntries = useMemo(() => (asset.contracts ? Object.entries(asset.contracts) : []), [asset.contracts])

	return (
		<div className="flex flex-col gap-2">
			{/* Header */}
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="text-xl font-bold">{displayName}</h1>
					{asset.ticker && <span className="text-(--text-disabled)">({asset.ticker})</span>}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{asset.website ? (
						asset.website.length > 1 ? (
							<Menu
								name="Website"
								options={asset.website}
								isExternal
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							/>
						) : (
							<a
								key={asset.website[0]}
								href={asset.website[0]}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							>
								<Icon name="external-link" className="h-3 w-3" />
								Website
							</a>
						)
					) : null}
					{asset.twitter ? (
						asset.twitter.length > 1 ? (
							<Menu
								name="Twitter"
								options={asset.twitter}
								isExternal
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							/>
						) : (
							<a
								key={asset.twitter[0]}
								href={asset.twitter[0]}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							>
								<Icon name="external-link" className="h-3 w-3" />
								Twitter
							</a>
						)
					) : null}
				</div>
			</div>

			{/* Stats Row */}
			<div className="flex flex-wrap gap-2">
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<Tooltip
						content={definitions.onChainMcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.onChainMcap.label}
					</Tooltip>
					<span className="font-jetbrains text-xl font-semibold">{formattedNum(asset.onChainMcap.total, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<Tooltip
						content={definitions.activeMcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.activeMcap.label}
					</Tooltip>
					<span className="font-jetbrains text-xl font-semibold">{formattedNum(asset.activeMcap.total, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<Tooltip
						content={definitions.defiActiveTvl.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.defiActiveTvl.label}
					</Tooltip>
					<span className="font-jetbrains text-xl font-semibold">{formattedNum(asset.defiActiveTvl.total, true)}</span>
				</p>
				{asset.price != null ? (
					<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<span className="text-(--text-label)">{asset.ticker ?? 'Token'} Price</span>
						<span className="font-jetbrains text-xl font-semibold">{formattedNum(asset.price, true)}</span>
					</p>
				) : null}
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<span className="text-(--text-label)">Chains</span>
					<span className="font-jetbrains text-xl font-semibold">{asset.chain?.length ?? 0}</span>
				</p>
			</div>

			{asset.chartDataset && asset.chartDataset.source.length > 0 ? (
				<div className="min-h-[412px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-3">
					<Suspense fallback={<></>}>
						<MultiSeriesChart2
							charts={timeSeriesCharts}
							dataset={asset.chartDataset}
							hideDefaultLegend={false}
							shouldEnableCSVDownload
							shouldEnableImageExport
							imageExportFilename={`${asset.ticker ?? asset.name ?? 'asset'}`}
							imageExportTitle={`${asset.ticker ?? asset.name ?? 'Asset'}`}
						/>
					</Suspense>
				</div>
			) : null}

			<div className="grid gap-2 lg:grid-cols-2">
				{/* Left Column */}
				<div className="flex flex-col gap-2">
					{/* Token Properties */}
					<SectionCard title="Token Properties">
						<div className="grid grid-cols-2 gap-2">
							<p className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<Tooltip
									content={definitions.category.description}
									className="text-(--text-label) underline decoration-dotted"
								>
									{definitions.category.label}
								</Tooltip>
								{asset.category && asset.category.length > 0 ? (
									<span className="flex flex-wrap items-center gap-1 font-medium">
										{asset.category.map((category, idx) => (
											<span key={category} className="flex items-center gap-0.5">
												{category}
												{definitions.category.values?.[category] && (
													<QuestionHelper text={definitions.category.values[category]} />
												)}
												{idx < asset.category!.length - 1 && ','}
											</span>
										))}
									</span>
								) : (
									<span className="font-medium">-</span>
								)}
							</p>
							<p className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<Tooltip
									content={definitions.assetClass.description}
									className="text-(--text-label) underline decoration-dotted"
								>
									{definitions.assetClass.label}
								</Tooltip>
								{asset.assetClass && asset.assetClass.length > 0 ? (
									<span className="flex flex-wrap items-center gap-1 font-medium">
										{asset.assetClass.map((ac, idx) => (
											<span key={ac} className="flex items-center gap-0.5">
												{ac}
												{asset.assetClassDescriptions?.[ac] && (
													<QuestionHelper text={asset.assetClassDescriptions[ac]} />
												)}
												{idx < asset.assetClass!.length - 1 && ','}
											</span>
										))}
									</span>
								) : (
									<span className="font-medium">-</span>
								)}
							</p>
							<p className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<Tooltip
									content={definitions.type.description}
									className="text-(--text-label) underline decoration-dotted"
								>
									{definitions.type.label}
								</Tooltip>
								<span className="font-medium">{asset.type || '-'}</span>
							</p>
							<p className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<Tooltip
									content={definitions.rwaClassification.description}
									className="text-(--text-label) underline decoration-dotted"
								>
									{definitions.rwaClassification.label}
								</Tooltip>
								<span className={`flex items-center gap-1 font-medium ${asset.trueRWA ? 'text-(--success)' : ''}`}>
									{asset.rwaClassification || '-'}
									{asset.rwaClassificationDescription && <QuestionHelper text={asset.rwaClassificationDescription} />}
								</span>
							</p>
							<p className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
								<Tooltip
									content={definitions.accessModel.description}
									className="text-(--text-label) underline decoration-dotted"
								>
									{definitions.accessModel.label}
								</Tooltip>
								<span className="flex items-center gap-1 font-medium">
									{asset.accessModel || '-'}
									{asset.accessModelDescription && <QuestionHelper text={asset.accessModelDescription} />}
								</span>
							</p>
							{asset.parentPlatform && (
								<p className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
									<span className="text-(--text-label)">Parent Platform</span>
									<span className="font-medium">{asset.parentPlatform}</span>
								</p>
							)}
						</div>
					</SectionCard>

					{/* Classification Flags */}
					<SectionCard title="Classification">
						<div className="grid grid-cols-2 gap-2">
							<ClassificationItem
								label={definitions.redeemable.label}
								positive={asset.redeemable}
								description={definitions.redeemable.description}
							/>
							<KYCItem
								label={definitions.kycForMintRedeem.label}
								required={asset.kycForMintRedeem}
								description={definitions.kycForMintRedeem.description}
							/>
							<KYCItem
								label={definitions.kycAllowlistedWhitelistedToTransferHold.label}
								required={asset.kycAllowlistedWhitelistedToTransferHold}
								description={definitions.kycAllowlistedWhitelistedToTransferHold.description}
							/>
							<ClassificationItem
								label={definitions.transferable.label}
								positive={asset.transferable}
								description={definitions.transferable.description}
							/>
							<ClassificationItem
								label={definitions.selfCustody.label}
								positive={asset.selfCustody}
								description={definitions.selfCustody.description}
							/>
							<ClassificationItem
								label={definitions.cexListed.label}
								positive={asset.cexListed}
								description={definitions.cexListed.description}
							/>
							<ClassificationItem
								label={definitions.attestations.label}
								positive={asset.attestations}
								description={definitions.attestations.description}
							/>
						</div>
					</SectionCard>

					{/* Contracts */}
					{contractsEntries.length > 0 && (
						<SectionCard title="Contracts">
							<div className="grid grid-cols-2 gap-2">
								{contractsEntries.map(([chain, contracts]) => (
									<Fragment key={`${keyBase}-contracts-${chain}`}>
										{contracts.map((contract) => (
											<ContractItem key={`${keyBase}-contract-${chain}-${contract}`} chain={chain} address={contract} />
										))}
									</Fragment>
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
							<p className="flex flex-col gap-1">
								<Tooltip
									content={definitions.issuer.description}
									className="text-(--text-label) underline decoration-dotted"
								>
									{definitions.issuer.label}
								</Tooltip>
								<span className="font-medium">{asset.issuer || '-'}</span>
							</p>
							{asset.isin && (
								<p className="flex flex-col gap-1">
									<Tooltip
										content={definitions.isin.description}
										className="text-(--text-label) underline decoration-dotted"
									>
										{definitions.isin.label}
									</Tooltip>
									<span className="font-mono font-medium">{asset.isin}</span>
								</p>
							)}
							{asset.issuerRegistryInfo && asset.issuerRegistryInfo.length > 0 && (
								<p className="flex flex-col gap-1">
									<Tooltip
										content={definitions.registryInformation.description}
										className="text-(--text-label) underline decoration-dotted"
									>
										{definitions.registryInformation.label}
									</Tooltip>
									<span className="font-medium">{asset.issuerRegistryInfo.join('; ')}</span>
								</p>
							)}
							{asset.issuerSourceLink ? (
								<p className="flex flex-col gap-1">
									<Tooltip
										content={definitions.source.description}
										className="text-(--text-label) underline decoration-dotted"
									>
										{definitions.source.label}
									</Tooltip>
									{asset.issuerSourceLink.map((link) => (
										<a
											key={link}
											href={link}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 font-medium break-all text-(--link-text) hover:underline"
										>
											<Icon name="external-link" className="h-4 w-4 shrink-0" />
											{link}
										</a>
									))}
								</p>
							) : null}
						</div>
					</SectionCard>

					{/* Chain Availability */}
					{asset.chain && asset.chain.length > 0 && (
						<SectionCard title="Chain Availability">
							<div className="flex flex-col gap-2">
								{asset.primaryChain && (
									<div>
										<Tooltip
											content={definitions.primaryChain.description}
											className="text-(--text-label) underline decoration-dotted"
										>
											{definitions.primaryChain.label}
										</Tooltip>
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
						<SectionCard
							title={
								<Tooltip content={definitions.attestations.description} className="underline decoration-dotted">
									Attestations
								</Tooltip>
							}
						>
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
			{asset.descriptionNotes ? (
				<SectionCard title="Notes">
					<ul className="list-disc space-y-1 pl-5 text-sm text-(--text-secondary)">
						{asset.descriptionNotes.map((note, idx) => (
							<li key={`${keyBase}-note-${idx}`}>{note}</li>
						))}
					</ul>
				</SectionCard>
			) : null}
		</div>
	)
}

const timeSeriesCharts: Array<{
	type: 'line' | 'bar'
	name: string
	stack: string
	encode: { x: number | Array<number> | string | Array<string>; y: number | Array<number> | string | Array<string> }
	color?: string
}> = [
	// Use distinct stack keys so ECharts doesn't cumulatively stack these series.
	{
		type: 'line',
		name: 'DeFi Active TVL',
		stack: 'defiActiveTvl',
		encode: { x: 'timestamp', y: 'DeFi Active TVL' },
		color: CHART_COLORS[0]
	},
	{
		type: 'line',
		name: 'Active Mcap',
		stack: 'activeMcap',
		encode: { x: 'timestamp', y: 'Active Mcap' },
		color: CHART_COLORS[1]
	},
	{
		type: 'line',
		name: 'Onchain Mcap',
		stack: 'onchainMcap',
		encode: { x: 'timestamp', y: 'Onchain Mcap' },
		color: CHART_COLORS[2]
	}
]
