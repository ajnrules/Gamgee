import type { Command } from "./index";
import { isConfigKey, isConfigValue } from "../constants/config";
import listKeys from "../actions/config/listKeys";
import { getConfigValue } from "../actions/config/getConfigValue";
import { setConfigValue } from "../actions/config/setConfigValue";
import { useLogger } from "../logger";

const logger = useLogger();

const ARG_GET = "get";
const ARG_SET = "set";
const ARG_HELP = "help";

type Argument = typeof ARG_GET | typeof ARG_SET | typeof ARG_HELP;

const config: Command = {
  name: "config",
  description: "Read and modify config options.",
  async execute(context) {
    const { message, args, storage } = context;
    async function reply(body: string) {
      await message.reply(body);
    }

    if (args.length < 1) {
      const response = `Invalid command structure. Expected either \`${ARG_GET}\` or \`${ARG_SET}\``;
      return reply(response);
    }

    const arg = args[0].toLowerCase() as Argument;

    switch (arg) {
      case ARG_GET: {
        // Get stuff
        if (args.length < 2) {
          return reply(listKeys());
        }

        const key = args[1];
        if (isConfigKey(key)) {
          const value = await getConfigValue(storage, key);
          return reply(`**${key}**: ${JSON.stringify(value)}`);
        }

        return reply("Invalid key. " + listKeys());
      }

      case ARG_SET: {
        // Set stuff
        if (args.length < 2) {
          return reply(listKeys());
        }
        if (args.length < 3) {
          return reply("Expected a value to set.");
        }

        const key = args[1];
        const value = args[2];
        if (!isConfigKey(key)) {
          return reply("Invalid key. " + listKeys());
        }
        if (!isConfigValue(value)) {
          return reply("invalid type of value.");
        }
        await setConfigValue(storage, key, value);
        return reply(`**${key}**: ${value}`);
      }

      case ARG_HELP:
        // List all the keys
        logger.debug("Received 'config help' command.");
        return reply(listKeys());

      default:
        logger.info("Received invalid config command.");
        return reply(`Invalid command argument. Expected either \`${ARG_GET}\` or \`${ARG_SET}\``);
    }
  }
};

export default config;
