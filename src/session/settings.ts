import { InlineKeyboard } from "grammy";
import { MyContext } from "../bot";
import { BaseSessionHandler } from "./baseHandler";
import { ENV, icons } from "../constants";
import { Percent } from "@raydium-io/raydium-sdk";
import { SessionHandler } from "../sessionHandler";
import { getSlippage, parseNumberFromMsg } from "../utils";

export class SettingSessionHandler extends BaseSessionHandler {
    private static PRE_NAME = "SETTINGS"
    private static readonly SLIPPAGE_BTNS = {
        "0.25%": `${0.25}%`,
        "0.5%": `${0.5}%`,
        "1%": `${1}%`,
        "5%": `${5}%`,
        edit: `${icons.EDIT_PENCIL} edit`,
    }
    private static readonly NETWORK_BTNS = {
        devnet: `devnet`,
        mainnet: `mainnet`,
    }

    private readonly SESSION_HANDLER_NAME = "SETTINGS"
    private readonly BUTTONS = {
        network: `Update Network`,
        slippage: `Update Slippage Tolerance`,
    }
    constructor(ctx: MyContext) {
        super(ctx)
    }

    override getKeyboardLayoutAndMsg(): { keyboard: InlineKeyboard; msg: string; } {
        const keyboard = new InlineKeyboard();
        keyboard.text(`Network (${this.getSettingSession().networkType})`, `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.network}`).row();
        keyboard.text(`Slippage tolerance (${this.getSettingSession().slippageToleranceStr})`, `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.slippage}`).row();
        const msg = `
*${icons.SETTING_GEAR} SETTINGS ${icons.SETTING_GEAR}*\n
 
        `
        return {
            keyboard,
            msg
        }
    }
    authorityType?: 1 | 2 | 3

    override async handleTask(task: string): Promise<void> {
        this.setTask(task)
        const settingInfo = this.getSettingSession()
        await this.deletePreTmpMsgs().catch(() => { });
        switch (task) {
            case this.BUTTONS.network: {
                const keyboard = new InlineKeyboard()
                    .text("mainnet", `${SettingSessionHandler.PRE_NAME}:${SettingSessionHandler.NETWORK_BTNS.mainnet}`)
                    .text("devnet", `${SettingSessionHandler.PRE_NAME}:${SettingSessionHandler.NETWORK_BTNS.devnet}`).row()
                const res = await this.ctx.reply("Select the network", { reply_markup: keyboard })
                // this.addPreTempMesId(res.message_id)
                break
            }
            case this.BUTTONS.slippage: {
                const keyboard = new InlineKeyboard()
                    .text("0.25%", `${SettingSessionHandler.PRE_NAME}:${SettingSessionHandler.SLIPPAGE_BTNS["0.25%"]}`)
                    .text("0.5%", `${SettingSessionHandler.PRE_NAME}:${SettingSessionHandler.SLIPPAGE_BTNS["0.5%"]}`)
                    .text("1%", `${SettingSessionHandler.PRE_NAME}:${SettingSessionHandler.SLIPPAGE_BTNS["1%"]}`)
                    .text("5%", `${SettingSessionHandler.PRE_NAME}:${SettingSessionHandler.SLIPPAGE_BTNS["5%"]}`).row()
                    .text("edit", `${SettingSessionHandler.PRE_NAME}:${SettingSessionHandler.SLIPPAGE_BTNS.edit}`).row()
                const res = await this.ctx.reply("Select Slippage tolerance value", { reply_markup: keyboard })
                // this.addPreTempMesId(res.message_id)
                break
            }
            case SettingSessionHandler.NETWORK_BTNS.devnet: {
                if (settingInfo.networkType != 'devnet') {
                    settingInfo.networkType = 'devnet'
                    settingInfo.rpcEndPointUrl = ENV.RPC_ENDPOINT_URL_DEV.trim()
                    this.getSettingSession().rpcEndPointUrl = "https://api.devnet.solana.com"
                    this.ctx.session.sesionHandler = new SessionHandler("https://api.devnet.solana.com")
                }
                await this.sendPreview();
                break
            }
            case SettingSessionHandler.NETWORK_BTNS.mainnet: {
                if (settingInfo.networkType != 'mainnet') {
                    settingInfo.networkType = 'mainnet'
                    this.getSettingSession().rpcEndPointUrl = "https://api.mainnet-beta.solana.com"
                    // console.log({ n: settingInfo.rpcEndPointUrl })
                    this.ctx.session.sesionHandler = new SessionHandler("https://api.mainnet-beta.solana.com")
                }
                await this.sendPreview();
                break
            }
            case SettingSessionHandler.SLIPPAGE_BTNS["0.25%"]: {
                if (settingInfo.slippageToleranceStr != '0.25%') {
                    settingInfo.slippageToleranceStr = '0.25%'
                    settingInfo.slippageTolerance = new Percent(1, 400)
                }
                await this.sendPreview();
                break
            }
            case SettingSessionHandler.SLIPPAGE_BTNS['0.5%']: {
                if (settingInfo.slippageToleranceStr != '0.5%') {
                    settingInfo.slippageToleranceStr = '0.5%'
                    settingInfo.slippageTolerance = new Percent(1, 200)
                }
                await this.sendPreview();
                break
            }
            case SettingSessionHandler.SLIPPAGE_BTNS['1%']: {
                if (settingInfo.slippageToleranceStr != '1%') {
                    settingInfo.slippageToleranceStr = '1%'
                    settingInfo.slippageTolerance = new Percent(1, 100)
                }
                await this.sendPreview();
                break
            }
            case SettingSessionHandler.SLIPPAGE_BTNS["5%"]: {
                if (settingInfo.slippageToleranceStr != '5%') {
                    settingInfo.slippageToleranceStr = '5%'
                    settingInfo.slippageTolerance = new Percent(5, 100)
                }
                await this.sendPreview();
                break
            }
            case SettingSessionHandler.SLIPPAGE_BTNS.edit: {
                await this.ctx.reply("Enter you slippage value");
                break
            }
        }
    }

    override async handleMsg(): Promise<void> {
        const task = this.getTask();


        switch (task) {
            case SettingSessionHandler.SLIPPAGE_BTNS.edit: {
                const msg = (this.ctx.message?.text ?? "").trim()
                const value = parseNumberFromMsg(msg)
                if (value == undefined || value < 0 || value > 200) {
                    await this.ctx.reply("Please enter valid value")
                    return
                }
                const slippage = getSlippage(value)
                this.getSettingSession().slippageTolerance = slippage
                this.getSettingSession().slippageToleranceStr = msg + "%"
                await this.sendPreview();
                break
            }
        }
        return
    }
} 