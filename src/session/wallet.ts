import { InlineKeyboard } from "grammy";
import { MyContext } from "../bot";
import { BaseSessionHandler } from "./baseHandler";
import { icons } from "../constants";
import { web3 } from "@project-serum/anchor";
import { saveUser } from "../db";
import { getKeypairFromStr } from "../base/utils";
import { closeSession, sleep } from "../utils";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { botReplyOtherOpt } from "./utils";

export class WalletSessionHandler extends BaseSessionHandler {
    private readonly SESSION_HANDLER_NAME = "SETTINGS"
    private readonly BUTTONS = {
        connect: `${icons.PLUS} Add deployer wallet`,
        connect2: `${icons.PLUS} Add buyer wallet`,
        generate: `${icons.NEW} Generate a new wallet`,
        edit: `${icons.EDIT_PENCIL} Edit SecretKey`,
        remove: `${icons.MINUS} Remove deployer wallet`,
        remove2: `${icons.MINUS} Remove buyer wallet`,
    }
    constructor(ctx: MyContext) {
        super(ctx)
    }

    override getKeyboardLayoutAndMsg(): { keyboard: InlineKeyboard; msg: string; } {
        const keyboard = new InlineKeyboard();
        const settingSessionInfo = this.getSettingSession();
        const currentWallet = settingSessionInfo.currentWallet;
        const secondWallet = settingSessionInfo.secondWallet;
        let msg = `*Wallets info*\nMain wallet is for creating pool and 2nd wallet is for buy.\n\n`
        if (currentWallet) {
            keyboard.text(this.BUTTONS.remove, `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.remove}`);
            msg += `*Deployer wallet*: \`${currentWallet.publicKey.toBase58()}\`\n`
        } else {
            keyboard.text(this.BUTTONS.connect, `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.connect}`);
            msg += `*Deployer wallet*: NOT CONNECTED\n`
        }
        if (secondWallet) {
            msg += `*Buyer wallet*: \`${secondWallet.publicKey.toBase58()}\``
            keyboard.text(this.BUTTONS.remove2, `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.remove2}`).row();
        } else {
            keyboard.text(this.BUTTONS.connect2, `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.connect2}`).row();
            msg += `*Buyer wallet*: NOT CONNECTED\n`
        }
        keyboard.text(this.BUTTONS.generate, `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.generate}`).row();
        return {
            keyboard,
            msg
        }
    }

    override async handleTask(task: string): Promise<void> {
        const settingSessionInfo = this.getSettingSession();
        this.setTask(task)
        switch (task) {
            case this.BUTTONS.connect: {
                await this.ctx.reply("Enter your wallet secret key")
                return
            }
            case this.BUTTONS.connect2: {
                await this.ctx.reply("Enter your second wallet secret key")
                return
            }
            case this.BUTTONS.generate: {
                const keypair = web3.Keypair.generate();
                await this.ctx.reply(`*Address: *\`${keypair.publicKey.toBase58()}\`\n*SecretKey: *\n\`${bs58.encode(keypair.secretKey)}\``, botReplyOtherOpt)
                return
            }
            case this.BUTTONS.remove: {
                settingSessionInfo.currentWallet = undefined
                await this.ctx.reply("Wallet is removed")
                await this.sendPreview()
                break
            }
            case this.BUTTONS.remove2: {
                settingSessionInfo.secondWallet = undefined
                await this.ctx.reply("Wallet is removed")
                await this.sendPreview()
                break
            }
            default: { break }
        }
    }

    override async handleMsg(): Promise<void> {
        const task = this.getTask()
        const msg = this.ctx.message?.text
        const settingSessionInfo = this.getSettingSession();
        switch (task) {
            case this.BUTTONS.connect: {
                const keypair = getKeypairFromStr((msg ?? "").trim())
                if (!keypair) {
                    await this.ctx.reply("Please Enter valid secretkey")
                    return
                }
                const preMsgId = this.ctx.message?.message_id
                if (preMsgId) this.ctx.deleteMessages([preMsgId])
                await this.ctx.reply("Wallet successfully added")
                settingSessionInfo.currentWallet = keypair
                const saveUserRes = await saveUser(this.ctx)
                if (!saveUserRes) {
                    await sleep(3_000)
                    await saveUser(this.ctx)
                }
                break
            }
            case this.BUTTONS.connect2: {
                const keypair = getKeypairFromStr((msg ?? "").trim())
                if (!keypair) {
                    await this.ctx.reply("Please Enter valid secretkey")
                    return
                }
                const preMsgId = this.ctx.message?.message_id
                if (preMsgId) this.ctx.deleteMessages([preMsgId])
                await this.ctx.reply("Second Wallet successfully added")
                settingSessionInfo.secondWallet = keypair
                break
            }
            default: { break }
        }
        await this.sendPreview()
        return
    }
} 