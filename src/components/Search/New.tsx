import { Combobox, ComboboxItem, ComboboxPopover, useComboboxState } from 'ariakit/combobox'
import TokenLogo from 'components/TokenLogo'
import { useRouter } from 'next/router'
import { transparentize } from 'polished'
import { useMemo } from 'react'
import styled from 'styled-components'
import { chainIconUrl, standardizeProtocolName, tokenIconUrl } from 'utils'
import Link from 'next/link'
import { AllTvlOptions } from 'components/SettingsModal'
import { Search as SearchIcon, X as XIcon } from 'react-feather'

const Wrapper = styled.nav`
  flex: 1;
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
  box-shadow: 0px 24px 32px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.04),
    0px 0px 1px rgba(0, 0, 0, 0.04);

  ::placeholder {
    color: ${({ theme }) => theme.text3};
    font-size: 1rem;
  }

  :focus-visible,
  [data-focus-visible] {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

const Popover = styled(ComboboxPopover)`
  max-height: 240px;
  overflow-y: auto;
  background: ${({ theme }) => theme.bg6};
  z-index: 100;
  border-radius: 12px;
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.04);

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
  padding: 14px 16px;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  background: ${({ theme }) => transparentize(0.4, theme.bg6)};

  & > p {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    margin: 0;

    & > * {
      color: ${({ theme }) => theme.text1};
      font-size: 0.875rem;
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

interface IList {
  isChain: boolean
  logo: string
  name: string
}

interface ISearchProps {
  data: any
  loading?: boolean
  step?: { category: string; name: string }
}

export default function Search({ data, loading = false, step }: ISearchProps) {
  const router = useRouter()

  const searchData: IList[] = useMemo(() => {
    const chainData: IList[] =
      data?.chains?.map((name) => ({
        logo: chainIconUrl(name),
        isChain: true,
        name,
      })) ?? []

    return [...(data?.protocols?.map((token) => ({ ...token, logo: tokenIconUrl(token.name) })) ?? []), ...chainData]
  }, [data])

  const combobox = useComboboxState({ gutter: 8, sameWidth: true, list: searchData.map((x) => x.name).slice(0, 10) })

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

      <Popover state={combobox}>
        {loading || !combobox.mounted ? (
          <Empty>Loading...</Empty>
        ) : combobox.matches.length ? (
          combobox.matches.map((value) => {
            const item = searchData.find((x) => x.name === value)
            const to = item.isChain ? `/chain/${value}` : `/protocol/${standardizeProtocolName(value)}`

            return (
              <Item key={value} value={value} onClick={() => router.push(to)}>
                <TokenLogo logo={item.logo} />
                <span>{value}</span>
              </Item>
            )
          })
        ) : (
          <Empty>No results found</Empty>
        )}
      </Popover>
    </Wrapper>
  )
}

const Options = ({ step }) => {
  return (
    <OptionsWrapper>
      <p>
        <Link href={`/${step.category.toLowerCase()}`}>{step.category}</Link>
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11.928 6.216C11.88 6.088 11.808 5.976 11.712 5.88L6.72 0.888C6.528 0.696 6.288 0.599999 6 0.599999C5.728 0.584 5.488 0.68 5.28 0.888C5.088 1.08 4.992 1.32 4.992 1.608C4.992 1.88 5.088 2.112 5.28 2.304L8.592 5.592H1.008C0.736 5.592 0.496 5.696 0.288001 5.904C0.0960002 6.096 0 6.328 0 6.6C0 6.872 0.0960002 7.112 0.288001 7.32C0.496 7.512 0.736 7.608 1.008 7.608H8.592L5.28 10.896C5.088 11.088 4.992 11.328 4.992 11.616C4.992 11.888 5.088 12.128 5.28 12.336C5.472 12.528 5.712 12.624 6 12.624C6.288 12.624 6.528 12.52 6.72 12.312L11.712 7.32C11.808 7.224 11.88 7.112 11.928 6.984C12.04 6.728 12.04 6.472 11.928 6.216Z"
            fill="#FDFEFD"
          />
        </svg>
        <span style={{ color: step.color }}>{step.name}</span>
      </p>
      <AllTvlOptions style={{ display: 'flex', justifyContent: 'flex-end', margin: 0, fontSize: '0.875rem' }} />
    </OptionsWrapper>
  )
}
