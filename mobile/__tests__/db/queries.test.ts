import { insertLog, getAllLogs, deleteLog } from "../../db/queries";

// Mock the expo-sqlite db instance
jest.mock("../../db/index", () => ({
  db: {
    withTransactionSync: jest.fn((cb) => cb()),
    runSync: jest.fn(),
    getAllSync: jest
      .fn()
      .mockReturnValue([
        {
          reactionId: "r1",
          reaction: "okay",
          mediaId: "m1",
          title: "Test Movie",
        },
      ]),
    getFirstSync: jest.fn(),
  },
}));

describe("Database Queries", () => {
  it("fetches all logs successfully", () => {
    const logs = getAllLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].title).toBe("Test Movie");
  });

  it("inserts a log successfully", () => {
    const mockMedia = { id: "m2", title: "New Movie", type: "movie" };
    expect(() => insertLog(mockMedia, "pure gold")).not.toThrow();
  });
});
