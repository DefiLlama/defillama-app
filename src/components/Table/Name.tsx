import * as React from 'react'
import styled from 'styled-components'
import { ChevronDown, ChevronRight, ArrowUpRight } from 'react-feather'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import Bookmark from '~/components/Bookmark'
import FormattedName from '~/components/FormattedName'
import { chainIconUrl, peggedAssetIconUrl, slug, tokenIconUrl } from '~/utils'
import { INameYield, INameProps, INameYieldPoolProps } from './types'
import Tooltip from '~/components/Tooltip'
import { ButtonYields } from '~/components/ProtocolAndPool'

const SaveButton = styled(Bookmark)`
	position: relative;
	flex-shrink: 0;
`

export const Index = styled.div`
	display: flex;
	gap: 1em;
	align-items: center;
	position: relative;

	svg {
		flex-shrink: 0;
		position: relative;
		top: 1px;
	}

	& > a,
	& > #table-p-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	#icon-link {
		flex-shrink: 0;
	}
`

export function Name({
	type,
	value,
	symbol = '-',
	index,
	bookmark,
	rowType = 'default',
	showRows,
	...props
}: INameProps) {
	const name =
		symbol === '-' ? (
			value
		) : (
			<>
				<span>{value}</span>
				<span id="table-p-symbol">{` (${symbol})`}</span>
			</>
		)
	const { iconUrl, tokenUrl } = React.useMemo(() => {
		let iconUrl, tokenUrl
		if (type === 'chain') {
			tokenUrl = `/${type}/${value}`
			iconUrl = chainIconUrl(value)
		} else if (type === 'peggedAssetChain' && !value.includes('Bridged from')) {
			tokenUrl = `/stablecoins/${value}`
			iconUrl = chainIconUrl(value)
		} else if (type === 'peggedAsset') {
			tokenUrl = `/stablecoin/${slug(value)}`
			iconUrl = peggedAssetIconUrl(value)
		} else {
			tokenUrl = `/${type}/${slug(value)}`
			iconUrl = tokenIconUrl(value)
		}

		return { iconUrl, tokenUrl }
	}, [type, value])

	let leftSpace: number | string = 0

	if (rowType === 'accordion') {
		leftSpace = bookmark ? '0px' : '-30px'
	}

	if (rowType === 'child') {
		leftSpace = '30px'
	}

	if (value.includes('Bridged from')) {
		return (
			<Index {...props} style={{ left: leftSpace }}>
				<span>-</span>
				<span id="table-p-name">{value}</span>
			</Index>
		)
	}

	return (
		<Index {...props} style={{ left: leftSpace }}>
			{rowType !== 'accordion' && bookmark && (
				<SaveButton readableProtocolName={value} style={{ paddingRight: rowType === 'pinned' ? '1ch' : 0 }} />
			)}
			{rowType === 'accordion' && (showRows ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
			<span>{rowType !== 'pinned' && index}</span>
			<TokenLogo id="table-p-logo" logo={iconUrl} />
			{rowType === 'accordion' ? (
				<span id="table-p-name">{name}</span>
			) : (
				<CustomLink href={tokenUrl} id="table-p-name">
					{name}
				</CustomLink>
			)}
		</Index>
	)
}

export function NameYield({ project, projectslug, rowType, airdrop, ...props }: INameYield) {
	const iconUrl = tokenIconUrl(project)
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<Index {...props}>
			<Tooltip content="This project has no token and might airdrop one to depositors in the future">
				<div style={{ width: '24px', flexShrink: 0, marginRight: '-12px' }}>{airdrop && '🪂'}</div>
			</Tooltip>
			<TokenLogo id="table-p-logo" logo={iconUrl} />
			{rowType === 'accordion' ? (
				<span id="table-p-name">{project}</span>
			) : (
				<CustomLink id="table-p-name" href={tokenUrl}>
					{project}
				</CustomLink>
			)}
		</Index>
	)
}

export function NameYieldPool({
	value,
	poolId,
	project,
	url,
	index,
	bookmark,
	rowType = 'default',
	...props
}: INameYieldPoolProps) {
	const tokenUrl = `/yields/pool/${poolId}`

	let leftSpace: number | string = 0

	return (
		<Index {...props} style={{ left: leftSpace }}>
			{bookmark && (
				<SaveButton readableProtocolName={poolId} style={{ paddingRight: rowType === 'pinned' ? '1ch' : 0 }} />
			)}
			<span>{rowType !== 'pinned' && index}</span>
			{url ? (
				<CustomLink href={url} target="_blank" id="icon-link">
					<ButtonYields as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
						<ArrowUpRight size={14} />
					</ButtonYields>
				</CustomLink>
			) : (
				''
			)}
			<CustomLink href={tokenUrl} target="_blank">
				<FormattedName text={value} maxCharacters={16} link fontWeight={500} />
			</CustomLink>
		</Index>
	)
}
