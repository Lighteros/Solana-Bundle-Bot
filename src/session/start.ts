import { InlineKeyboard } from "grammy";
import { MyContext } from "../bot";
import { BaseSessionHandler } from "./baseHandler";
import { ENV, icons } from "../constants";
import { web3 } from "@project-serum/anchor";
import { getUser, saveUser, setUserPaid } from "../db";
import { getKeypairFromStr } from "../base/utils";
import { closeSession, sleep } from "../utils";
import { WalletSessionHandler } from "./wallet";
import { SettingSessionHandler } from "./settings";

export class StartSessionHandler extends BaseSessionHandler {
  private readonly SESSION_HANDLER_NAME = "SETTINGS";
  private readonly BUTTONS = {
    wallet: `${icons.WALLET} Wallets manager`,
  };
  constructor(ctx: MyContext) {
    super(ctx);
  }

  override getKeyboardLayoutAndMsg(): {
    keyboard: InlineKeyboard;
    msg: string;
  } {
    const keyboard = new InlineKeyboard();
    keyboard
      .text(
        this.BUTTONS.wallet,
        `${this.SESSION_HANDLER_NAME}:${this.BUTTONS.wallet}`,
      )
      .row();
    const msg =
      `${icons.BOT} Welcome to Sol Bundler Bot (BETA).\n\n` +
      `First please set the wallets.`;
    return {
      keyboard,
      msg,
    };
  }

  override async handleTask(task: string): Promise<void> {
    this.setTask(task);
    switch (task) {
      case this.BUTTONS.wallet: {
        this.ctx.session.process.current = "WALLET";
        await new WalletSessionHandler(this.ctx).sendPreview();
        return;
      }
      default: {
        break;
      }
    }
  }

  override async handleMsg(): Promise<void> {}
}
