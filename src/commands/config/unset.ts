import type { Subcommand } from "../Command";
import { SAFE_PRINT_LENGTH } from "../../constants/output";
import { listKeys } from "../../constants/config/keys";
import { isConfigKey, allKeys } from "../../constants/config";
import { getConfigValue } from "../../actions/config/getConfigValue";
import { setConfigValue } from "../../actions/config/setConfigValue";
import { resolveStringFromOption } from "../../helpers/optionResolvers";

const unset: Subcommand = {
	name: "unset",
	description: "Reset the value of a configuration setting to default.",
	options: [
		{
			name: "key",
			description: "The config key to unset",
			type: "STRING",
			required: true,
			choices: allKeys.map(key => ({
				name: key,
				value: key
			}))
		}
	],
	type: "SUB_COMMAND",
	requiresGuild: true,
	async execute({ options, storage, reply }) {
		const firstOption = options.data[0];
		if (!firstOption) {
			return reply({ content: listKeys(), ephemeral: true });
		}
		const key: string = resolveStringFromOption(firstOption);

		if (isConfigKey(key)) {
			await setConfigValue(storage, key, undefined);
			const value = await getConfigValue(storage, key);
			return reply({ content: `**${key}** reset to ${JSON.stringify(value)}`, ephemeral: true });
		}

		const that = key.length <= SAFE_PRINT_LENGTH ? `'${key}'` : "that";
		return reply({
			content: `I'm not sure what ${that} is. Try one of ${listKeys()}`,
			ephemeral: true
		});
	}
};

export default unset;
