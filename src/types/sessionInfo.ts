import { web3 } from "@project-serum/anchor"
import { Percent } from "@raydium-io/raydium-sdk"

export type CreatePoolAndBuySessionInfo = {
    //create pool
    marketId?: web3.PublicKey,
    baseMint?: web3.PublicKey,
    baseMintName?: string,
    quoteMint?: web3.PublicKey,
    quoteMintName?: string,
    initBaseMintAmount?: number,
    initQuoteMintAmount?: number,
    //buy
    buyAmount?: number,
    buyTokenType?: 'base' | 'quote'
    distributeCount?: number
}

export type SettingSessionInfo = {
    currentWallet?: web3.Keypair
    secondWallet?: web3.Keypair
    rpcEndPointUrl: string,
    slippageTolerance: Percent,
    slippageToleranceStr: "0.25%" | "0.5%" | "1%" | "5%" | string,
    networkType: "mainnet" | 'devnet'
}