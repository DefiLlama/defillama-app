import { Bookmark } from '~/components/Bookmark'
import { FormattedName } from '~/components/FormattedName'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formatRaiseAmount } from '~/containers/Raises/utils'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { formattedNum } from '~/utils'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const MOBILE_PRIMARY_COLUMN_MAX_WIDTH = 'max-sm:max-w-[clamp(160px,40vw,260px)]'

interface INameYieldPoolProps {
	value: string
	configID: string
	url: string
	rowIndex?: number
	borrow?: boolean
	withoutLink?: boolean
	maxCharacters?: number
	bookmark?: boolean
	strategy?: boolean
	poolMeta?: string | null
}

interface INameYield {
	project: string
	projectslug: string
	airdrop?: boolean
	raiseValuation?: number | null
	borrow?: boolean
	withoutLink?: boolean
}

export function NameYieldPool({
	value,
	configID,
	url,
	rowIndex,
	borrow: _borrow,
	strategy,
	withoutLink,
	maxCharacters,
	bookmark = true,
	poolMeta
}: INameYieldPoolProps) {
	const tokenUrl = strategy ? `/yields/strategy/${configID}` : `/yields/pool/${configID}`
	const width = useBreakpointWidth()
	const mc = maxCharacters ?? (width >= 1536 ? 20 : width >= 1280 ? 12 : 10)

	return (
		<span className="flex min-w-0 items-center gap-2">
			{bookmark ? <Bookmark readableName={value} configID={configID} data-lgonly /> : null}

			{strategy ? null : rowIndex != null ? (
				<span className="inline-block shrink-0 text-left tabular-nums" aria-hidden="true">
					{rowIndex}
				</span>
			) : (
				<span className="vf-row-index shrink-0" aria-hidden="true" />
			)}

			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="hidden shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover) lg:flex"
				onClick={() => trackUmamiEvent('yields-pool-external-link', { pool: value })}
			>
				<Icon name="arrow-up-right" height={14} width={14} />
				<span className="sr-only">open in new tab</span>
			</a>

			<LinkWrapper
				url={withoutLink ? null : tokenUrl}
				showTooltip={value.length + (poolMeta ? poolMeta.length : 0) >= mc}
			>
				{poolMeta ? (
					<>
						<span
							className={`min-w-0 shrink overflow-hidden font-medium text-ellipsis whitespace-nowrap text-(--link-text) ${MOBILE_PRIMARY_COLUMN_MAX_WIDTH}`}
						>
							{value}
						</span>
						<span className="ml-1 shrink overflow-hidden rounded-lg bg-(--bg-tertiary) px-1 py-0.5 text-xs text-ellipsis whitespace-nowrap text-black group-data-[tooltipcontent=true]:whitespace-break-spaces dark:text-white">
							{poolMeta}
						</span>
					</>
				) : (
					<>{value}</>
				)}
			</LinkWrapper>
		</span>
	)
}

const LinkWrapper = ({ url, children, showTooltip }) => {
	if (showTooltip) {
		return (
			<>
				{url ? (
					<Tooltip
						render={
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								onClick={() => trackUmamiEvent('yields-pool-click')}
							/>
						}
						className={`flex min-w-0 shrink! items-center overflow-hidden font-medium text-ellipsis whitespace-nowrap text-(--link-text) ${MOBILE_PRIMARY_COLUMN_MAX_WIDTH}`}
						content={children}
						data-fullwidth
					>
						{children}
					</Tooltip>
				) : (
					<Tooltip
						className={`flex min-w-0 shrink! items-center overflow-hidden font-medium text-ellipsis whitespace-nowrap text-(--link-text) ${MOBILE_PRIMARY_COLUMN_MAX_WIDTH}`}
						content={children}
						data-fullwidth
					>
						{children}
					</Tooltip>
				)}
			</>
		)
	}

	return (
		<>
			{url ? (
				<BasicLink
					href={url}
					target="_blank"
					data-umami-event="yields-pool-click"
					className={`flex min-w-0 items-center overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) ${MOBILE_PRIMARY_COLUMN_MAX_WIDTH}`}
				>
					{children}
				</BasicLink>
			) : (
				<span
					className={`flex min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap ${MOBILE_PRIMARY_COLUMN_MAX_WIDTH}`}
				>
					{children}
				</span>
			)}
		</>
	)
}

