import styled from 'styled-components'
import { DesktopResults } from '../Base/Results/Desktop'
import { Input } from '../Base/Input'
import { useComboboxState } from 'ariakit'
import { findActiveItem } from '../Base/utils'
import { useMemo } from 'react'
import { slug } from '~/utils'

export default function InvestorsSearch({ list }) {
	const data = useMemo(() => list.map((name) => ({ name, route: `/raises/${slug(name.toLowerCase())}` })), [list])

	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		list: data.map((x) => x.name)
	})

	// select first item on open
	const item = findActiveItem(combobox)
	const firstId = combobox.first()

	if (combobox.open && !item && firstId) {
		combobox.setActiveId(firstId)
	}

	return (
		<Wrapper>
			<Input state={combobox} placeholder="Search investors..." withValue variant="secondary" />

			<DesktopResults state={combobox} data={data} loading={false} />
		</Wrapper>
	)
}

const Wrapper = styled.div`
	position: relative;

	input {
		width: 100%;
	}
`
