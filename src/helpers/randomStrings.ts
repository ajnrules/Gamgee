import {
	celebratoryEmoji,
	greetings,
	hugs,
	philosophy,
	phrases,
	questions,
	songAccepted
} from "../constants/textResponses";
import Discord from "discord.js";
import randomElementOfArray from "./randomElementOfArray";

export interface ResponseContext {
	me: string;
	otherUser: Discord.User;
	otherMember: Discord.GuildMember | null;
}

export type Response =
	| string
	| NonEmptyArray<string>
	| (() => string)
	| ((context: ResponseContext) => string);

export type ResponseRepository = [Response, ...NonEmptyArray<Response>];

export class WrappedResponse {
	#response: Response;

	constructor(response: Response) {
		this.#response = response;
	}

	/** Gets the first wrapped response. */
	unwrapFirstWith(context: ResponseContext): string {
		if (typeof this.#response === "string") {
			return this.#response;
		} else if (Array.isArray(this.#response)) {
			return this.#response[0];
		}
		return this.#response(context);
	}

	/**
	 * For each wrapped response, awaits a handler function.
	 * There's a delay between calls (1000 ms by default).
	 */
	async unwrapWith(
		context: ResponseContext,
		handler: (response: string) => unknown | Promise<unknown>,
		pauseTime: number = 1000
	): Promise<void> {
		if (typeof this.#response === "string") {
			// It's just a string
			await handler(this.#response);

			return;
		} else if (Array.isArray(this.#response)) {
			// It's an array
			for (const response of this.#response) {
				await handler(response);
				if (this.#response.length > 1) {
					// If more than one, wait a second between each
					await new Promise(resolve => setTimeout(resolve, pauseTime));
				}
			}

			return;
		}
		// It's a function
		await handler(this.#response(context));
	}
}

/* Greetings */

export function randomGreeting(): WrappedResponse {
	return new WrappedResponse(randomResponseFromArray("greetings", greetings));
}

/* Phrases */

export function randomPhrase(): WrappedResponse {
	return new WrappedResponse(randomResponseFromArray("phrases", phrases));
}

/* Philosophy */

export function randomPhilosophy(): WrappedResponse {
	return new WrappedResponse(randomResponseFromArray("philosophy", philosophy));
}

/* Questions */

export function randomQuestion(): WrappedResponse {
	return new WrappedResponse(randomResponseFromArray("questions", questions));
}

/* Song Acceptance */

export function randomAcceptance(): WrappedResponse {
	return new WrappedResponse(randomResponseFromArray("songAccepted", songAccepted));
}

/* Celebration */

export function randomCelebration(): WrappedResponse {
	return new WrappedResponse(randomResponseFromArray("celebration", celebratoryEmoji));
}

/* Hugs */

export function randomHug(): WrappedResponse {
	return new WrappedResponse(randomResponseFromArray("hugs", hugs));
}

const lastResponses = new Discord.Collection<string, Response>();

/**
 * Returns a random value from the provided `array`, making sure that the value
 * does not match the value previously given (if the array is longer than 1 item)
 *
 * @param key The key by which to differentiate this array from the next.
 * @param array The array from which to source a response.
 *
 * @returns A response from the array.
 */
function randomResponseFromArray(key: string, array: ResponseRepository): Response {
	let result: Response = randomElementOfArray(array);
	const lastResult = lastResponses.get(key);
	while (result === lastResult) {
		result = randomElementOfArray(array);
	}
	lastResponses.set(key, result);
	return result;
}
