import React, { useEffect } from 'react'
import 'feather-icons'

import TopTokenList from '../components/TokenList'
import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import Search from '../components/Search'
import { useMedia } from 'react-use'

const exclude = ["Mento", "Lightning Network", "Secret Bridge", "Karura Swap", "Karura Liquid-Staking", "Karura Dollar (kUSD)", "Tezos Liquidity Baking", "Notional"]

function AllTokensPage(props) {
    let allTokens = Object.values(useAllTokenData()).filter(token => (token.symbol === null || token.symbol === '-') && !exclude.includes(token.name))

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const below600 = useMedia('(max-width: 800px)')
    document.title = `Airdroppable protocols - Defi Llama`;

    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>Pret-a-farmer airdrops 🧑‍🌾</TYPE.largeHeader>
                    {!below600 && <Search small={true} />}
                </RowBetween>
                <Panel style={{ marginTop: '6px', padding: below600 && '1rem 0 0 0 ' }}>
                    <TopTokenList tokens={allTokens} itemMax={below600 ? 50 : 100} />
                </Panel>
            </FullWrapper>
        </PageWrapper>
    )
}

export default AllTokensPage
