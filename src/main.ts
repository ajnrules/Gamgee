import "source-map-support/register";
import "./environment";
import { useLogger } from "./logger";
import { useStorage } from "./configStorage";
import Discord from "discord.js";
import { handleCommand } from "./handleCommand";
import { handleReactionAdd } from "./handleReactionAdd";

const logger = useLogger();
logger.debug(`Starting in ${process.env.NODE_ENV ?? "undefined"} environment`);

try {
  const client = new Discord.Client({ partials: ["REACTION", "CHANNEL", "MESSAGE"] });

  // Handle client states
  client.on("ready", () => {
    logger.info(`Logged in as ${client.user?.tag ?? "nobody right now"}!`);
  });

  client.on("error", error => {
    logger.error(`Received client error: ${JSON.stringify(error, undefined, 2)}`);
  });

  // Handle messages
  client.on("message", msg => {
    void msg.fetch().then(msg =>
      useStorage(msg.guild)
        .then(storage => handleCommand(client, msg, storage))
        .catch(error =>
          logger.error(`Failed to handle command: ${JSON.stringify(error, undefined, 2)}`)
        )
    );
  });

  // Handle Reactions
  client.on("messageReactionAdd", (reaction, user) => {
    logger.debug("Received reaction add event.");

    void Promise.all([reaction.fetch(), user.fetch()])
      .then(([reaction, user]) => handleReactionAdd(reaction, user))
      .catch(error =>
        logger.error(`Failed to handle reaction add: ${JSON.stringify(error, undefined, 2)}`)
      );
  });

  // Log in
  void client.login(process.env.DISCORD_TOKEN);

  // Handle top-level errors
} catch (error) {
  logger.error(error);
}