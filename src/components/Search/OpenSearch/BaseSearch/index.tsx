import { Combobox, ComboboxItem, ComboboxPopover, useComboboxState } from 'ariakit/combobox'
import TokenLogo from 'components/TokenLogo'
import { useRouter } from 'next/router'
import { transparentize } from 'polished'
import { useEffect } from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import { AllTvlOptions } from 'components/SettingsModal'
import { ArrowRight, Search as SearchIcon, X as XIcon } from 'react-feather'
import { DeFiTvlOptions } from 'components/Select'
import { FixedSizeList } from 'react-window'

const Wrapper = styled.nav`
  display: flex;
  flex-direction: column;
  position: relative;
`

const Box = styled(Combobox)`
  padding: 14px 16px;
  padding-top: 16px;
  background: ${({ theme }) => theme.bg6};
  border: none;
  border-radius: 12px;
  outline: none;
  color: ${({ theme }) => theme.text1};
  font-size: 1rem;
  margin: 0;

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
  z-index: 100;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  outline: ${({ theme }) => '1px solid ' + theme.text5};
  box-shadow: ${({ theme }) => theme.shadowLg};
  margin: 0;

  ${({ theme: { minLg } }) => minLg} {
    max-height: 320px;
  }
`

const Item = styled(ComboboxItem)`
  padding: 12px 14px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text1};
  display: flex;
  align-items: center;
  gap: 4px;

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
  text-align: center;
  padding: 24px 12px;
  color: ${({ theme }) => theme.text1};
`

const OptionsWrapper = styled.div`
  display: flex;
  align-items: center;
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
    margin: 0;

    & > * {
      color: ${({ theme }) => theme.text1};
      font-size: 0.875rem;
    }
  }

  a {
    :focus-visible {
      outline: ${({ theme }) => '1px solid ' + theme.text4};
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

const Filters = styled.section`
  color: ${({ theme }) => theme.text1};
  font-weight: 400;
  font-size: 0.75rem;
  opacity: 0.8;
  white-space: nowrap;
  display: none;
  gap: 8px;
  align-items: center;
  margin-left: auto;
  padding: 0 16px;

  ${({ theme: { min2Xl } }) => min2Xl} {
    display: flex;
  }
`

const DropdownOptions = styled(DeFiTvlOptions)`
  display: none;

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) and (max-width: ${({ theme }) => theme.bp2Xl}) {
    display: flex;
    padding: 0 4px;
  }
`
interface ISearchItem {
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
}

export const BaseSearch = (props: IBaseSearchProps) => {
  const { data, loading = false, step, onSearchTermChange } = props
  const combobox = useComboboxState({ gutter: 6, sameWidth: true, list: data.map((x) => x.name) })

  useEffect(() => {
    if (onSearchTermChange) onSearchTermChange(combobox.value)
  }, [combobox.value])

  // Resets combobox value when popover is collapsed
  if (!combobox.mounted && combobox.value) {
    combobox.setValue('')
  }

  return (
    <Wrapper>
      <Box
        state={combobox}
        placeholder="Search..."
        style={step && { borderBottomLeftRadius: '0', borderBottomRightRadius: 0 }}
      />

      <IconWrapper>{combobox.mounted ? <XIcon /> : <SearchIcon />}</IconWrapper>

      {step && <Options step={step} />}

      {/* TODO make auto resizing work */}
      <Popover state={combobox}>
        {loading || !combobox.mounted ? (
          <Empty>Loading...</Empty>
        ) : combobox.matches.length ? (
          <FixedSizeList
            height={combobox.matches.length * 50 > 240 ? 240 : combobox.matches.length * 50}
            width="100%"
            itemCount={combobox.matches.length}
            itemSize={50}
            itemData={{ searchData: data, options: combobox.matches }}
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

const isExternalImage = (imagePath: string) => {
  return imagePath?.includes('http')
}

// Virtualized Row
const Row = ({ index, style, data }) => {
  const { searchData, options } = data

  const value = options[index]

  const item = searchData.find((x) => x.name === value)

  const router = useRouter()

  return (
    <Item key={value} value={value} onClick={() => router.push(item.route)} style={style}>
      <TokenLogo logo={item.logo} external={isExternalImage(item.logo)} />
      <span>{value}</span>
    </Item>
  )
}

interface IOptionsProps {
  step?: IBaseSearchProps['step']
}

const Options = ({ step }: IOptionsProps) => {
  return (
    <OptionsWrapper>
      <p>
        <Link href={`/${step.route || step.category.toLowerCase()}`} prefetch={false}>
          {step.category}
        </Link>
        <ArrowRight size={16} />
        <span style={{ color: 'var(--step-color)' }}>{step.name}</span>
      </p>

      {!step.hideOptions && (
        <>
          <Filters>
            <label>INCLUDE IN TVL</label>
            <AllTvlOptions style={{ display: 'flex', justifyContent: 'flex-end', margin: 0, fontSize: '0.875rem' }} />
          </Filters>

          <DropdownOptions />
        </>
      )}
    </OptionsWrapper>
  )
}

export interface ICommonSearchProps {
  step?: IBaseSearchProps['step']
}
