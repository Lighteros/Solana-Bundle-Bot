import { InlineKeyboard, session } from "grammy";
import { MyContext } from "../bot";
import { BaseSessionHandler } from "./baseHandler";
import { FILL_FORM_MSG, icons } from "../constants";
import { CreatePoolAndBuySessionInfo } from "../types/sessionInfo";
import { closeSession, getPubkeyFromMsg, getTxLink, parseNumberFromMsg, sleep } from "../utils";
import { getSessionHandler } from "./utils"
import { getUserKeypairFromChatId } from "../db";
import { botReplyOtherOpt } from "./utils";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { BaseSpl } from "../base/baseSpl";
import { web3 } from "@project-serum/anchor";

export class CreatePoolAndBuySessionHandler extends BaseSessionHandler {
    private readonly SESSION_HANDLER_NAME = "CREATE_POOL_AND_BUY"
    private readonly BUTTONS = {
        marketId: `${icons.EDIT_PENCIL} Market Id`,
        baseMint: `${icons.EDIT_PENCIL} Base token`,
        quoteMint: `${icons.EDIT_PENCIL} Quote token`,
        initialBaseMintAmount: `${icons.EDIT_PENCIL} Intial base token liquidity`,
        initialQuoteMintAmount: `${icons.EDIT_PENCIL} Initial quote token liquidity`,
        buyBase: `Buy base token`,
        buyQuote: `Buy quote token`,
        distribute: `🔘 Distribution feature`,
        createPoolAndBuy: `Create pool and buy`
    }
    constructor(ctx: MyContext) {
        super(ctx)
    }

    override getKeyboardLayoutAndMsg(): { keyboard: InlineKeyboard; msg: string; } {
        const keyboard = new InlineKeyboard();
        const btsNames: string[] = [];
        for (let key in this.BUTTONS) {
            const btnName = (this.BUTTONS as any)[key]
            btsNames.push(btnName)
        }

        for (let i = 0; i < 1; ++i) {
            const btnname = btsNames[i]
            keyboard.text(btnname, `${this.SESSION_HANDLER_NAME}:${btnname}`)
        }
        // for (let i = 1; i < 3; ++i) {
        //     const btnname = btsNames[i]
        //     keyboard.text(btnname, `${this.SESSION_HANDLER_NAME}:${btnname}`)
        // }
        keyboard.row();
        for (let i = 3; i < 5; ++i) {
            const btnname = btsNames[i]
            keyboard.text(btnname, `${this.SESSION_HANDLER_NAME}:${btnname}`)
        }
        keyboard.row();
        for (let i = 5; i < 7; ++i) {
            const btnname = btsNames[i]
            keyboard.text(btnname, `${this.SESSION_HANDLER_NAME}:${btnname}`)
        }
        keyboard.row();
        for (let i = 7; i < 8; ++i) {
            const btnname = btsNames[i]
            keyboard.text(btnname, `${this.SESSION_HANDLER_NAME}:${btnname}`)
        }
        keyboard.row();
        for (let i = 8; i < 9; ++i) {
            const btnname = btsNames[i]
            keyboard.text(btnname, `${this.SESSION_HANDLER_NAME}:${btnname}`)
        }

        const { distributeCount: distribute, baseMintName, quoteMintName, baseMint, quoteMint, initBaseMintAmount, initQuoteMintAmount, marketId, buyAmount, buyTokenType } = this.getSeesionInfo<CreatePoolAndBuySessionInfo>();
        let baseMintAddressAndName = ``;
        if (baseMintName && baseMint) {
            baseMintAddressAndName = `\`${baseMint.toBase58()}\` (${baseMintName})`;
        }
        let quoteMintAddressAndName = ``;
        if (quoteMintName && quoteMint) {
            quoteMintAddressAndName = `\`${quoteMint.toBase58()}\` (${quoteMintName})`;
        }
        // const distribIcon = distribute == true ? icons.TICK_MARK : icons.CROSS_SIGN

        const msg = `💰 Create Pool with Buy Preview\n` +
            `*Market ID:* ${marketId?.toBase58() ?? ""}\n` +
            `*Base Token:* ${baseMintAddressAndName}\n` +
            `*Quote Token:* ${quoteMintAddressAndName}\n` +
            `*Intial base token liqudity:* ${initBaseMintAmount ?? ""}\n` +
            `*Intial quote token liquidity:* ${initQuoteMintAmount ?? ""}\n` +
            `*Buy Token:* ${buyTokenType ?? ""}\n` +
            `*Buy amount:* ${buyAmount ?? ""}\n` +
            `Distribute to *${distribute ?? 0}* wallets`
        return {
            keyboard,
            msg
        }
    }

