import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FixedSizeList } from 'react-window'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { ArrowRight, Search as SearchIcon, X as XIcon } from 'react-feather'
import { Combobox, ComboboxItem, ComboboxPopover, useComboboxState } from 'ariakit/combobox'
import TokenLogo from '~/components/TokenLogo'

const Wrapper = styled.nav`
	display: flex;
	flex-direction: column;
	position: relative;
`

const Box = styled(Combobox)`
	padding: 14px 16px;
	padding-top: 16px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	font-size: 1rem;
	border: none;
	border-radius: 12px;
	outline: none;

	::placeholder {
		color: ${({ theme }) => theme.text3};
		font-size: 1rem;
	}

	&[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text4};
	}
`

const Popover = styled(ComboboxPopover)`
	height: 100%;
	max-height: 240px;
	overflow-y: auto;
	background: ${({ theme }) => theme.bg6};
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
	outline: ${({ theme }) => '1px solid ' + theme.text5};
	box-shadow: ${({ theme }) => theme.shadowLg};
	transform: translate(0px, -5px);
	z-index: 11;
	${({ theme: { minLg } }) => minLg} {
		max-height: 320px;
	}
`

const Item = styled(ComboboxItem)`
	padding: 12px 14px;
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 0.85rem;
	color: ${({ theme }) => theme.text1};

	& > * {
		margin-right: 6px;
	}

	:hover {
		cursor: pointer;
		background-color: ${({ theme }) => theme.bg2};
	}

	&[data-active-item] {
		background-color: ${({ theme }) => theme.bg2};
	}
`

const Empty = styled.div`
	padding: 24px 12px;
	color: ${({ theme }) => theme.text1};
	text-align: center;
`

const OptionsWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
	box-shadow: ${({ theme }) => theme.shadowSm};
	background: ${({ theme }) => transparentize(0.4, theme.bg6)};
	--step-color: ${({ theme }) => (theme.mode === 'dark' ? '#7e96ff' : '#475590')};

	& > p {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px;

		& > * {
			color: ${({ theme }) => theme.text1};
			font-size: 0.875rem;
		}

		svg {
			flex-shrink: 0;
		}
	}
`

const IconWrapper = styled.div`
	position: absolute;
	top: 14px;
	right: 16px;

	& > svg {
		color: ${({ theme }) => theme.text3};
		height: 20px;
		width: 20px;
	}
`

export interface ISearchItem {
	name: string
	route: string
	logo?: string
	symbol?: string
}

// Define breadcrumb of the search
interface IStep {
	category: string
	name: string
	route?: string
	hideOptions?: boolean
}

export interface IBaseSearchProps {
	data: ISearchItem[]
	loading?: boolean
	step?: IStep
	onSearchTermChange?: (searchValue: string) => void
	customPath?: (item: string) => string
	onItemClick?: (item: ISearchItem) => void
	filters?: React.ReactNode
	placeholder?: string
}

export const BaseSearch = (props: IBaseSearchProps) => {
	const { data, loading = false, step, onSearchTermChange, filters, placeholder = 'Search...' } = props
	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		list: data.map((x) => x.name)
	})

	React.useEffect(() => {
		if (onSearchTermChange) onSearchTermChange(combobox.value)
	}, [combobox.value, onSearchTermChange])

	// Resets combobox value when popover is collapsed
	if (!combobox.mounted && combobox.value) {
		combobox.setValue('')
	}

	return (
		<Wrapper>
			<Box
				state={combobox}
				placeholder={placeholder}
				style={step && { borderBottomLeftRadius: '0', borderBottomRightRadius: 0 }}
			/>

			<IconWrapper>{combobox.mounted ? <XIcon /> : <SearchIcon />}</IconWrapper>

			{step && <Options step={step} filters={filters} />}

			<Popover state={combobox}>
				{loading || !combobox.mounted ? (
					<Empty>Loading...</Empty>
				) : combobox.matches.length ? (
					<FixedSizeList
						height={combobox.matches.length * 50 > 240 ? 240 : combobox.matches.length * 50}
						width="100%"
						itemCount={combobox.matches.length}
						itemSize={50}
						itemData={{
							searchData: data,
							options: combobox.value.length > 2 ? sortResults(combobox.matches) : combobox.matches,
							onItemClick: props.onItemClick
						}}
					>
						{Row}
					</FixedSizeList>
				) : (
					<Empty>No results found</Empty>
				)}
			</Popover>
		</Wrapper>
	)
}

const sortResults = (results: string[]) => {
	const { pools, tokens } = results.reduce(
		(acc, curr) => {
			if (curr.startsWith('Show all')) {
				acc.pools.push(curr)
			} else acc.tokens.push(curr)
			return acc
		},
		{ tokens: [], pools: [] }
	)

	return [...pools, ...tokens]
}

const isExternalImage = (imagePath: string) => {
	return imagePath?.includes('http')
}

// Virtualized Row
const Row = ({ index, style, data }) => {
	const { searchData, options, onItemClick } = data

	const value = options[index]

	const item: ISearchItem = searchData.find((x) => x.name === value)

	const router = useRouter()

	return (
		<Item
			key={value}
			value={value}
			onClick={() => {
				if (onItemClick) {
					onItemClick(item)
				} else {
					router.push(item.route)
				}
			}}
			style={style}
		>
			<TokenLogo
				logo={item?.logo}
				external={isExternalImage(item.logo)}
				skipApiRoute={router.pathname.includes('/yield')}
			/>
			<span>{value}</span>
		</Item>
	)
}

interface IOptionsProps {
	step?: IBaseSearchProps['step']
	filters?: React.ReactNode
}

const Options = ({ step, filters }: IOptionsProps) => {
	return (
		<OptionsWrapper>
			<p>
				<Link href={`/${step.route || step.category.toLowerCase()}`} prefetch={false}>
					{step.category}
				</Link>
				<ArrowRight size={16} />
				<span style={{ color: 'var(--step-color)' }}>{step.name}</span>
			</p>

			{!step.hideOptions && filters && <>{filters}</>}
		</OptionsWrapper>
	)
}

export interface ICommonSearchProps {
	step?: IBaseSearchProps['step']
	onItemClick?: IBaseSearchProps['onItemClick']
}
