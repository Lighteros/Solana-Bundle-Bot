import { MyContext } from "../bot";
import { InlineKeyboard } from "grammy";
import { ENV } from "../constants";
import { Percent } from "@raydium-io/raydium-sdk";
const log = console.log;

export abstract class BaseSessionHandler {
  protected ctx: MyContext
  constructor(ctx: MyContext) {
    this.ctx = ctx
  }
  abstract getKeyboardLayoutAndMsg(): { keyboard: InlineKeyboard, msg: string };
  abstract handleTask(task: string): Promise<void>;
  abstract handleMsg(): Promise<void>;

  getTask() {
    return this.ctx.session.task
  }
  setTask(task: string) {
    this.ctx.session.task = task
  }
  getSeesionInfo<T>() {
    this.ctx.session.process.info = this.ctx.session.process.info ?? {}
    return this.ctx.session.process.info as T
  }
  protected getPreTempMesIds() {
    this.ctx.session.preTmpMsgs = this.ctx.session.preTmpMsgs ?? []
    const t = this.ctx.session.preTmpMsgs
    this.ctx.session.preTmpMsgs = []
    return t
  }
  protected addPreTempMesId(msgId: number) {
    this.ctx.session.preTmpMsgs = this.ctx.session.preTmpMsgs ?? []
    this.ctx.session.preTmpMsgs.push(msgId)
  }
  protected async deletePreTmpMsgs() {
    try {
      const msgsId = this.getPreTempMesIds();
      if (msgsId.length == 0) return
      if (msgsId)
        await this.ctx.deleteMessages(msgsId).catch(deleteMessagesError => log({ deleteMessagesError }))
    } catch (deletePreTmpMsgsError) {
      log({ deletePreTmpMsgsError })
    }
  }
  protected getSettingSession() {
    if (this.ctx.session.settings) {
      return this.ctx.session.settings
    } else {
      this.ctx.session.settings = {
        networkType: ENV.IN_PRODUCTION ? "mainnet" : 'devnet',
        rpcEndPointUrl: ENV.RPC_ENDPOINT_URL,
        slippageTolerance: new Percent(1, 100), // 1%
        slippageToleranceStr: "1%"
      }
      return this.ctx.session.settings
    }
  }

  async sendPreview() {
    try {
      const { keyboard, msg } = this.getKeyboardLayoutAndMsg();
      const preMsgs = this.getPreTempMesIds();
      if (this.ctx.chat?.id != undefined && preMsgs.length > 0)
        await this.ctx.api.deleteMessage(this.ctx.chat?.id, preMsgs[0]);
      this.deletePreTmpMsgs();
      const message = await this.ctx.reply(msg, { reply_markup: keyboard, parse_mode: 'Markdown', link_preview_options: { is_disabled: true } })
      this.addPreTempMesId(message.message_id);
    } catch (error) {
      log({
        sendPreviewError: {
          currentSession: this.ctx.session.process.current,
          error
        }
      })
    }
  }
}
