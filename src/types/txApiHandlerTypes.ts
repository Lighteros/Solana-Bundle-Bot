import { web3 } from "@project-serum/anchor"

export type CreatePoolAndBuyInput = {
    // create poool
    baseMint: web3.PublicKey,
    quoteMint: web3.PublicKey,
    marketId: web3.PublicKey,
    initBaseMintAmount: number,
    initQuoteMintAmount: number,
    // buy
    buyTokenType: 'base' | 'quote',
    buyAmount: number,
    secondWallet: web3.Keypair,
    extraBalance?:number
}

export type DistributeTokens = {
    senderKeypair: web3.Keypair,
    totalAmount: number, mint: web3.PublicKey
    isRawAmount?:boolean
    count:number
}