    override async handleTask(task: string): Promise<void> {
        const sessionInfo = this.getSeesionInfo<CreatePoolAndBuySessionInfo>();
        this.setTask(task)
        switch (task) {
            case "YES": {
                this.ctx.session.process = { current: "CREATE_POOL_AND_BUY", info: undefined };
                const handler = getSessionHandler(this.ctx);
                if (!handler) { console.log(`session handler not found! | currentProcess: ${this.ctx.session.process.current}`); return; }
                await handler.sendPreview();
                break;
            }
            case "NO": {
                this.ctx.session.process = { current: "START", info: undefined };
                await this.ctx.reply("You cancelled creating pool and buy")
                break
            }
            case this.BUTTONS.marketId: {
                await this.ctx.reply("Enter market address")
                break
            }
            case this.BUTTONS.baseMint: {
                await this.ctx.reply("Enter your base token address")
                break
            }
            case this.BUTTONS.quoteMint: {
                await this.ctx.reply("Enter your quote token address")
                break
            }
            case this.BUTTONS.initialBaseMintAmount: {
                await this.ctx.reply("How many base tokens you want to put in pool")
                break
            }
            case this.BUTTONS.initialQuoteMintAmount: {
                await this.ctx.reply("How many quote tokens you want to put in pool")
                break
            }
            case this.BUTTONS.buyBase: {
                await this.ctx.reply("How many base tokens you want to buy instantly ?")
                break
            }
            case this.BUTTONS.buyQuote: {
                await this.ctx.reply("How many quote tokens you want to buy instantly ?")
                break
            }
            case this.BUTTONS.distribute: {
                await this.ctx.reply("How many wallets to distribute?")
                break
            }
            case this.BUTTONS.createPoolAndBuy: {
                const { distributeCount, baseMint, quoteMint, initBaseMintAmount, marketId, initQuoteMintAmount, buyAmount, buyTokenType } = this.getSeesionInfo<CreatePoolAndBuySessionInfo>();
                if (!baseMint || !quoteMint || !marketId || !initBaseMintAmount || !initQuoteMintAmount || !buyAmount || !buyTokenType) {
                    await this.ctx.reply(FILL_FORM_MSG);
                    return
                }
                this.ctx.session.sesionHandler.txHandler.baseSpl = new BaseSpl(new web3.Connection(this.ctx.session.sesionHandler.txHandler.getRpcEndPointUrl()))
                // closeSession(this.ctx.session)
                const chatId = this.ctx.chat?.id ?? 0;
                const keypair = getUserKeypairFromChatId(this.ctx)
                if (!keypair) {
                    await this.ctx.reply("keypair not found, please add your keypair first")
                    return
                }
                const settingSessionInfo = this.getSettingSession();
                const secondWallet = settingSessionInfo.secondWallet!
                const extraBalance = (distributeCount ?? 0) * 0.05
                const res = await this.ctx.session.sesionHandler.txHandler.createPoolAndBuy({
                    marketId, baseMint, quoteMint, initBaseMintAmount, initQuoteMintAmount, buyAmount, buyTokenType, secondWallet, extraBalance
                }, keypair).catch((createPoolAndBuyError) => console.log({ createPoolAndBuyError }))
                if (!res) {
                    await this.ctx.reply("Failed to create the transaction")
                    return
                }
                const now: Date = new Date()
                console.log(`********** ${now} **********`)
                console.log(`@${this.ctx.me.username}`)
                console.log({
                    createPoolAndBuyTx: {
                        marketId: marketId.toBase58(),
                        baseMint: baseMint.toBase58(), quoteMint: quoteMint.toBase58(),
                        initBaseMintAmount, initQuoteMintAmount,
                        buyAmount, buyTokenType,
                        res
                    }
                })
                if (res.Err) {
                    await this.ctx.reply(res.Err)
                    return
                }
                if (res.Ok) {
                    await this.ctx.reply(`Pool successfully created.\nPool ID: \`${res.Ok.poolId}\` [click_here](${getTxLink(this.getSettingSession().networkType, res.Ok.txSignature)}) to check tx`, botReplyOtherOpt)
                    // const secondWallet = this.getSettingSession().secondWallet!
                    await this.ctx.reply(`Token buy tx successfull\nTokens are bought by \`${secondWallet.publicKey.toBase58()}\` wallet`, botReplyOtherOpt)
                    if (!distributeCount) return
                    await this.ctx.reply("distributing ...")
                    await sleep(10_000)
                    const mint = buyTokenType == 'base' ? baseMint : quoteMint
                    const preDistributeTxRes = await this.ctx.session.sesionHandler.txHandler.distributeBuyAmount({
                        mint, senderKeypair: secondWallet, totalAmount: buyAmount, count: distributeCount
                    }).catch(distributionError => { console.log({ distributionError }); return null })
                    if (!preDistributeTxRes) {
                        await this.ctx.reply("failed to prepare token distribution tx")
                        return
                    }
                    if (preDistributeTxRes.Err) {
                        await this.ctx.reply(preDistributeTxRes.Err)
                        return
                    }
                    if (!preDistributeTxRes.Ok) {
                        await this.ctx.reply("failed to prepare token distribution tx")
                        return
                    }
                    const { keypairs, txSignature } = preDistributeTxRes.Ok
                    await this.ctx.reply(`Tokens are distributed successfully. [click_here](${getTxLink(settingSessionInfo.networkType, txSignature)}) to check more amount the transaction`, botReplyOtherOpt)
                    let msg = `*Generated wallets Info*\n`
                    for (let keypair of keypairs)
                        msg +=
                            `*address: *\`${keypair.publicKey.toBase58()}\`\n` +
                            `*secretkey: *\n` +
                            `\`${bs58.encode(keypair.secretKey)}\`\n---------\n`
                    await this.ctx.reply(msg, botReplyOtherOpt)
                    return
                }
                break
            }
        }
    }