function AirdropIndicator({
	raiseValuation,
	className = 'm-[0_16px_0_-32px]'
}: {
	raiseValuation?: number | null
	className?: string
}) {
	const raiseValuationFormatted = formatRaiseAmount(raiseValuation)
	const tooltipContent =
		raiseValuationFormatted != null ? (
			<span className="flex flex-col gap-1">
				<span>Potential Airdrop</span>
				<span className="border-t border-current/20 pt-1">Last Valuation: {formattedNum(raiseValuationFormatted)}</span>
			</span>
		) : (
			'Potential Airdrop'
		)

	return (
		<Tooltip content={tooltipContent} className={className}>
			{raiseValuation != null ? '💸' : '🪂'}
		</Tooltip>
	)
}

export function NameYield({
	project,
	projectslug,
	airdrop,
	raiseValuation,
	borrow: _borrow,
	withoutLink,
	...props
}: INameYield) {
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<span className="relative flex items-center gap-2 pl-6" {...props}>
			{airdrop && project !== 'Fraxlend' ? <AirdropIndicator raiseValuation={raiseValuation} /> : null}
			<TokenLogo name={project} kind="token" alt={`Logo of ${project}`} size={22} />
			{withoutLink ? (
				<FormattedName text={project} maxCharacters={20} link fontWeight={500} />
			) : (
				<BasicLink
					href={tokenUrl}
					data-umami-event="yields-project-filter-click"
					data-umami-event-project={project}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
				>
					{project}
				</BasicLink>
			)}
		</span>
	)
}

export function YieldsProject({ project, projectslug }: INameYield) {
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<span className="flex items-center gap-2">
			<TokenLogo name={project} kind="token" alt={`Logo of ${project}`} size={22} />
			<BasicLink
				href={tokenUrl}
				data-umami-event="yields-project-filter-click"
				data-umami-event-project={project}
				className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
			>
				{project}
			</BasicLink>
		</span>
	)
}

export function PoolStrategyRoute({
	project1,
	airdropProject1,
	raiseValuationProject1,
	project2,
	airdropProject2,
	raiseValuationProject2,
	chain
}) {
	return (
		<span className="flex items-center gap-1">
			<TokenLogo name={chain} kind="chain" alt={`Logo of ${chain}`} />
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				<TokenLogo name={project1} kind="token" alt={`Logo of ${project1}`} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project1}</span>
				{airdropProject1 ? <AirdropIndicator raiseValuation={raiseValuationProject1} className="" /> : null}
			</span>
			<span className="shrink-0">{'->'}</span>
			<span className="flex items-center gap-1">
				<TokenLogo name={project2} kind="token" alt={`Logo of ${project2}`} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project2}</span>
				{airdropProject2 ? <AirdropIndicator raiseValuation={raiseValuationProject2} className="" /> : null}
			</span>
		</span>
	)
}

export function FRStrategyRoute({
	project1,
	airdropProject1,
	raiseValuationProject1,
	project2,
	airdropProject2: _airdropProject2,
	chain
}) {
	return (
		<span className="flex items-center gap-1">
			<TokenLogo name={chain} kind="chain" alt={`Logo of ${chain}`} />
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				<TokenLogo name={project1} kind="token" alt={`Logo of ${project1}`} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project1}</span>
				{airdropProject1 ? <AirdropIndicator raiseValuation={raiseValuationProject1} className="" /> : null}
			</span>
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				<TokenLogo name={project2} kind="token" alt={`Logo of ${project2}`} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project2}</span>
			</span>
		</span>
	)
}
