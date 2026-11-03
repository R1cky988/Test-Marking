// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn(); const post = vi.fn(); const put = vi.fn(); const del = vi.fn();
vi.mock("@/api/axiosClient", () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), put: (...a: unknown[]) => put(...a), delete: (...a: unknown[]) => del(...a) } }));

import { createQuestionBankItem, deleteQuestionBankItem, getQuestionBank, getQuestionBankItems, getQuestionBanks, importQuestionBankFile, updateQuestionBankItem } from "../questionBanks.api";

beforeEach(() => { get.mockReset(); post.mockReset(); put.mockReset(); del.mockReset(); });

describe("questionBanks.api against /question-banks", () => {
  it("lists my banks and fills the defaults", async () => {
    get.mockResolvedValue({ data: { data: [{ id: "b1", name: "Đại số", items_count: 2, difficulty_counts: { easy: 1, medium: 1, hard: 0 } }, { id: "b2", name: "Rỗng" }] } });
    const banks = await getQuestionBanks(" đại ");
    expect(get).toHaveBeenCalledWith("/question-banks", { params: { search: "đại" } });
    expect(banks[0].items_count).toBe(2);
    expect(banks[1].difficulty_counts).toEqual({ easy: 0, medium: 0, hard: 0 });
    expect(banks[1].subject).toBeNull();
    get.mockResolvedValue({ data: { data: [] } });
    await getQuestionBanks();
    expect(get).toHaveBeenLastCalledWith("/question-banks", { params: undefined });
  });

  it("getQuestionBank reads one bank", async () => {
    get.mockResolvedValue({ data: { data: { id: "b1", name: "X", subject: "Toán" } } });
    expect((await getQuestionBank("b1")).subject).toBe("Toán");
    expect(get).toHaveBeenCalledWith("/question-banks/b1");
  });

  it("lists questions with lower-case filters and no empty params", async () => {
    get.mockResolvedValue({ data: { data: [{ id: "q1" }], meta: { page: 2, limit: 10, total: 11 } } });
    const r = await getQuestionBankItems("b1", { page: 2, limit: 10, search: " tích phân ", difficulty: "HARD", type: "MULTIPLE" });
    expect(get).toHaveBeenCalledWith("/question-banks/b1/questions", { params: { page: 2, limit: 10, search: "tích phân", difficulty: "hard", type: "multiple" } });
    expect(r.meta.total).toBe(11);
    await getQuestionBankItems("b1", { difficulty: "all", type: "all" });
    expect(get).toHaveBeenLastCalledWith("/question-banks/b1/questions", { params: {} });
  });

  it("creates, updates, deletes a question under its bank", async () => {
    const input = { content: "c", options: ["a", "b"], question_type: "SINGLE" as const, correct_answers: ["A"], difficulty: "EASY" as const };
    post.mockResolvedValue({ data: { data: { id: "q1" } } });
    put.mockResolvedValue({ data: { data: { id: "q1" } } });
    await createQuestionBankItem("b1", input);
    expect(post).toHaveBeenCalledWith("/question-banks/b1/questions", input);
    await updateQuestionBankItem("b1", "q1", input);
    expect(put).toHaveBeenCalledWith("/question-banks/b1/questions/q1", input);
    await deleteQuestionBankItem("b1", "q1");
    expect(del).toHaveBeenCalledWith("/question-banks/b1/questions/q1");
  });

  it("uploads the .xlsx as multipart", async () => {
    post.mockResolvedValue({ data: { data: { imported: 2, skipped: 1, errors: [{ row: 4, reason: "x" }] } } });
    const file = new File(["x"], "q.xlsx");
    const r = await importQuestionBankFile("b1", file);
    const [url, form, cfg] = post.mock.calls[0];
    expect(url).toBe("/question-banks/b1/questions/import");
    expect((form as FormData).get("file")).toBe(file);
    expect(cfg.headers["Content-Type"]).toBe("multipart/form-data");
    expect(r.imported).toBe(2);
  });
});
