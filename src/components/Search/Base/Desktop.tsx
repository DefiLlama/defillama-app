import * as React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { ArrowRight } from 'react-feather'
import { useComboboxState } from 'ariakit/combobox'
import type { IBaseSearchProps } from '../types'

import { Results } from './Results'
import { Input } from './Input'
import { findActiveItem } from './utils'

const Wrapper = styled.div`
	display: none;

	&[data-alwaysdisplay='true'] {
		display: flex;
	}

	flex-direction: column;
	position: relative;

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		display: flex;
		border-radius: 12px;
		box-shadow: ${({ theme }) => theme.shadowSm};
	}
`

const OptionsWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(246, 246, 246, 0.6)')};
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

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		border: 1px solid ${({ theme }) => theme.divider};
		border-top: 0;
	}
`

export const DesktopSearch = (props: IBaseSearchProps) => {
	const {
		data,
		loading = false,
		step,
		onSearchTermChange,
		filters,
		withValue,
		placeholder = 'Search...',
		value,
		...extra
	} = props

	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		...(value && { defaultValue: value }),
		list: data.map((x) => x.name)
	})

	// select first item on open
	const item = findActiveItem(combobox)
	const firstId = combobox.first()

	if (combobox.open && !item && firstId) {
		combobox.setActiveId(firstId)
	}

	React.useEffect(() => {
		if (onSearchTermChange) onSearchTermChange(combobox.value)
	}, [combobox.value, onSearchTermChange])

	// Resets combobox value when popover is collapsed
	if (!withValue && !combobox.mounted && combobox.value) {
		combobox.setValue('')
	}

	return (
		<Wrapper {...extra}>
			<Input state={combobox} placeholder={placeholder} breadCrumbs={step ? true : false} withValue />

			{step && <Options step={step} filters={filters} />}

			<Results state={combobox} data={data} loading={loading} onItemClick={props.onItemClick} />
		</Wrapper>
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
