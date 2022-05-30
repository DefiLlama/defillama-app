import React from 'react'
import styled from 'styled-components'
import { BasicLink } from '../Link'
import Link from 'next/link'
import Toggle from '../Toggle'
import { Icon } from 'react-feather'
import { useRouter } from 'next/router'
import { useDarkModeManager } from 'contexts/LocalStorage'

export const Wrapper = styled.header`
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;

  z-index: 1;
  background: linear-gradient(168deg, #344179 3.98%, #445ed0 100%);

  scrollbar-width: none;

  ::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
    padding: 32px 24px;
    position: sticky;
    top: 0;
    bottom: 0;
    width: revert;
    height: 100vh;
    overflow-y: auto;
  }
`

export const TitleWrapper = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  & > *:first-child {
    flex: 1;
  }

  @media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
    & > *:not(:first-child) {
      display: none;
    }
  }
`

export const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

interface INavLink {
  activeText?: boolean
}

export const NavLink = styled(BasicLink)<INavLink>`
  font-weight: 500;
  font-size: 14px;
  color: ${({ theme }) => theme.white};
  opacity: ${({ activeText }) => (activeText ? 1 : 0.6)};
  display: flex;
  align-items: center;

  :hover {
    opacity: 1;
  }

  :focus-visible {
    outline: 1px solid white;
    opacity: 1;
  }
`

const FooterWrapper = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;

  & > a {
    display: inline-block;
    color: ${({ theme }) => theme.white};
    opacity: 0.8;

    :hover {
      opacity: 1;
    }

    :focus-visible {
      outline: 1px solid white;
      opacity: 1;
    }
  }
`

interface IEntryProps {
  url: string
  name: string
  Icon: Icon
  newTag?: boolean
  activeText?: string
  style?: {}
}

export const Entry = ({ url, name, Icon, newTag, ...props }: IEntryProps) => {
  const router = useRouter()

  return (
    <NavLink href={url} {...props} activeText={router.pathname === url}>
      <Icon size={20} style={{ marginRight: '.75rem' }} />
      {name}
      {newTag === true && (
        <span
          style={{
            background: '#ebebeb',
            padding: '3px',
            marginLeft: '5px',
            marginTop: '0px',
            borderRadius: '4px',
            color: 'black',
            fontSize: '11px',
          }}
        >
          NEW
        </span>
      )}
    </NavLink>
  )
}

export const MobileOnlyEntry = styled(Entry)`
  @media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
    display: none;
  }
`

export const Footer = () => {
  const [darkMode, toggleDarkMode] = useDarkModeManager()
  return (
    <>
      <FooterWrapper>
        <Link href="https://twitter.com/DefiLlama" passHref>
          <a target="_blank" rel="noopener noreferrer">
            Twitter
          </a>
        </Link>

        <Link href="https://discord.gg/buPFYXzDDd" passHref>
          <a target="_blank" rel="noopener noreferrer">
            Discord
          </a>
        </Link>

        <Link href="https://t.me/defillama_tg" passHref>
          <a target="_blank" rel="noopener noreferrer">
            Daily news
          </a>
        </Link>

        <Link href="https://etherscan.io/address/0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437" passHref>
          <a target="_blank" rel="noopener noreferrer">
            Donate
          </a>
        </Link>

        <Link href="/press" passHref prefetch={false}>
          <a>Press / Media</a>
        </Link>

        <Link href="/docs/api" passHref prefetch={false}>
          <a>API Docs</a>
        </Link>

        <Link href="https://docs.llama.fi/list-your-project/submit-a-project" passHref>
          <a target="_blank" rel="noopener noreferrer">
            List Your Project
          </a>
        </Link>

        <Link href="https://defillama-datasets.s3.eu-central-1.amazonaws.com/all.csv" passHref>
          <a target="_blank" rel="noopener noreferrer">
            Download Data
          </a>
        </Link>
      </FooterWrapper>

      <Toggle isActive={darkMode} toggle={toggleDarkMode} />
    </>
  )
}
