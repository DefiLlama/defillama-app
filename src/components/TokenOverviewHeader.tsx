import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'

type TokenOverviewHeaderProps = {
	name: string
	title?: string
	price?: number | null
	percentChange?: number | null
	circSupply?: number | null
	maxSupply?: number | null
	mcap?: number | null
	fdv?: number | null
	volume24h?: number | null
	symbol?: string | null
}

export function TokenOverviewHeader({
	name,
	title,
	price,
	percentChange,
	circSupply,
	maxSupply,
	mcap,
	fdv,
	volume24h,
	symbol
}: TokenOverviewHeaderProps) {
	const hasStats = circSupply != null || maxSupply != null || mcap != null || fdv != null || volume24h != null

	return (
		<>
			<div className="flex w-full items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<TokenLogo name={name} kind="token" alt={`Logo of ${name}`} />
				<h1 className="text-xl font-semibold">{title ?? name}</h1>

				{price != null ? (
					<>
						<span className="mx-1 h-5 w-px bg-(--cards-border)" />
						<span className="text-base font-semibold">${formattedNum(price)}</span>
						{percentChange !== null && percentChange !== undefined ? (
							<span
								className="text-sm font-medium"
								style={{
									color: percentChange > 0 ? 'rgba(18, 182, 0, 0.7)' : 'rgba(211, 0, 0, 0.7)'
								}}
							>
								{percentChange > 0 ? '+' : null}
								{percentChange}%
							</span>
						) : null}
					</>
				) : null}
			</div>

			{hasStats ? (
				<div className="flex min-h-[46px] w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
					{circSupply != null ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">Circ. Supply</span>
							<span className="text-sm font-medium">
								{formattedNum(circSupply)} {symbol}
							</span>
						</div>
					) : null}

					{maxSupply != null ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">Max Supply</span>
							<span className="text-sm font-medium">
								{maxSupply !== Infinity ? formattedNum(maxSupply) : '∞'} {symbol}
							</span>
						</div>
					) : null}

					{mcap != null ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">MCap</span>
							<span className="text-sm font-medium">${formattedNum(mcap)}</span>
						</div>
					) : null}

					{fdv != null ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">FDV</span>
							<span className="text-sm font-medium">${formattedNum(fdv)}</span>
						</div>
					) : null}

					{volume24h != null ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">Vol 24h</span>
							<span className="text-sm font-medium">${formattedNum(volume24h)}</span>
						</div>
					) : null}
				</div>
			) : null}
		</>
	)
}
