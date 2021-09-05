import React, { useEffect, useState } from 'react'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import { useMedia } from 'react-use'
import { ethers } from 'ethers'
import { formattedNum } from '../utils'

const erc721Transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
const erc1155Transfer = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"

const toEth = v => Number(v.toString()) / 1e18

async function getLogs(contract, eventFilter, lastBlock) {
    const params = {
        fromBlock: 0,
        toBlock: lastBlock
    }
    let logs = [];
    let blockSpread = params.toBlock - params.fromBlock;
    let currentBlock = params.fromBlock;
    while (currentBlock < params.toBlock) {
        const nextBlock = Math.min(params.toBlock, currentBlock + blockSpread);
        try {
            const partLogs = await contract.queryFilter(eventFilter, currentBlock, nextBlock)
            logs = logs.concat(partLogs);
            currentBlock = nextBlock;
            console.log(nextBlock)
        } catch (e) {
            if (blockSpread >= 2e3) {
                // We got too many results
                // We could chop it up into 2K block spreads as that is guaranteed to always return but then we'll have to make a lot of queries (easily >1000), so instead we'll keep dividing the block spread by two until we make it
                blockSpread = Math.floor(blockSpread / 2);
            } else {
                throw e;
            }
        }
    }
    return logs
}

function formatNumber(amount, ethPrice) {
    return `${amount.toFixed(2)} ETH (${formattedNum(amount * ethPrice, true)})`
}


export default function Jpegged(props) {
    const [loading, setLoading] = useState(false)
    const [{ mintOrBuy, gas, foundationAuctions, ethPrice }, setTotalSpent] = useState({})
    useEffect(() => {
        window.scrollTo(0, 0)
        const fetchData = async () => {
            if (window.ethereum === undefined) {
                alert("Metamask required")
            }
            setLoading(true)
            const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const txs = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc`).then(r => r.json())
            const ethPrice = (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').then(r => r.json())).ethereum.usd;
            const provider = new ethers.providers.Web3Provider(window.ethereum)
            let mintOrBuy = 0
            let gas = 0
            await Promise.all(txs.result.map(async tx => {
                const { hash } = tx;
                const receipt = await provider.getTransactionReceipt(hash);
                const transferLog = receipt.logs?.find(log => log.topics[0] === erc721Transfer || log.topics[0] === erc1155Transfer)
                if (transferLog !== undefined) {
                    const txData = await provider.getTransaction(hash)
                    if (transferLog.topics[0] === erc721Transfer) {
                        // Verify that this is an ERC721 contract instead of ERC20
                        const contract = new ethers.Contract(
                            transferLog.address,
                            [
                                'function ownerOf(uint256 _tokenId) external view returns (address)',
                                'function tokenURI(uint256 tokenId) external view returns (string memory)'
                            ],
                            provider
                        )
                        try {
                            await contract.ownerOf(transferLog.topics[3])
                        } catch (e) {
                            console.log("rugged", hash)
                            return
                        }
                    }
                    const txGas = toEth(receipt.gasUsed.mul(txData.gasPrice))
                    const txValue = toEth(txData.value)
                    gas += txGas
                    console.log(txValue, txGas, hash)
                    mintOrBuy += txValue
                }
            }))
            let foundationAuctions = 0;
            const foundation = new ethers.Contract(
                "0xcDA72070E455bb31C7690a170224Ce43623d0B6f",
                [
                    'event ReserveAuctionFinalized(uint256 indexed auctionId,address indexed seller,address indexed bidder,uint256 f8nFee,uint256 creatorFee,uint256 ownerRev)',
                ],
                provider
            )
            const eventFilter = foundation.filters.ReserveAuctionFinalized(null, null, address)
            const lastBlock = await provider.getBlockNumber()
            const events = await getLogs(foundation, eventFilter, lastBlock)
            events.forEach(event => {
                const totalPaid = event.args.creatorFee.add(event.args.f8nFee).add(event.args.ownerRev)
                foundationAuctions += toEth(totalPaid)
            })
            console.log(mintOrBuy, gas, foundationAuctions)
            setTotalSpent({ mintOrBuy, gas, foundationAuctions, ethPrice })
        };
        fetchData();
    }, [])

    const below600 = useMedia('(max-width: 800px)')
    let title = `jpegged`
    document.title = `${title} - Defi Llama`;



    console.log(ethPrice)
    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>{title}</TYPE.largeHeader>
                </RowBetween>
                <Panel style={{ marginTop: '6px', padding: below600 && '1rem 0 0 0 ' }}>
                    <TYPE.main fontWeight={400}>
                        {mintOrBuy === undefined ? (loading ? "Loading, this may take a few minutes..." : "Connect metamask") : <p>
                            You've spent {formatNumber(gas + mintOrBuy + foundationAuctions, ethPrice)} ETH on jpegs
                            , {formatNumber(mintOrBuy, ethPrice)} buying and minting
                            , {formatNumber(foundationAuctions, ethPrice)} on Foundation's Auctions and {formatNumber(gas, ethPrice)} on gas
                            <br /><br />
                            This doesn't include:<br />
                            - Purchases made with WETH<br />
                            - Sales on Zora<br />
                        </p>
                        }
                    </TYPE.main>
                </Panel>
            </FullWrapper>
        </PageWrapper>
    )
}
