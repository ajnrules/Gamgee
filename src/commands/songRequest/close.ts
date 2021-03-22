import type { NamedSubcommand } from "./../index";
import { reply } from "./index";
import { useGuildStorage } from "../../useGuildStorage";
import deleteMessage from "../../actions/deleteMessage";
import getQueueChannel from "../../actions/queue/getQueueChannel";

const close: NamedSubcommand = {
  name: "close",
  description: "Stop accepting song requests to the queue. *(Server owner only. No touch!)*",
  async execute(context) {
    const { message } = context;

    // Only the guild owner may touch the queue.
    // FIXME: Add more grannular access options
    if (!message.guild?.ownerID || message.author.id !== message.guild.ownerID) {
      return reply(message, "YOU SHALL NOT PAAAAAASS!\nOr, y'know, something like that...");
    }

    const guild = await useGuildStorage(message.guild);
    const [isQueueOpen, queueChannel] = await Promise.all([
      guild.getQueueOpen(),
      getQueueChannel(context),
      deleteMessage(message, "Users don't need to see this command once it's run.")
    ]);

    if (!queueChannel) {
      return reply(message, "There's no queue to close. Have you set one up yet?");
    }
    if (!isQueueOpen) {
      return reply(message, "The queue is already closed, silly! :stuck_out_tongue:");
    }

    const queueIsCurrent = message.channel.id === queueChannel?.id;
    const promises: Array<Promise<unknown>> = [guild.setQueueOpen(false)];
    if (queueChannel && !queueIsCurrent) {
      promises.push(queueChannel.send("This queue is closed. :wave:"));
    }
    await Promise.all(promises);
    return reply(message, "The queue is now closed. :wave:");
  }
};

export default close;