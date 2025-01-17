import type Discord from "discord.js";
import type { Command, CommandContext, Subcommand } from "../commands";
import { getConfigCommandPrefix } from "./config/getConfigValue";
import StringBuilder from "../helpers/StringBuilder";
import { assertUserCanRunCommand } from "./invokeCommand";

const DASH = " - ";
const SEP = " | ";
const INDENT = "    ";
const CODE = "`";
const REQ_START = "<";
const REQ_END = ">";
const VAL_START = "[";
const VAL_END = "]";
const OPT = "?";

/**
 * Constructs a string that describes the available commands.
 *
 * @param commands The collection of available commands.
 * @returns a string describing all commands.
 */
export default async function describeAllCommands(
	context: CommandContext,
	commands: Discord.Collection<string, Command>
): Promise<string> {
	const COMMAND_PREFIX =
		context.type === "message" ? await getConfigCommandPrefix(context.storage) : "/";

	// Describe all commands
	const bodyBuilder = new StringBuilder();
	const allCommands = [...commands.values()];
	for (const command of allCommands) {
		const canRun = await assertUserCanRunCommand(context.user, command, context.guild);
		if (!canRun) continue;

		const cmdDesc = new StringBuilder();

		// Describe the command
		cmdDesc.push(CODE);
		cmdDesc.push(`${COMMAND_PREFIX}${command.name}`);

		describeParameters(command.options ?? [], cmdDesc);

		cmdDesc.push(CODE);

		cmdDesc.push(DASH);
		cmdDesc.push(command.description);

		// Describe all subcommands
		command.options
			?.filter(optn => optn.type === "SUB_COMMAND")
			?.forEach(sub => {
				// Describe the subcommand
				const subDesc = new StringBuilder();
				subDesc.pushNewLine();
				subDesc.push(INDENT);

				subDesc.push(CODE);
				subDesc.push(`${COMMAND_PREFIX}${command.name} ${sub.name}`);

				describeParameters(sub.options ?? [], subDesc);

				subDesc.push(CODE);

				subDesc.push(DASH);
				subDesc.push(sub.description);
				cmdDesc.push(subDesc.result());
			});

		bodyBuilder.push(cmdDesc.result());
		bodyBuilder.pushNewLine();
	}

	return bodyBuilder.result();
}

function describeParameters(
	options: Array<
		| Discord.ApplicationCommandOption
		| Discord.ApplicationCommandChoicesData
		| Discord.ApplicationCommandNonOptionsData
		| Subcommand
	>,
	cmdDesc: StringBuilder
): void {
	options
		?.filter(optn => optn.type !== "SUB_COMMAND")
		?.forEach(o => {
			const option = o as Discord.ApplicationCommandChoicesData;

			// Describe the parameter
			const subDesc = new StringBuilder();
			subDesc.push(" ");

			if (option.required === true && option.choices) {
				subDesc.push(REQ_START);
			} else {
				subDesc.push(VAL_START);
			}

			if (option.required === undefined || !option.required) {
				subDesc.push(OPT);
			}

			if (option.choices) {
				// specific value
				const choiceValues = option.choices.map(ch => ch.value.toString());
				subDesc.push(choiceValues.join(SEP) ?? "");
			} else {
				// arbitrary value
				subDesc.push(option.name);
			}

			if (option.required === true && option.choices) {
				subDesc.push(REQ_END);
			} else {
				subDesc.push(VAL_END);
			}

			cmdDesc.push(subDesc.result());
		});
}
