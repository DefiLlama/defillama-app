import React, { useEffect } from 'react'
import 'feather-icons'

import TopTokenList from '../components/TokenList/listWithDates'
import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import Search from '../components/Search'
import { useMedia } from 'react-use'

function AllTokensPage(props) {
    const currentTimestamp = Date.now() / 1000
    const secondsInDay = 3600 * 24
    let allTokens = Object.values(useAllTokenData()).filter(protocol => protocol.listedAt !== undefined).map(token => ({
        ...token,
        mcaptvl: (token.tvl !== 0 && token.mcap) ? token.mcap / token.tvl : null,
        listed: ((currentTimestamp - token.listedAt) / secondsInDay)
    }))

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const below600 = useMedia('(max-width: 800px)')
    let title = `Recent Listings`
    document.title = `${title} - Defi Llama`;

    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>{title}</TYPE.largeHeader>
                    {!below600 && <Search small={true} />}
                </RowBetween>
                <Panel style={{ marginTop: '6px', padding: below600 && '1rem 0 0 0 ' }}>
                    <TopTokenList tokens={allTokens} />
                </Panel>
            </FullWrapper>
        </PageWrapper>
    )
}

export default AllTokensPage
