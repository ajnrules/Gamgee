jest.mock("../actions/queue/useQueue");
jest.mock("../actions/queue/getQueueChannel");
jest.mock("../permissions");

import { useQueue } from "../actions/queue/useQueue";
const mockUseQueue = useQueue as jest.Mock;

import getQueueChannel from "../actions/queue/getQueueChannel";
const mockGetQueueChannel = getQueueChannel as jest.Mock;

const mockReply = jest.fn().mockResolvedValue(undefined);
const mockGetAllEntries = jest.fn().mockResolvedValue(undefined);
const mockReplyWithMention = jest.fn().mockResolvedValue(undefined);
const mockReplyPrivately = jest.fn().mockResolvedValue(undefined);
const mockDeleteMessage = jest.fn().mockResolvedValue(undefined);

import nowPlaying from "./nowPlaying";
import { useTestLogger } from "../../tests/testUtils/logger";
import type { GuildedCommandContext } from "./Command";
import type { QueueEntry } from "../useQueueStorage";

const logger = useTestLogger("error");

describe("Now-Playing", () => {
	const queueChannelId = "queue-channel";
	let context: GuildedCommandContext;

	beforeEach(() => {
		context = ({
			guild: "the guild",
			logger,
			reply: mockReply,
			replyPrivately: mockReplyPrivately,
			deleteInvocation: mockDeleteMessage
		} as unknown) as GuildedCommandContext;

		mockUseQueue.mockReturnValue({
			getAllEntries: mockGetAllEntries
		});
		mockGetAllEntries.mockResolvedValue([]);
		mockReplyWithMention.mockResolvedValue(undefined);
		mockReplyPrivately.mockResolvedValue(undefined);
		mockDeleteMessage.mockResolvedValue(undefined);
		mockGetQueueChannel.mockResolvedValue({ id: queueChannelId });
	});

	test("informs the user when no queue is set up", async () => {
		mockGetQueueChannel.mockResolvedValue(null);

		await expect(nowPlaying.execute(context)).resolves.toBeUndefined();

		expect(mockUseQueue).not.toHaveBeenCalled();

		expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
		expect(mockReplyWithMention).not.toHaveBeenCalled();
		expect(mockReplyPrivately).toHaveBeenCalledTimes(1);
		expect(mockReplyPrivately).toHaveBeenCalledWith(expect.stringContaining("no queue"));
	});

	test.each`
		values
		${[]}
		${[{ isDone: true }]}
		${[{ isDone: true }, { isDone: true }]}
		${[{ isDone: true }, { isDone: true }, { isDone: true }]}
	`(
		"informs the user if all entries are done or the queue is empty",
		async ({ values }: { values: Array<QueueEntry> }) => {
			mockGetAllEntries.mockResolvedValue(values);

			await expect(nowPlaying.execute(context)).resolves.toBeUndefined();

			expect(mockUseQueue).toHaveBeenCalledTimes(1);

			expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
			expect(mockReplyWithMention).not.toHaveBeenCalled();
			expect(mockReplyPrivately).toHaveBeenCalledTimes(1);
			expect(mockReplyPrivately).toHaveBeenCalledWith(expect.stringContaining("nothing"));
		}
	);

	test.each`
		values
		${[{ isDone: false, url: "first!", senderId: "me" }]}
		${[{ isDone: false, url: "first!", senderId: "me" }, { isDone: false }]}
		${[{ isDone: false, url: "first!", senderId: "me" }, { isDone: false }, { isDone: false }]}
		${[{ isDone: true }, { isDone: false, url: "first!", senderId: "me" }, { isDone: false }]}
		${[{ isDone: true }, { isDone: true }, { isDone: false, url: "first!", senderId: "me" }]}
		${[{ isDone: false, url: "first!", senderId: "me" }, { isDone: true }, { isDone: false }]}
	`(
		"provides the URL of the most recent not-done song",
		async ({ values }: { values: Array<QueueEntry> }) => {
			mockGetAllEntries.mockResolvedValue(values);

			await expect(nowPlaying.execute(context)).resolves.toBeUndefined();

			expect(mockUseQueue).toHaveBeenCalledTimes(1);

			expect(mockDeleteMessage).toHaveBeenCalledTimes(1);
			expect(mockReplyWithMention).not.toHaveBeenCalled();
			expect(mockReplyPrivately).toHaveBeenCalledTimes(1);
			expect(mockReplyPrivately).toHaveBeenCalledWith(expect.stringContaining("first!"), true);
			expect(mockReplyPrivately).toHaveBeenCalledWith(expect.stringContaining("<@me>"), true);
		}
	);
});
