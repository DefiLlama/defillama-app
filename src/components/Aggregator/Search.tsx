import { useMemo, useRef, useState } from 'react'
import ReactSelect from '../MultiSelect/ReactSelect'
import { FixedSizeList as List } from 'react-window'

import { DesktopSearch } from '../Search/Base'
import { createFilter } from 'react-select'

interface Props {
	tokens: Array<{ symbol: string; address: string }>
	setTokens: (
		obj: Record<'token0' | 'token1', { address: string; logoURI: string; symbol: string; decimals: string }>
	) => void
}

const height = 35

const MenuList = (props) => {
	const { options, children, maxHeight, getValue } = props
	const [value] = getValue()
	const initialOffset = options.indexOf(value) * height

	if (!children.length) return null

	return (
		<List height={maxHeight} itemCount={children.length} itemSize={height} initialScrollOffset={initialOffset}>
			{({ index, style }) => <div style={style}>{children[index]}</div>}
		</List>
	)
}

export default function Search({ tokens, setTokens }: Props) {
	console.log(tokens)

	const options = useMemo(
		() => tokens.map((token) => ({ ...token, value: token.address, label: token.symbol })),
		[tokens]
	)

	const [data, setData] = useState(options)
	const [s, ss] = useState(null)

	const onChange = (value) => {
		if (value.token0 && value.token1) setTokens(value)
	}
	const onSearch = (val) => {
		if (val.includes('-')) {
			setData(
				tokens
					.filter(({ symbol }) => symbol.toLowerCase().includes(val.split('-')[0]))
					.reduce(
						(acc, val, _, arr) =>
							acc.concat(
								options.map((token1) => ({
									token1,
									label: `${val.symbol}-${token1.symbol}`,
									value: `${val.address}-${token1.address}`,
									token0: val
								}))
							),
						[]
					)
			)
		}
	}

	return (
		<ReactSelect
			placeholder="Search... (BTC-ETH)"
			options={data}
			onInputChange={onSearch}
			components={{ MenuList }}
			filterOption={createFilter({ ignoreAccents: false })}
			onMenuClose={() => setData(options)}
			onChange={onChange}
		/>
	)
}
