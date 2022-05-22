import { Combobox, ComboboxItem, ComboboxPopover, useComboboxState } from 'ariakit/combobox'
import TokenLogo from 'components/TokenLogo'
import { useRouter } from 'next/router'
import { transparentize } from 'polished'
import { useMemo } from 'react'
import styled from 'styled-components'
import { chainIconUrl, tokenIconUrl } from 'utils'

const Box = styled(Combobox)`
  padding: 16px;
  background: ${({ theme }) => transparentize(0.4, theme.bg6)};
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
  max-height: 320px;
  overflow-y: auto;
  background: ${({ theme }) => theme.bg6};
  z-index: 100;
  border-radius: 12px;
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.04);
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

interface IList {
  isChain: boolean
  logo: string
  name: string
}

export default function Search({ data }) {
  const router = useRouter()

  const searchData: IList[] = useMemo(() => {
    const chainData: IList[] =
      data?.chains?.map((name) => ({
        logo: chainIconUrl(name),
        isChain: true,
        name,
      })) ?? []

    return [...chainData, ...(data?.protocols?.map((token) => ({ ...token, logo: tokenIconUrl(token.name) })) ?? [])]
  }, [data])

  const combobox = useComboboxState({ gutter: 8, sameWidth: true, list: searchData.map((x) => x.name) })

  return (
    <>
      <Box state={combobox} placeholder="Search for DeFi Protocols..." />

      <Popover state={combobox}>
        {combobox.matches.length ? (
          combobox.matches.map((value) => {
            const item = searchData.find((x) => x.name === value)
            const to = item.isChain ? `/chain/${value}` : `/protocol/${value}`

            return (
              <Item
                key={value}
                value={value}
                onClick={() => {
                  combobox.setValue('')
                  router.push(to)
                }}
              >
                <TokenLogo logo={item.logo} />
                <span>{value}</span>
              </Item>
            )
          })
        ) : (
          <Empty>No results found</Empty>
        )}
      </Popover>
    </>
  )
}
