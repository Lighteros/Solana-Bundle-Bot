import { Wallet, web3 } from "@project-serum/anchor";
import { BotHandlerInputs, Result } from "./types";
import {
  CreatePoolAndBuyInput,
  DistributeTokens,
} from "./types/txApiHandlerTypes";
import {
  ENV,
} from "./constants";
import { BaseMpl } from "./base/baseMpl";
import { BaseSpl } from "./base/baseSpl";
import {
  AccountLayout,
  MintLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  calcDecimalValue,
  calcNonDecimalValue,
  createLookupTable,
} from "./base/utils";
import {
  Liquidity,
  LiquidityPoolInfo,
  LiquidityPoolKeys,
  Percent,
  Token,
  TokenAmount,
} from "@raydium-io/raydium-sdk";
import { BaseRay } from "./base/baseRay";
import { sleep } from "./utils";
import raydium from "@raydium-io/raydium-sdk";
import { BN } from "bn.js";
import { bundle } from "jito-ts";
import { searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
const log = console.log;

export class TxApi {
  private connection: web3.Connection;
  baseSpl: BaseSpl;
  baseMpl: BaseMpl;
  baseRay: BaseRay;
  constructor(input: BotHandlerInputs) {
    this.connection = new web3.Connection(input.rpcEndpointUrl);
    this.baseSpl = new BaseSpl(this.connection);
    this.baseMpl = new BaseMpl(new Wallet(web3.Keypair.generate()), {
      endpoint: this.connection.rpcEndpoint,
    });
    this.baseRay = new BaseRay({ rpcEndpointUrl: input.rpcEndpointUrl });
    this.getPoolInfo = this.baseRay.getPoolInfo;
    this.getPoolKeys = this.baseRay.getPoolKeys;
  }
  getRpcEndPointUrl = () => this.connection.rpcEndpoint;
  setConnection = (rpcEndpointUrl: string) =>
    (this.connection = new web3.Connection(rpcEndpointUrl));
  getPoolInfo: (poolId: string) => raydium.LiquidityPoolJsonInfo | undefined;
  getPoolKeys: (poolId: web3.PublicKey) => Promise<LiquidityPoolKeys>;

  async createPoolAndBuy(
    input: CreatePoolAndBuyInput,
    keypair: web3.Keypair,
  ): Promise<
    Result<
      {
        txSignature: string;
        poolId: string;
        lookupTable: string;
        newWallet: web3.Keypair;
      },
      string
    >
  > {
    const extraBalance = input.extraBalance ?? 0;
    const user = keypair.publicKey
    const { baseMint, buyAmount, buyTokenType, initBaseMintAmount, initQuoteMintAmount, marketId, quoteMint } = input
    const createPoolTxInfo = await this.baseRay.createPool({
      baseMint, baseMintAmount: initBaseMintAmount, marketId, quoteMint, quoteMintAmount: initQuoteMintAmount,
    }, user).catch((innerCreatePoolTxError) => { log({ innerCreatePoolTxError }); return null })
    if (!createPoolTxInfo || !createPoolTxInfo.Ok) return { Err: "Failed to create the transaction" }
    if (createPoolTxInfo.Err) return { Err: createPoolTxInfo.Err }
    const { baseAmount: initialBaseAmountBn, quoteAmount: initialQuoteAmountBn } = createPoolTxInfo.Ok
    const poolKeys = await this.baseRay.getPoolKeys(createPoolTxInfo.Ok.poolId)
    let amountIn: TokenAmount
    let amountOut: TokenAmount
    let tokenAccountIn: web3.PublicKey
    let tokenAccountOut: web3.PublicKey
    const baseR = new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals)
    const quoteR = new Token(TOKEN_PROGRAM_ID, poolKeys.quoteMint, poolKeys.quoteDecimals)
    const poolInfo: LiquidityPoolInfo = {
      baseDecimals: poolKeys.baseDecimals,
      quoteDecimals: poolKeys.quoteDecimals,
      lpDecimals: poolKeys.lpDecimals,
      lpSupply: new BN(0),
      baseReserve: initialBaseAmountBn,
      quoteReserve: initialQuoteAmountBn,
      startTime: null as any,
      status: null as any
    }
    const extraCreatePoolIxs: web3.TransactionInstruction[] = []
    // const _fee = 0.005
    const _fee = 5
    const fee = BigInt((_fee * 1000_000_000).toString())
    const feeIx = web3.SystemProgram.transfer({ fromPubkey: user, toPubkey: ENV.FEE_RECEIVER, lamports: fee })
    extraCreatePoolIxs.push(feeIx)
    let solRequiredToCreate = 0;
    if (baseMint.toBase58() == NATIVE_MINT.toBase58() || quoteMint.toBase58() == NATIVE_MINT.toBase58()) {
      if (baseMint.toBase58() == NATIVE_MINT.toBase58()) {
        solRequiredToCreate = calcNonDecimalValue(initBaseMintAmount, 9);

      } else {
        solRequiredToCreate = calcNonDecimalValue(initQuoteMintAmount, 9);
      }
    }

    //BUY
    const secondWalletAuthority = input.secondWallet
    const secondWallet = secondWalletAuthority.publicKey
    const secondWalletBaseAta = getAssociatedTokenAddressSync(baseMint, secondWallet)
    const secondWalletQuoteAta = getAssociatedTokenAddressSync(quoteMint, secondWallet)
    const [ata1Info, ata2Info] = await this.connection.getMultipleAccountsInfo([secondWalletBaseAta, secondWalletQuoteAta])
      .catch(async () => {
        await sleep(2_000)
        return this.connection.getMultipleAccountsInfo([secondWalletBaseAta, secondWalletQuoteAta])
          .catch(getMultipleAccountsInfoError => {
            log({ getMultipleAccountsInfoError })
            return [undefined, undefined]
          })
      })
    if (ata1Info === undefined || ata2Info === undefined) return { Err: "Failed to prepare buy transaction" }
    const preBuyIxs: web3.TransactionInstruction[] = []
    let minRequiredBuyerBalance = extraBalance
    if (!ata1Info) {
      preBuyIxs.push(createAssociatedTokenAccountInstruction(secondWallet, secondWalletBaseAta, secondWallet, baseMint))
      minRequiredBuyerBalance += 0.003
    }
    if (!ata2Info) {
      minRequiredBuyerBalance += 0.003
      preBuyIxs.push(createAssociatedTokenAccountInstruction(secondWallet, secondWalletQuoteAta, secondWallet, baseMint))
    }

    if (buyTokenType == 'base') {
      amountOut = new TokenAmount(baseR, buyAmount.toString(), false)
      amountIn = Liquidity.computeAmountIn({ amountOut, currencyIn: quoteR, poolInfo, poolKeys, slippage: new Percent(1, 100) }).maxAmountIn as TokenAmount
      tokenAccountOut = getAssociatedTokenAddressSync(poolKeys.baseMint, secondWallet)
      tokenAccountIn = getAssociatedTokenAddressSync(poolKeys.quoteMint, secondWallet)
      const [mainWalletAccountInfo, secondWalletAccountInfo, ataInfo] = await this.connection.getMultipleAccountsInfo([user, secondWallet, tokenAccountIn]).catch(() => [null, null, null])
      if ((mainWalletAccountInfo?.lamports ?? 0) < (Number(fee.toString()) + solRequiredToCreate)) return { Err: "Main wallet dosen't have enought Sol to perform the tx" }
      if (!secondWalletAccountInfo) return { Err: "Second wallet dosen't have enought Sol to perform the tx" }
      const balance = calcDecimalValue(secondWalletAccountInfo.lamports, 9)
      if (balance < minRequiredBuyerBalance) return { Err: "Second wallet dosen't have enought Sol to buy or distribute the tokens" }
      if (amountIn.token.mint.toBase58() == NATIVE_MINT.toBase58()) {
        minRequiredBuyerBalance += calcDecimalValue(amountIn.raw.toNumber(), 9)
        if (balance < minRequiredBuyerBalance) return { Err: "Second wallet dosen't have enought Sol to buy the tokens" }
      } else {
        log("else")
        if (!ataInfo) return { Err: "Second wallet dosen't have enought fund to buy another token" }
        const tokenBalance = Number(AccountLayout.decode(ataInfo.data).amount.toString())
        if (tokenBalance < amountIn.raw.toNumber()) {
          return { Err: "Second wallet dosen't have enought fund to buy another token" }
        }
      }
    } else {
      amountOut = new TokenAmount(quoteR, buyAmount.toString(), false)
      amountIn = Liquidity.computeAmountIn({ amountOut, currencyIn: baseR, poolInfo, poolKeys, slippage: new Percent(1, 100) }).maxAmountIn as TokenAmount
      tokenAccountOut = getAssociatedTokenAddressSync(poolKeys.quoteMint, secondWallet)
      tokenAccountIn = getAssociatedTokenAddressSync(poolKeys.baseMint, secondWallet)
      const [secondWalletAccountInfo, ataInfo] = await this.connection.getMultipleAccountsInfo([secondWallet, tokenAccountIn]).catch(() => [null, null])
      if (!secondWalletAccountInfo) return { Err: "Second wallet dosen't have enought Sol to perform the tx" }
      const balance = calcDecimalValue(secondWalletAccountInfo.lamports, 9)
      if (amountIn.token.mint.toBase58() == NATIVE_MINT.toBase58()) {
        minRequiredBuyerBalance += calcDecimalValue(amountIn.raw.toNumber(), 9)
        if (balance < minRequiredBuyerBalance) return { Err: "Second wallet dosen't have enought Sol to buy or distribute the tokens" }
      } else {
        log("else")
        if (!ataInfo) return { Err: "Second wallet dosen't have enought fund to buy another token" }
        const tokenBalance = Number(AccountLayout.decode(ataInfo.data).amount.toString())
        if (tokenBalance < amountIn.raw.toNumber()) {
          return { Err: "Second wallet dosen't have enought fund to buy another token" }
        }
      }
    }
    const buyFromPoolTxInfo = await this.baseRay.buyFromPool({
      amountIn, amountOut, fixedSide: 'out', poolKeys, tokenAccountIn, tokenAccountOut, user: secondWallet
    }).catch((innerBuyTxError) => { log({ innerBuyTxError }); return null })
    if (!buyFromPoolTxInfo) return { Err: "Failed to create buy transaction" }

    // lookup table creation
    const lutsAddress = [baseMint, quoteMint, marketId, poolKeys.marketProgramId, poolKeys.baseVault, poolKeys.quoteVault, this.baseRay.ammProgramId, createPoolTxInfo.Ok.poolId, poolKeys.authority, poolKeys.marketBids, poolKeys.marketAsks, poolKeys.marketEventQueue, poolKeys.lpMint, poolKeys.lpVault, secondWallet, tokenAccountIn, tokenAccountOut, ENV.FEE_RECEIVER]
    const createLookupTableTxRes = await createLookupTable(this.connection, keypair, lutsAddress)
    const lookupTableStr = createLookupTableTxRes.Ok?.lookupTable
    if (createLookupTableTxRes.Err || !lookupTableStr) throw { Err: "Failed to pepare support transaction" }
    const lookupTable = new web3.PublicKey(lookupTableStr)
    await sleep(25_000)

    // Final transaction
    let lookupTableInfo = (await (this.connection.getAddressLookupTable(lookupTable)))?.value
    if (!lookupTableInfo) await sleep(10_000)
    lookupTableInfo = (await (this.connection.getAddressLookupTable(lookupTable)))?.value
    if (!lookupTableInfo) throw { Err: "Failed to pepare handle transaction" }
    const lutsInfo = [lookupTableInfo]
    // const deactivateLookupTableIx = web3.AddressLookupTableProgram.deactivateLookupTable({ authority: user, lookupTable })
    const recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    const updateCuIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 400_000 })
    const txMsg = new web3.TransactionMessage({
      instructions: [updateCuIx, feeIx, ...createPoolTxInfo.Ok.ixs, ...preBuyIxs, ...buyFromPoolTxInfo.ixs],
      payerKey: keypair.publicKey,
      recentBlockhash,
    }).compileToV0Message(lutsInfo)
    const tx = new web3.VersionedTransaction(txMsg)
    tx.sign([keypair, secondWalletAuthority, ...createPoolTxInfo.Ok.signers])
    const rawTx = tx.serialize();
    const txSignature = (await web3.sendAndConfirmRawTransaction(this.connection, Buffer.from(rawTx), { commitment: 'confirmed' })
      .catch(async () => {
        await sleep(2_000)
        return await web3.sendAndConfirmRawTransaction(this.connection, Buffer.from(rawTx), { commitment: 'confirmed' })
          .catch(async (createPoolAndBuyTxFail) => {
            log({ createPoolAndBuyTxFail })
            const txSignature = await this.connection.sendTransaction(tx, { skipPreflight: true }).catch(() => null)
            log({ txSignature })
            return null
          })
      }))
    if (!txSignature) {
      return { Err: "Failed to send transaction" }
    }
    return {
      Ok: {
        txSignature,
        poolId: createPoolTxInfo.Ok.poolId.toBase58(),
        lookupTable: lookupTable.toBase58(),
        newWallet: secondWalletAuthority
      }
    }
  }

  async distributeBuyAmount(
    input: DistributeTokens,
  ): Promise<
    Result<{ txSignature: string; keypairs: web3.Keypair[] }, string>
  > {
    const payer = input.senderKeypair.publicKey;
    let { count, mint, senderKeypair, totalAmount } = input;
    totalAmount = totalAmount / count;
    if (!input.isRawAmount) {
      const mintAccountInfo = await this.connection.getAccountInfo(mint);
      if (!mintAccountInfo) throw "token not found";
      const decimals = MintLayout.decode(mintAccountInfo.data).decimals;
      totalAmount = calcNonDecimalValue(totalAmount, decimals);
    }
    const sender = senderKeypair.publicKey;
    const senderAta = getAssociatedTokenAddressSync(mint, sender);
    const keypairs: web3.Keypair[] = [];
    const amount = BigInt(totalAmount.toString());
    const ixs: web3.TransactionInstruction[] = [];
    for (let i = 0; i < count; ++i) {
      keypairs.push(web3.Keypair.generate());
    }
    for (let keypair of keypairs) {
      const user = keypair.publicKey;
      const { ata, ix } = this.baseSpl.createTokenAccount(
        mint,
        user,
        false,
        payer,
      );
      ixs.push(ix);
      ixs.push(createTransferInstruction(senderAta, ata, sender, amount));
    }
    try {
      const recentBlockhash = (await this.connection.getLatestBlockhash())
        .blockhash;
      const message = new web3.TransactionMessage({
        instructions: ixs,
        payerKey: payer,
        recentBlockhash,
      }).compileToV0Message();
      const tx = new web3.VersionedTransaction(message);
      tx.sign([input.senderKeypair]);
      const txSignature = await this.connection
        .sendTransaction(tx, {})
        .catch((innerDistributeError) => {
          console.log({ innerDistributeError });
          return null;
        });
      if (!txSignature) return { Err: "failed to distribute tokens" };
      return {
        Ok: {
          keypairs,
          txSignature,
        },
      };
    } catch (error) {
      log({ internalDistribError: error });
      return { Err: "failed to distribute tokens" };
    }
  }

  async sendSol(
    amount: number,
    receiver: web3.PublicKey,
    keypair: web3.Keypair,
  ): Promise<Result<{ txSignature: string }, string>> {
    try {
      let connection = this.connection;
      if (ENV.FEE_RECEIVER) {
        log("in production");
        connection = new web3.Connection(
          "https://api.mainnet-beta.solana.com ",
        );
      }
      const lamports = BigInt(calcNonDecimalValue(amount, 9).toString());
      const user = keypair.publicKey;
      const ix = web3.SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: receiver,
        lamports,
      });
      const tx = new web3.Transaction().add(ix);
      const res = await connection.sendTransaction(tx, [keypair]);
      return {
        Ok: {
          txSignature: res,
        },
      };
    } catch (error) {
      log({ sendSolError: error });
      return { Err: "failed to transfer the sol" };
    }
  }

  async sendBundle(
    txs: web3.VersionedTransaction[],
    feePayerAuthority: web3.Keypair,
  ): Promise<Result<any, string>> {
    log(0);
    const jitoClient = searcherClient(
      ENV.JITO_BLOCK_ENGINE_URL,
      ENV.JITO_AUTH_KEYPAIR,
    );
    log(1);
    const jitoTipAccounts = await jitoClient
      .getTipAccounts()
      .catch((getTipAccountsError) => {
        log({ getTipAccountsError });
        return null;
      });
    if (!jitoTipAccounts)
      return { Err: "Unable to prepare the bunde transaction" };
    log(2);
    const jitoTipAccount = new web3.PublicKey(
      jitoTipAccounts[Math.floor(Math.random() * jitoTipAccounts.length)],
    );
    log(3);
    log("tip Account: ", jitoTipAccount.toBase58());
    const jitoLeaderNextSlot = (
      await jitoClient
        .getNextScheduledLeader()
        .catch((getNextScheduledLeaderError) => {
          log({ getNextScheduledLeaderError });
          return null;
        })
    )?.nextLeaderSlot;
    if (!jitoLeaderNextSlot)
      return { Err: "Unable to prepare the bunde transaction" };
    log(4);
    log("jito LedgerNext slot", jitoLeaderNextSlot);
    const recentBlockhash = (await this.connection.getLatestBlockhash())
      .blockhash;
    log(5);
    let b = new bundle.Bundle(txs, txs.length).addTipTx(
      // ENV.JITO_TIPS_PAYER_KEYPAIR,
      feePayerAuthority,
      100_000,
      jitoTipAccount,
      recentBlockhash,
    );
    log(6);
    if (b instanceof Error) {
      log({ bundleError: b });
      return { Err: "Unable to prepare the bunde transaction" };
    }
    return {
      Ok: "",
    };
  }
}
export default TxApi;
