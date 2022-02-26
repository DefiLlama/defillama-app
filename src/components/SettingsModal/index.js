import React, { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import MenuIcon from './MenuSvg'
import {
  useStakingManager,
  useDisplayUsdManager,
  useBorrowedManager,
  useHideLastDayManager,
  useTvlToggles,
  useGetExtraTvlEnabled,
  STAKING,
  POOL2,
  BORROWED,
  OFFERS,
  TREASURY,
  DARK_MODE,
  HIDE_LAST_DAY,
  DISPLAY_USD,
  DOUBLE_COUNT,
  useDarkModeManager,
} from '../../contexts/LocalStorage'

import { AutoRow } from '../Row'
import { useIsClient } from 'hooks'
import OptionToggle from 'components/OptionToggle'
import * as ScrollArea from '@radix-ui/react-scroll-area'

const StyledMenuIcon = styled(MenuIcon)`
  svg {
    path {
      stroke: ${({ theme }) => theme.text1};
    }
  }
`

const StyledMenuButton = styled.button`
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 35px;
  background-color: ${({ theme }) => theme.bg3};
  padding: 0.15rem 0.5rem;
  border-radius: 0.5rem;
  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }
  svg {
    margin-top: 2px;
    path {
      stroke: ${({ theme }) => theme.text1};
    }
  }
`

const StyledMenu = styled.div`
  margin-left: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
  text-align: left;
`

const MenuFlyout = styled.span`
  min-width: 9rem;
  background-color: ${({ theme }) => theme.bg3};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 12px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  position: absolute;
  top: 2.6rem;
  right: 0rem;
  z-index: 100000;
`

const StyledLink = styled.a`
  text-decoration: none;
  cursor: pointer;
  color: ${({ theme }) => theme.primary1};
  font-weight: 500;
  display: inline;
  flex-direction: center;
  align-items: center;
  :hover {
    text-decoration: underline;
    text-decoration: none;
    opacity: 0.7;
  }
  :focus {
    outline: none;
    text-decoration: none;
  }
  :active {
    outline: none;
    text-decoration: none;
  }
`

const MenuItem = styled(StyledLink)`
  flex: 1;
  padding: 0.5rem 0.5rem;
  color: ${({ theme }) => theme.text2};
  :hover {
    color: ${({ theme }) => theme.text1};
    cursor: pointer;
    text-decoration: none;
    opacity: 0.6;
  }
  > svg {
    margin-right: 8px;
  }
`

const ScrollAreaRoot = styled(ScrollArea.Root)`
  width: 100%;
  overflow: hidden;
  color: white;
`

const ScrollAreaViewport = styled(ScrollArea.Viewport)`
  width: 100%;
  height: 100%;
`

const ScrollAreaScrollbar = styled(ScrollArea.Scrollbar)`
  display: flex;
  user-select: none;
  touch-action: none;
  padding: 2px;
  background: rgba(229, 231, 235);
  transition: background 160ms ease-out;
  &[data-orientation='vertical'] {
    width: 10px;
  }
  &[data-orientation='horizontal'] {
    flex-direction: column;
    height: 10px;
  }
`

const ScrollAreaThumb = styled(ScrollArea.Thumb)`
  flex: 1;
  background: rgba(163, 163, 163);
  border-radius: 10px;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    min-width: 44px;
    min-height: 44px;
  }
`

const ScrollAreaCorner = styled(ScrollArea.Corner)`
  background: (163, 163, 163);
`

const ListWrapper = styled.ul`
  display: flex;
  margin: 24px 0;
  padding: 0;
  list-style: none;
`
const ListItem = styled.li`
  &:not(:first-child) {
    margin-left: 12px;
  }
`

export function CheckMarks({ type = 'defi' }) {
  const [stakingEnabled, toggleStaking] = useStakingManager()
  const [borrowedEnabled, toggleBorrowed] = useBorrowedManager()
  const [displayUsd, toggleDisplayUsd] = useDisplayUsdManager()
  const [hideLastDay, toggleHideLastDay] = useHideLastDayManager()
  const router = useRouter()
  const isClient = useIsClient()

  const toggleSettings = {
    defi: [
      {
        name: 'Staking',
        toggle: toggleStaking,
        enabled: stakingEnabled && isClient,
        help: 'Include governance tokens staked in the protocol',
      },
      {
        name: 'Borrows',
        toggle: toggleBorrowed,
        enabled: borrowedEnabled && isClient,
        help: 'Include borrowed coins in lending protocols',
      },
    ],
    nfts: [
      router.pathname !== '/nfts' && {
        name: 'Display in USD',
        toggle: toggleDisplayUsd,
        enabled: displayUsd && isClient,
        help: 'Display metrics in USD',
      },
      {
        name: 'Hide last day',
        toggle: toggleHideLastDay,
        enabled: hideLastDay && isClient,
        help: 'Hide the last day of data',
      },
    ],
  }

  return (
    <AutoRow gap="10px" justify="center" key="settings">
      {toggleSettings[type].map((toggleSetting) => {
        if (toggleSetting) {
          return <OptionToggle {...toggleSetting} key={toggleSetting.name} />
        } else return null
      })}
    </AutoRow>
  )
}

const extraTvlOptions = [
  {
    name: 'Staking',
    key: STAKING,
    help: 'Include governance tokens staked in the protocol',
  },
  {
    name: 'Pool2',
    key: POOL2,
    help: 'Include staked lp tokens where one of the coins in the pair is the governance token',
  },
  {
    name: 'Borrows',
    key: BORROWED,
    help: 'Include borrowed coins in lending protocols',
  },
  {
    name: 'Offers',
    key: OFFERS,
    help: 'Coins that are approved but not locked',
  },
  {
    name: 'Treasury',
    key: TREASURY,
    help: 'Protocol treasury',
  },
  {
    name: 'Double Count',
    key: DOUBLE_COUNT,
    help: 'Double count TVL of certain protocols',
  },
]

export default function Menu({ type = 'defi' }) {
  const node = useRef()

  const [open, setOpen] = useState(false)
  const toggle = () => {
    setOpen(!open)
  }

  const handleClick = (e) => {
    if (!(node.current && node.current.contains(e.target))) {
      setOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  const tvlToggles = useTvlToggles()
  const extraTvlEnabled = useGetExtraTvlEnabled()
  const [darkMode] = useDarkModeManager()

  const togglesEnabled = { ...extraTvlEnabled, DARK_MODE: darkMode }

  const toggleSettings = {
    defi: [
      ...extraTvlOptions,
      {
        name: 'Dark mode',
        key: DARK_MODE,
      },
    ],
    nfts: [
      {
        name: 'Display in USD',
        key: DISPLAY_USD,
        help: 'Display metrics in USD',
      },
      {
        name: 'Hide last day',
        key: HIDE_LAST_DAY,
        help: 'Hide the last day of data',
      },
      {
        name: 'Dark mode',
        key: DARK_MODE,
      },
    ],
  }

  const renderSettingsToggles = () => {
    return toggleSettings[type].map((toggleSetting) => (
      <MenuItem key={toggleSetting.name}>
        <OptionToggle
          {...toggleSetting}
          toggle={tvlToggles(toggleSetting.key)}
          enabled={togglesEnabled[toggleSetting.key]}
        />
      </MenuItem>
    ))
  }

  return (
    <StyledMenu ref={node}>
      <StyledMenuButton onClick={toggle}>
        <StyledMenuIcon />
      </StyledMenuButton>

      {open && <MenuFlyout>{renderSettingsToggles()}</MenuFlyout>}
    </StyledMenu>
  )
}

export const AllTvlOptions = ({ style }) => {
  const tvlToggles = useTvlToggles()
  const extraTvlEnabled = useGetExtraTvlEnabled()

  return (
    <>
      <ScrollAreaRoot>
        <ScrollAreaViewport>
          <ListWrapper style={{ ...style }}>
            {extraTvlOptions.map((option) => (
              <ListItem key={option.key}>
                <OptionToggle {...option} toggle={tvlToggles(option.key)} enabled={extraTvlEnabled[option.key]} />
              </ListItem>
            ))}
          </ListWrapper>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="horizontal">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
        <ScrollAreaCorner />
      </ScrollAreaRoot>
    </>
  )
}
