import bot, { MyContext } from "../bot"
import { BaseSessionHandler } from "./baseHandler"
import { CreatePoolAndBuySessionHandler } from "./createPoolAndbuy"
import { SettingSessionHandler } from "./settings"
import { StartSessionHandler } from "./start"
import { WalletSessionHandler } from "./wallet"


export const botReplyOtherOpt = { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } } as any

export function getSessionHandler(ctx: MyContext) {
  switch (ctx.session.process.current) {
    case "START":
      return new StartSessionHandler(ctx) as BaseSessionHandler
    case "WALLET":
      return new WalletSessionHandler(ctx) as BaseSessionHandler
    case "CREATE_POOL_AND_BUY":
      return new CreatePoolAndBuySessionHandler(ctx) as BaseSessionHandler
    case "SETTING":
      return new SettingSessionHandler(ctx) as BaseSessionHandler
    default: return null
  }
}

export function setUpQueryCallBack() {
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data ?? ""
    const [currentSession, currentTask] = data.split(":")
    const handler = getSessionHandler(ctx)
    if (!handler) { console.log(`session handler not found! | currentProcess: ${ctx.session.process.current}`); return; }  //TODO:
    handler.handleTask(currentTask)

    // const task = handler.setTask(currentTask);
    // switch (ctx.session.process.current) {
    //   // case TokenTransferSessionHandler.SESSION_HANDLER_NAME:
    //   case "TRANSFER_TOKEN":
    //     handler.handleTask(currentTask)
    //   case "DEPLOY_TOKEN":
    //     handler.handleTask(currentTask)
    //     break;
    //   default:
    // }
  })
}