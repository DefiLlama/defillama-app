import React, { useEffect } from 'react'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import HeadHelp from '../components/HeadHelp'
import Search from '../components/Search'
import { useMedia } from 'react-use'
import styled from 'styled-components'
import { Divider } from '../components'
import { useDarkModeManager, useStakingManager, usePool2Manager } from '../contexts/LocalStorage'
import Switch from "react-switch";

const OptionToggle = (props) =>
  <TYPE.body style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
    <Switch onChange={props.toggle} checked={props.enabled} height={20} width={40} />&nbsp;
    {props.help ? <HeadHelp title={props.name} text={props.help} /> : props.name}
  </TYPE.body>

function Settings() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [isDark, toggleDarkMode] = useDarkModeManager()
  const [stakingEnabled, toggleStaking] = useStakingManager()
  const [pool2Enabled, togglePool2] = usePool2Manager()

  const below600 = useMedia('(max-width: 800px)')
  document.title = `TVL Rankings - Defi Llama`;
  const DashGrid = styled.div`
    display: grid;
    grid-gap: 1em;
    grid-template-columns: 1fr;
    grid-template-areas: 'account';
    padding: 0 4px;

    > * {
      justify-content: flex-end;
    }
  `
  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>Settings</TYPE.largeHeader>
          {!below600 && <Search small={true} />}
        </RowBetween>
        <Panel style={{ marginTop: '6px' }}>
          <DashGrid center={true} style={{ height: 'fit-content' }}>
            <TYPE.main area="account">What to count as TVL?</TYPE.main>
            <OptionToggle name="Staking" toggle={toggleStaking} enabled={stakingEnabled} help="Include governance tokens staked in the protocol" />
            <OptionToggle name="Pool2" toggle={togglePool2} enabled={pool2Enabled} help="Include staked LP tokens where one of the coins in the pair is the governance token" />
            <Divider />
            <TYPE.main area="account">Cosmetic</TYPE.main>
            <OptionToggle name="Dark mode" toggle={toggleDarkMode} enabled={isDark} />
          </DashGrid>
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}

export default Settings
