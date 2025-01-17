import type { Subcommand } from "../Command";
import { resolveUserFromOption } from "../../helpers/optionResolvers";
import { useQueueStorage } from "../../useQueueStorage";
import getQueueChannel from "../../actions/queue/getQueueChannel";
import logUser from "../../helpers/logUser";

const whitelist: Subcommand = {
	name: "whitelist",
	description: "Allows a previously-blacklisted user to make song requests.",
	options: [
		{
			name: "user",
			description: "The user to allow to request songs.",
			type: "USER",
			required: true
		}
	],
	type: "SUB_COMMAND",
	requiresGuild: true,
	permissions: ["owner", "admin", "queue-admin"],
	async execute({ user, guild, options, logger, reply, deleteInvocation }) {
		await deleteInvocation();

		const firstOption = options.data[0];
		if (!firstOption) {
			return reply({
				content: ":x: You'll need to tell me who to whitelist. Try again, and mention someone.",
				ephemeral: true
			});
		}

		const [subject, queueChannel] = await Promise.all([
			resolveUserFromOption(firstOption, guild),
			getQueueChannel(guild)
		]);

		if (!subject) {
			return reply({ content: ":x: I don't know who that is.", ephemeral: true });
		}

		if (subject.id === user.id) {
			return reply({ content: ":x: You can't whitelist yourself, silly!", ephemeral: true });
		}

		if (!queueChannel) {
			return reply({ content: ":x: There's no queue set up yet.", ephemeral: true });
		}

		const queue = useQueueStorage(queueChannel);
		await queue.whitelistUser(subject.id);
		logger.info(`Restored song request permission to user ${logUser(subject)}.`);

		return reply({
			content: `:checkered_flag: <@!${subject.id}> is allowed to submit song requests! :grin:`,
			shouldMention: false,
			ephemeral: true
		});
	}
};

export default whitelist;
