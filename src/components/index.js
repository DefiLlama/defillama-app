import React from 'react'
import styled from 'styled-components'
import { Text, Box } from 'rebass'
import Table from './Table'

const Divider = styled(Box)`
  height: 1px;
  background-color: ${({ theme }) => theme.divider};
`

export const IconWrapper = styled.div`
  position: absolute;
  right: 0;
  border-radius: 3px;
  height: 16px;
  width: 16px;
  padding: 0px;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.text1};

  :hover {
    cursor: pointer;
    opacity: 0.7;
  }
`

const Hint = ({ children, ...rest }) => (
  <Text fontSize={16} weight={500} {...rest}>
    {children}
  </Text>
)

export const Hover = styled.div`
  :hover {
    cursor: pointer;
    opacity: ${({ fade }) => fade && '0.7'};
  }
`

export const StyledIcon = styled.div`
  color: ${({ theme }) => theme.text1};
`

const EmptyCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  border-radius: 20px;
  color: ${({ theme }) => theme.text1};
  height: ${({ height }) => height && height};
`

export const SideBar = styled.span`
  display: grid;
  grid-gap: 24px;
  position: sticky;
  top: 4rem;
`

export const SubNav = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 0;
  margin-bottom: 2rem;
`
export const SubNavEl = styled.li`
  list-style: none;
  display: flex;
  padding-bottom: 0.5rem;
  margin-right: 1rem;
  font-weight: ${({ isActive }) => (isActive ? 600 : 500)};
  border-bottom: 1px solid rgba(0, 0, 0, 0);

  :hover {
    cursor: pointer;
    border-bottom: 1px solid ${({ theme }) => theme.bg3};
  }
`

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: 36px;
  padding-bottom: 80px;

  @media screen and (max-width: 600px) {
    & > * {
      padding: 0 12px;
    }
  }
`

export const FullWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  box-sizing: border-box;
`

export const FixedMenu = styled.div`
  z-index: 99;
  width: 100%;
  box-sizing: border-box;
  padding: 1rem;
  box-sizing: border-box;
  margin-bottom: 2rem;
  max-width: 100vw;

  @media screen and (max-width: 800px) {
    margin-bottom: 0;
  }
`

export const ProtocolsTable = styled(Table)`
  tr > *:not(:first-child) {
    & > div {
      width: 100px;
      white-space: nowrap;
      overflow: hidden;
      font-weight: 400;
      margin-left: auto;
    }
  }

  // PROTOCOL NAME
  tr > *:nth-child(1) {
    & > div {
      width: 120px;
      overflow: hidden;
      white-space: nowrap;

      // HIDE LOGO
      & > *:nth-child(3) {
        display: none;
      }

      & > *:nth-child(4) {
        overflow: hidden;
        text-overflow: ellipsis;
        // HIDE SYMBOL
        & > *:nth-child(2) {
          display: none;
        }
      }
    }
  }

  // CHAINS
  tr > *:nth-child(2) {
    display: none;
    & > div {
      width: 200px;
      overflow: hidden;
      white-space: nowrap;
    }
  }

  // 1D CHANGE
  tr > *:nth-child(3) {
    display: none;
  }

  // 7D CHANGE
  tr > *:nth-child(4) {
    display: none;
  }

  // 1M CHANGE
  tr > *:nth-child(5) {
    display: none;
  }

  // TVL
  tr > *:nth-child(6) {
    padding-right: 20px;
    & > div {
      text-align: right;
      margin-left: auto;
      white-space: nowrap;
      overflow: hidden;
    }
  }

  // MCAPTVL
  tr > *:nth-child(7) {
    display: none;
  }

  tr > th:nth-child(7) {
    & > div {
      margin-left: auto;
    }
  }

  @media screen and (min-width: 360px) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > div {
        width: 160px;
      }
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpSm}) {
    // 7D CHANGE
    tr > *:nth-child(4) {
      display: revert;
    }
  }

  @media screen and (min-width: 640px) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > div {
        width: 280px;
        // SHOW LOGO
        & > *:nth-child(3) {
          display: revert;
        }
      }
    }
  }

  @media screen and (min-width: 720px) {
    // 1M CHANGE
    tr > *:nth-child(5) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpMed}) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > div {
        & > *:nth-child(4) {
          // SHOW SYMBOL
          & > *:nth-child(2) {
            display: revert;
          }
        }
      }
    }
  }

  @media screen and (min-width: 900px) {
    // TVL
    tr > *:nth-child(6) {
      padding-right: 0px;
    }

    // MCAPTVL
    tr > *:nth-child(7) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    // 1D CHANGE
    tr > *:nth-child(3) {
      display: none !important;
    }

    // TVL
    tr > *:nth-child(6) {
      padding-right: 20px;
    }

    // MCAPTVL
    tr > *:nth-child(7) {
      display: none !important;
    }
  }

  @media screen and (min-width: 1200px) {
    // 1M CHANGE
    tr > *:nth-child(5) {
      display: revert !important;
    }
  }

  @media screen and (min-width: 1300px) {
    // 1D CHANGE
    tr > *:nth-child(3) {
      display: revert !important;
    }

    // TVL
    tr > *:nth-child(6) {
      padding-right: 0px;
    }

    // MCAPTVL
    tr > *:nth-child(7) {
      display: revert !important;
    }
  }

  @media screen and (min-width: 1536px) {
    // PROTOCOL NAME
    tr > *:nth-child(1) {
      & > div {
        width: 300px;
      }
    }

    // CHAINS
    tr > *:nth-child(2) {
      display: revert;
    }
  }
`

export { Hint, Divider, EmptyCard }
