import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentHistorySchema } from "@hypa/intelligence-core";
import {
  appendHistoryEvent,
  audioNamesFor,
  conversationHistory,
  type ConversationMessage,
} from "../src/components/modules/chat/chat-history";

describe("Chat request history", () => {
  it("includes translation results so a following 'speak it out' can refer to them", () => {
    let trace = appendHistoryEvent([], {
      type: "tool_call",
      id: "call-1",
      name: "translate_message",
      args: { text: "good morning", targetLang: "French" },
    });
    trace = appendHistoryEvent(trace, {
      type: "tool_result",
      id: "call-1",
      name: "translate_message",
      ok: true,
      result: { translation: "Bonjour", language: "English" },
    });
    trace = appendHistoryEvent(trace, {
      type: "delta",
      text: "The translation is ",
    });
    trace = appendHistoryEvent(trace, { type: "delta", text: "Bonjour." });
    const messages: ConversationMessage[] = [
      {
        role: "user",
        content: "Translate good morning to French",
        status: "success",
      },
      {
        role: "assistant",
        content: "The translation is Bonjour.",
        status: "success",
        trace,
      },
    ];
    const history = conversationHistory(messages);
    assert.equal(agentHistorySchema.safeParse(history).success, true);
    assert.equal(history[0].content, "Translate good morning to French");
    assert.equal(
      history[1].role === "assistant" && history[1].trace?.length,
      3,
    );
    assert.deepEqual(history[1].role === "assistant" && history[1].trace?.[1], {
      type: "tool_result",
      id: "call-1",
      name: "translate_message",
      ok: true,
      result: { translation: "Bonjour", language: "English" },
    });
  });

  it("omits pending turns and clears request context when New chat clears messages", () => {
    assert.deepEqual(
      conversationHistory([
        { role: "user", content: "Hello", status: "success" },
        { role: "assistant", content: "Partial", status: "pending" },
      ]),
      [],
    );
    assert.deepEqual(conversationHistory([]), []);
  });

  it("sends recordings the user attached so a later message can ask for them", () => {
    const history = conversationHistory([
      {
        role: "user",
        content: "Listen to this",
        status: "success",
        audio: [
          { name: "Recording 1", mime: "audio/wav", data: "AAAA", id: "x" },
        ],
      } as ConversationMessage,
      { role: "assistant", content: "Sure", status: "success" },
    ]);
    assert.deepEqual(history[0], {
      role: "user",
      content: "Listen to this",
      audio: [{ name: "Recording 1", mime: "audio/wav", data: "AAAA" }],
    });
    assert.equal(agentHistorySchema.safeParse(history).success, true);
  });

  it("does not resend the recordings of a failed turn", () => {
    const audio = [
      { name: "Recording 1", mime: "audio/wav", data: "AAAA", id: "x" },
    ];
    const history = conversationHistory([
      {
        role: "user",
        content: "Listen",
        status: "success",
        audio,
      } as ConversationMessage,
      { role: "assistant", content: "Request failed (400)", status: "error" },
      {
        role: "user",
        content: "Again",
        status: "success",
        audio,
      } as ConversationMessage,
      { role: "assistant", content: "Done", status: "success" },
    ]);
    assert.equal(history[0].role === "user" && history[0].audio, undefined);
    assert.equal(history[0].content, "Listen");
    assert.equal(history[2].role === "user" && history[2].audio?.length, 1);
  });

  it("lists recording names in the order the server numbers them", () => {
    const history = conversationHistory([
      {
        role: "user",
        content: "One",
        status: "success",
        audio: [
          { name: "Recording 1", mime: "audio/wav", data: "AAAA", id: "a" },
        ],
      } as ConversationMessage,
      { role: "assistant", content: "Ok", status: "success" },
    ]);
    assert.deepEqual(
      audioNamesFor(history, [
        { kind: "image", name: "a.jpg" },
        { kind: "audio", name: "Recording 2" },
      ]),
      ["Recording 1", "Recording 2"],
    );
    assert.deepEqual(audioNamesFor([]), []);
  });

  it("keeps voice transcripts, photos, and failure state but never audio payloads", () => {
    const trace = appendHistoryEvent([], {
      type: "tool_call",
      id: "a",
      name: "speech_to_text",
      args: { audio: "AAAA", audioType: "base64" },
    });
    const messages: ConversationMessage[] = [
      {
        role: "user",
        content: "Transcribed voice instruction",
        images: ["data:image/png;base64,AAAA"],
        status: "success",
      },
      { role: "assistant", content: "Connection lost", status: "error", trace },
    ];
    const history = conversationHistory(messages);
    assert.equal(history[0].content, "Transcribed voice instruction");
    assert.equal(history[0].role === "user" && history[0].images?.length, 1);
    const assistant = history[1];
    assert.equal(assistant.role, "assistant");
    if (assistant.role !== "assistant") return;
    assert.deepEqual(assistant.trace?.[0], {
      type: "tool_call",
      id: "a",
      name: "speech_to_text",
      args: { audio: "[media omitted]", audioType: "base64" },
    });
    assert.equal(assistant.trace?.at(-1)?.type, "error");
    assert.equal(agentHistorySchema.safeParse(history).success, true);
  });
});
