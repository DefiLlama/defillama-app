import React, { useEffect, useState } from 'react'
import 'feather-icons'

import TopTokenList from '../components/NFTList'
import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import Search from '../components/Search'
import { useMedia } from 'react-use'

function AllNFTsPage(props) {
    const [nfts, setNfts] = useState(undefined)
    useEffect(() => {
        window.scrollTo(0, 0);
        fetch('https://api.llama.fi/nft/collections').then(r => r.json()).then(r => setNfts(r.collections))
    }, [])

    const below800 = useMedia('(max-width: 800px)')
    let title = `NFT Rankings`
    document.title = `${title} - Defi Llama`;

    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>{title}</TYPE.largeHeader>
                </RowBetween>
                {nfts !== undefined && (
                    <Panel style={{ marginTop: '6px', padding: below800 && '1rem 0 0 0 ' }}>
                        <TopTokenList tokens={nfts} itemMax={below800 ? 50 : 100} />
                    </Panel>
                )}
            </FullWrapper>
        </PageWrapper>
    )
}

export default AllNFTsPage