    override async handleMsg(): Promise<void> {
        const task = this.getTask()
        const msg = this.ctx.message?.text
        const sessionInfo = this.getSeesionInfo<CreatePoolAndBuySessionInfo>()
        switch (task) {
            case this.BUTTONS.marketId: {
                const marketId = getPubkeyFromMsg(msg)
                if (!marketId) {
                    await this.ctx.reply("Please Enter market address")
                    return
                }
                const marketInfo = await this.ctx.session.sesionHandler.txHandler.baseRay.getMarketInfo(marketId).catch(() => null);
                if (!marketInfo) {
                    await this.ctx.reply("Market Not found");
                    return
                }
                sessionInfo.marketId = marketId
                sessionInfo.baseMint = marketInfo.baseMint
                sessionInfo.quoteMint = marketInfo.quoteMint
                sessionInfo.baseMintName = await this.ctx.session.sesionHandler.txHandler.baseMpl.getAndCheckTokenName(marketInfo.baseMint).catch(() => ' ') as any
                sessionInfo.quoteMintName = await this.ctx.session.sesionHandler.txHandler.baseMpl.getAndCheckTokenName(marketInfo.quoteMint).catch(() => ' ') as any
                break
            }
            case this.BUTTONS.baseMint: {
                const baseMint = getPubkeyFromMsg(msg)
                if (!baseMint) {
                    await this.ctx.reply("Please Enter valid token address")
                    return
                }
                const tname = await this.ctx.session.sesionHandler.txHandler.baseMpl.getAndCheckTokenName(baseMint).catch(() => null)
                if (!tname) {
                    await this.ctx.reply("Token not found")
                    return
                }
                sessionInfo.baseMintName = tname
                sessionInfo.baseMint = baseMint
                break
            }
            case this.BUTTONS.quoteMint: {
                const quoteMint = getPubkeyFromMsg(msg)
                if (!quoteMint) {
                    await this.ctx.reply("Please Enter valid token address")
                    return
                }
                const tname = await this.ctx.session.sesionHandler.txHandler.baseMpl.getAndCheckTokenName(quoteMint).catch(() => null)
                if (!tname) {
                    await this.ctx.reply("Token not found")
                    return
                }
                sessionInfo.quoteMintName = tname
                sessionInfo.quoteMint = quoteMint
                break
            }
            case this.BUTTONS.initialBaseMintAmount: {
                const amount = parseNumberFromMsg(msg)
                if (!amount) {
                    await this.ctx.reply("Please enter valid amount")
                    return
                }
                sessionInfo.initBaseMintAmount = amount
                break
            }
            case this.BUTTONS.initialQuoteMintAmount: {
                const amount = parseNumberFromMsg(msg)
                if (!amount) {
                    await this.ctx.reply("Please enter valid amount")
                    return
                }
                sessionInfo.initQuoteMintAmount = amount
                break
            }
            case this.BUTTONS.buyBase: {
                const amount = parseNumberFromMsg(msg)
                if (!amount) {
                    await this.ctx.reply("Please enter valid amount")
                    return
                }
                sessionInfo.buyTokenType = 'base'
                sessionInfo.buyAmount = amount
                break
            }
            case this.BUTTONS.buyQuote: {
                const amount = parseNumberFromMsg(msg)
                if (!amount) {
                    await this.ctx.reply("Please enter valid amount")
                    return
                }
                sessionInfo.buyTokenType = 'quote'
                sessionInfo.buyAmount = amount
                break
            }
            case this.BUTTONS.distribute: {
                const count = parseNumberFromMsg(msg)
                if (count == null) {
                    await this.ctx.reply("Please enter valid number")
                    return
                }
                if (count > 10) {
                    await this.ctx.reply("You can only distribute amoung 10 or less wallets")
                    return
                }
                sessionInfo.distributeCount = count
            }
            default:
                break
        }
        await this.sendPreview();
    }
} 