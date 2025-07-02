jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({})),
  auth: jest.fn(() => ({})),
}));
import { storeParts } from "../src/index";
import type { Firestore } from "firebase-admin/firestore";

test("storeParts writes to files collection", async () => {
  const set = jest.fn().mockResolvedValue(undefined);
  const add = jest.fn().mockResolvedValue({ id: "p1" });
  const partsCollection = { add };
  const doc = jest.fn(() => ({ set, collection: () => partsCollection }));
  const collection = jest.fn(() => ({ doc }));
  const db = { collection } as unknown as Firestore;
  await storeParts(
    "f1",
    "Title",
    "- id: M1\n  bar: 1\n  instruments:\n  - Violin\n",
    "u1",
    db,
  );
  expect(collection).toHaveBeenCalledWith("files");
  expect(set).toHaveBeenCalled();
  expect(add).toHaveBeenCalled();
});
