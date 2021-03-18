import { useQueue, UnsentQueueEntry } from "../actions/useQueue";
import type { Command } from "./index";
import { useLogger } from "../logger";
import { getConfigQueueLimitEntryDuration } from "../actions/config/getConfigValue";
import getVideoDetails from "../actions/getVideoDetails";
import getQueueChannel from "../actions/getQueueChannel";

const logger = useLogger();

const name = "sr";

const yt: Command = {
  name,
  description: "Submit a song to the queue.",
  uses: [
    [`${name} <song name or YouTube link>`, "Attempts to add the given content to the queue."]
  ],
  async execute(context) {
    const { message, args, storage } = context;

    async function reject_private(reason: string) {
      await message.author.send(reason);
    }
    async function reject_public(reason: string) {
      await Promise.all([
        message.channel.send(reason), //
        message.suppressEmbeds(true)
      ]);
    }

    const queueChannel = await getQueueChannel(context);
    if (!queueChannel) {
      return reject_public(
        "No queue channel has been set up yet. Ask an administrator to set one up."
      );
    }

    if (message.channel.id === queueChannel.id) {
      // TODO: The ability to configure a specific channel from which song requests should be taken.
      await Promise.all([
        message
          .delete({ reason: "Spam; Song requests are not permitted in the queue channel." })
          .catch(error =>
            logger.error(
              `I don't seem to have permission to delete messages: ${JSON.stringify(
                error,
                undefined,
                2
              )}`
            )
          ),
        reject_private("Requesting songs in the queue channel has not been implemented yet.")
      ]);
      return;
    }

    if (args.length < 1) {
      return reject_public("You're gonna have to add a song link or title to that.");
    }

    async function accept(entry: UnsentQueueEntry, sendUrl = false) {
      if (!queueChannel) {
        return reject_public(
          "No queue channel has been set up yet. Ask an administrator to set one up."
        );
      }

      logger.debug(`Preparing queue cache for channel ${queueChannel.id} (#${queueChannel.name})`);
      const queue = await useQueue(queueChannel);
      logger.debug("Queue prepared!");
      await Promise.all([
        queue.push(entry), //
        sendUrl ? message.channel.send(entry.url) : null
      ]);
      logger.debug(
        `Pushed new entry to queue. Sending public acceptance to user ${message.author.id} (${message.author.username})`
      );
      // Send acceptance after the potential `send(entry.url)` call
      await message.channel.send(`**${message.author.username}**, Submission Accepted!`);
      logger.debug("Responded.");
    }

    try {
      const video = await getVideoDetails(args);
      if (video === null) {
        return reject_public("No songs were found!");
      }

      const url = video.url;
      const minutes = video.duration.seconds / 60;
      const sentAt = message.createdAt;
      const senderId = message.author.id;

      // If the video is too long, reject!
      const maxDuration = await getConfigQueueLimitEntryDuration(storage);
      if (maxDuration > 0 && minutes > maxDuration) {
        return reject_public(
          `:hammer: <@!${message.author.id}> That video is too long. The limit is **${maxDuration} minutes**`
        );
      }

      // Whether this is a search result and we therefore haven't had this link embedded yet
      const shouldSendUrl = "type" in video && video.type === "video";

      // Full send!
      return accept({ url, minutes, sentAt, senderId }, shouldSendUrl);

      // Handle fetch errors
    } catch (error) {
      logger.error(
        `Failed to run query: ${JSON.stringify(args)}, ${JSON.stringify(error, undefined, 2)}`
      );
      return reject_public("That video query gave me an error.");
    }
  }
};

export default yt;