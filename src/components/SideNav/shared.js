import React from 'react'
import styled from 'styled-components'
import { transparentize } from 'polished'

import { AutoColumn } from '../Column'
import { BasicLink } from '../Link'
import Link from '../Link'
import Toggle from '../Toggle'

export const Wrapper = styled.div`
  position: sticky;
  ${({ theme: { maxLg } }) => maxLg} {
    height: initial;
  }
  @media (min-width: ${({ theme: { bpLg } }) => `calc(${bpLg} + 1px)`}) {
    height: 100vh;
  }
  background-color: ${({ theme }) => transparentize(0.4, theme.bg1)};
  color: ${({ theme }) => theme.text1};
  padding: 0.5rem 0.5rem 0.5rem 0.75rem;
  top: 0px;
  z-index: 10000;
  box-sizing: border-box;
  /* background-color: #1b1c22; */
  background: linear-gradient(168deg, #344179 3.98%, #445ed0 100%);
  color: ${({ theme }) => theme.bg2};
  min-width: 220px;
  overflow-y: scroll;
  scrollbar-width: none;

  @media screen and (max-width: 800px) {
    grid-template-columns: 1fr;
    position: relative;
  }

  @media screen and (max-width: 600px) {
    padding: 1rem;
  }

  ${({ theme: { maxLg } }) => maxLg} {
    overflow-y: visible;
  }

  ::-webkit-scrollbar {
    display: none;
  }
`

export const Option = styled.div`
  font-weight: 500;
  font-size: 14px;
  opacity: ${({ activeText }) => (activeText ? 1 : 0.6)};
  color: ${({ theme }) => theme.white};
  display: flex;
  :hover {
    opacity: 1;
  }
`

export const MobileWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  ${({ theme: { maxLg } }) => maxLg} {
    align-items: center;
  }
  @media (min-width: ${({ theme: { bpLg } }) => `calc(${bpLg} + 1px)`}) {
    flex-direction: column;
    height: 100vh;
    padding: 1.5rem 0.75rem;
    box-sizing: border-box;
  }
`

export const HeaderText = styled.div`
  margin-right: 0.75rem;
  font-size: 0.825rem;
  font-weight: 500;
  display: inline-box;
  display: -webkit-inline-box;
  opacity: 0.8;
  :hover {
    opacity: 1;
  }
  a {
    color: ${({ theme }) => theme.white};
  }
`

export const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: row;
`

export const Mobile = styled.div`
  @media (min-width: ${({ theme: { bpLg } }) => `calc(${bpLg} + 1px)`}) {
    display: none;
  }
`

export const Desktop = styled.div`
  ${({ theme: { maxLg } }) => maxLg} {
    display: none;
  }
`

export const Entry = ({ url, name, history, Icon, newTag }) => (
  <BasicLink href={'/' + url}>
    <Option activeText={history.location.pathname === '/' + url ?? undefined}>
      <Icon size={20} style={{ marginRight: '.75rem' }} />
      {name}
      {(newTag === true) &&
        <span style={{
          background: "#ebebeb",
          padding: "3px",
          marginLeft: "5px",
          marginTop: "0px",
          borderRadius: "4px",
          color: "black",
          fontSize: "11px",
        }}>NEW</span>
      }
    </Option>
  </BasicLink>
)

export const Footer = ({ isDark, toggleDarkMode }) => (
  <>
    <AutoColumn gap="0.5rem" style={{ paddingBottom: '1rem' }}>
      <HeaderText>
        <Link href="https://twitter.com/DefiLlama" target="_blank">
          Twitter
        </Link>
      </HeaderText>
      <HeaderText>
        <Link href="https://discord.gg/buPFYXzDDd" target="_blank">
          Discord
        </Link>
      </HeaderText>
      <HeaderText>
        <Link href="/press">
          Press / Media
        </Link>
      </HeaderText>
      <HeaderText>
        <Link href="/docs/api">
          API Docs
        </Link>
      </HeaderText>
      <HeaderText>
        <Link href="https://docs.llama.fi/list-your-project/submit-a-project" target="_blank">
          List Your Project
        </Link>
      </HeaderText>
      <HeaderText>
        <Link href="https://defillama-datasets.s3.eu-central-1.amazonaws.com/all.csv" target="_blank">
          Download Data
        </Link>
      </HeaderText>
      <Toggle isActive={isDark} toggle={toggleDarkMode} />
    </AutoColumn>
  </>
)
