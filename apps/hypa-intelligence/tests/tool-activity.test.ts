import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentStep } from "@hypa/intelligence-core/agent-stream";
import {
  activitySummary,
  clipLabel,
  readableToolData,
  resultPreview,
  stepStatus,
  stepTitle,
} from "../src/components/modules/chat/tool-activity";

const step = (overrides: Partial<AgentStep> = {}): AgentStep => ({
  id: "a",
  name: "translate_message",
  label: "Translated",
  status: "ok",
  startedAt: 100,
  ms: 800,
  ...overrides,
});

describe("adaptive tool activity", () => {
  it("does not repeat completed work in the summary", () => {
    const summary = activitySummary(
      [step(), step({ id: "b", startedAt: 200, ms: 600 })],
      false,
    );
    assert.equal(summary.title, "Translated");
    assert.equal(summary.hasProblems, false);
  });

  it("summarizes a finished chain in order without repeats", () => {
    const steps = [
      step({ id: "a", name: "speech_to_text", label: "Transcribed" }),
      step({ id: "b" }),
      step({ id: "c", startedAt: 300 }),
      step({ id: "d", name: "text_to_speech", label: "Spoke" }),
    ];
    assert.equal(
      activitySummary(steps, false).title,
      "Transcribed, translated, created audio",
    );
  });

  it("names at most three tools in a finished summary and counts the rest", () => {
    const names = [
      ["list_languages", "Checked languages"],
      ["list_models", "Checked models"],
      ["list_voices", "Checked voices"],
      ["translate_message", "Translated"],
      ["text_to_speech", "Spoke"],
    ];
    const steps = names.map(([name, label], i) =>
      step({ id: String(i), name, label }),
    );
    assert.equal(
      activitySummary(steps, false).title,
      "Checked languages, checked models, checked voices + 2 more",
    );
    assert.equal(
      activitySummary(steps.slice(0, 2), false).title,
      "Checked languages, checked models",
    );
  });

  it("reads results in plain words without the raw summary or media links", () => {
    const raw = '{"available":true,"audioUrl":"http://localhost/audio/x"}';
    const word = step({
      name: "word_of_the_day",
      detail: raw,
      result: {
        available: true,
        word: "Igboji",
        meaning: "buttressed or prolonged.",
        audioUrl: "http://localhost/audio/x",
      },
    });
    assert.equal(
      resultPreview(word, false),
      "Igboji: buttressed or prolonged.",
    );
    const lookup = step({
      name: "look_up_term",
      detail: raw,
      result: {
        result: {
          word: "Hello",
          definitions: [{ type: "Greetings", text: "A common greeting." }],
        },
      },
    });
    assert.equal(resultPreview(lookup, false), "Hello: A common greeting.");
    const unknown = step({ detail: raw, result: { available: true } });
    assert.equal(resultPreview(unknown, false), undefined);
  });

  it("names the recording a transcription step worked on", () => {
    const heard = step({
      name: "speech_to_text",
      label: "Transcribed",
      args: { attachedAudio: 2 },
    });
    const names = ["Recording 1", "Recording 2"];
    assert.equal(stepTitle(heard, "ok", names), "Transcribed Recording 2");
    assert.equal(
      stepTitle({ ...heard, status: "running" }, "running", names),
      "Transcribing Recording 2…",
    );
    assert.equal(
      stepTitle({ ...heard, status: "failed" }, "failed", names),
      "Couldn't transcribe Recording 2.",
    );
    assert.equal(stepTitle(heard, "ok", ["Recording 1"]), "Transcribed");
    assert.equal(stepTitle(step(), "ok", names), "Translated");
  });

  it("labels a clip from the tool call that made it", () => {
    const speak = step({
      id: "t1",
      name: "translate_and_speak",
      args: { text: "Hello", targetLang: "French", voice: "Adaugo" },
    });
    assert.equal(
      clipLabel({ url: "u", toolCallId: "t1" }, [speak], 0),
      "French · Adaugo",
    );
    assert.equal(clipLabel({ url: "u" }, [speak], 1), "Audio 2");
    assert.equal(
      clipLabel({ url: "u", toolCallId: "zzz" }, undefined, 0),
      "Audio 1",
    );
  });

  it("keeps partially successful runs informative and treats unfinished tools as interrupted", () => {
    const unfinished = step({ id: "b", status: "running", ms: undefined });
    assert.equal(stepStatus(unfinished, false), "interrupted");
    assert.equal(stepStatus(unfinished, true), "running");
    assert.match(
      activitySummary([step(), unfinished], false).title,
      /1 completed.*1 interrupted/,
    );
    assert.equal(
      activitySummary([step(), unfinished], false).hasProblems,
      true,
    );
    assert.match(
      resultPreview(unfinished, false)!,
      /before this tool returned/,
    );
  });

  it("reports parallel running tools and model work after tools finish", () => {
    const running = step({ status: "running" });
    assert.match(
      activitySummary([running, { ...running, id: "b" }], true).title,
      /Translating.*1 more/,
    );
    assert.match(activitySummary([step()], true).title, /^Thinking…$/);
  });

  it("keeps media out of nested raw details without changing the result", () => {
    const result = {
      translation: "Bonjour",
      partialResult: {
        audioBase64: "AAAA",
        audioUrl: "https://example.test/media?sig=secret",
        mime: "audio/wav",
      },
      images: ["data:image/png;base64,AAAA"],
    };
    const safe = JSON.stringify(readableToolData(result));
    assert.doesNotMatch(safe, /AAAA|sig=secret/);
    assert.match(safe, /Bonjour/);
    assert.match(safe, /audio\/wav/);
    assert.equal(result.partialResult.audioBase64, "AAAA");
    assert.equal(readableToolData("blob:example"), "[media omitted]");
  });

  it("uses real returned values for previews and preserves the error on failure", () => {
    assert.equal(
      resultPreview(step({ result: { translation: "Bonjour" } }), false),
      "Bonjour",
    );
    assert.equal(
      resultPreview(
        step({ result: { languages: ["French", "English"] } }),
        false,
      ),
      "2 languages",
    );
    assert.equal(
      resultPreview(step({ result: { mime: "audio/wav" } }), false),
      "Audio created",
    );
    assert.equal(
      resultPreview(
        step({
          status: "failed",
          detail: "Provider timed out",
          result: { translation: "Bonjour" },
        }),
        false,
      ),
      "Provider timed out",
    );
    assert.equal(resultPreview(step({ status: "running" }), true), undefined);
  });
});
