import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "@playwright/test";

declare global {
  interface Window {
    emitAgent: (event: unknown) => void;
    closeAgent: () => void;
    mediaSeen: Record<string, number>;
  }
}

// Start Intelligence's Vite server first. All agent responses are local mocks;
// these tests never call a model or spend wallet funds.
test(
  "chat follows streaming output until the reader scrolls away",
  { timeout: 30_000 },
  async (t) => {
    const browser = await chromium.launch({
      ...(process.env.CHROME_BIN
        ? { executablePath: process.env.CHROME_BIN }
        : {}),
      args: ["--no-sandbox"],
    });
    t.after(() => browser.close());
    const page = await browser.newPage({
      viewport: { width: 900, height: 700 },
      reducedMotion: "reduce",
    });
    await page.addInitScript(() => {
      const original = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        if (String(input).endsWith("/v2/agent")) {
          return new Response(
            new ReadableStream({
              start(controller) {
                window.emitAgent = (event) =>
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify(event)}\n\n`,
                    ),
                  );
                window.closeAgent = () => controller.close();
              },
            }),
            { headers: { "Content-Type": "text/event-stream" } },
          );
        }
        return original(input, init);
      };
    });
    await page.goto(
      `${process.env.CHAT_TEST_URL ?? "http://localhost:5181"}/chat`,
    );
    await page.getByPlaceholder("Ask anything").fill("Test scroll");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.waitForFunction(() => typeof window.emitAgent === "function");
    const emit = async (event: unknown) => {
      await page.evaluate((event) => window.emitAgent(event), event);
      // Allow the SSE parser, React, ResizeObserver and the scroll frame to settle.
      await page.waitForTimeout(80);
    };
    const viewport = page.getByRole("region", { name: "Conversation" });
    const metrics = () =>
      viewport.evaluate((element) => ({
        top: element.scrollTop,
        gap: element.scrollHeight - element.clientHeight - element.scrollTop,
      }));

    await t.test("follows response growth", async () => {
      for (let i = 0; i < 18; i++) {
        await emit({
          type: "delta",
          text: `Paragraph ${i}: Streaming assistant response.\n\n`,
        });
      }
      assert((await metrics()).top > 0);
      assert((await metrics()).gap <= 2);
    });

    await t.test(
      "even a small upward wheel scroll pauses following",
      async () => {
        await viewport.hover();
        await page.mouse.wheel(0, -20);
        await page.waitForTimeout(150);
        const before = await metrics();
        await emit({ type: "delta", text: "More output while reading.\n\n" });
        assert(Math.abs((await metrics()).top - before.top) < 2);
        await page.getByRole("button", { name: "Jump to latest" }).click();
        await page.waitForTimeout(100);
        assert((await metrics()).gap <= 2);
        assert.equal(
          await page.getByRole("button", { name: "Jump to latest" }).count(),
          0,
        );
      },
    );

    await t.test(
      "tool details stay collapsed and toggling them does not disable following",
      async () => {
        await emit({
          type: "tool_call",
          id: "t1",
          name: "translate_message",
          args: { text: "Hello", targetLang: "French" },
        });
        await emit({
          type: "tool_result",
          id: "t1",
          name: "translate_message",
          ok: true,
          result: { translation: "Bonjour" },
        });
        const toggle = page.getByRole("button", {
          name: "Thinking…",
          exact: true,
        });
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        // The fold precedes the streamed text. Exercise the toggle without Playwright
        // scrolling it into view, which would itself move away from the bottom.
        await toggle.evaluate((element: HTMLButtonElement) => element.click());
        await emit({
          type: "delta",
          text: "After expanding the tool trace.\n\n",
        });
        assert((await metrics()).gap <= 2);
        await toggle.evaluate((element: HTMLButtonElement) => element.click());
        await emit({
          type: "delta",
          text: "After collapsing the tool trace.\n\n",
        });
        assert((await metrics()).gap <= 2);
      },
    );

    await t.test(
      "keyboard scrolling pauses, returning to the bottom resumes",
      async () => {
        await viewport.focus();
        await page.keyboard.press("PageUp");
        await page.waitForTimeout(500);
        const before = await metrics();
        await emit({
          type: "delta",
          text: "More while reading earlier messages.\n\n",
        });
        assert(Math.abs((await metrics()).top - before.top) < 2);
        await viewport.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await page.waitForTimeout(120);
        await emit({ type: "delta", text: "Resumed by scrolling down.\n\n" });
        assert((await metrics()).gap <= 2);
      },
    );

    await t.test(
      "delayed layout and composer resizing preserve following",
      async () => {
        await viewport.evaluate((element) => {
          const spacer = document.createElement("div");
          spacer.id = "delayed-layout-fixture";
          spacer.style.height = "160px";
          element.firstElementChild!.appendChild(spacer);
        });
        await page.waitForTimeout(120);
        assert((await metrics()).gap <= 2);
        await page.getByPlaceholder("Ask anything").evaluate((element) => {
          element.style.height = "130px";
        });
        await page.waitForTimeout(120);
        assert((await metrics()).gap <= 2);
      },
    );

    await t.test(
      "mobile viewport resizing keeps the composer visible without document overflow",
      async () => {
        await page.setViewportSize({ width: 390, height: 480 });
        await page.waitForTimeout(150);
        assert((await metrics()).gap <= 2);
        const bounds = await page
          .getByPlaceholder("Ask anything")
          .boundingBox();
        assert(bounds && bounds.y + bounds.height <= 480);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 1,
          ),
        );
        await viewport.hover();
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(120);
        const before = await metrics();
        await page.setViewportSize({ width: 390, height: 620 });
        await emit({
          type: "delta",
          text: "Continue while the reader is away.\n\n",
        });
        assert(Math.abs((await metrics()).top - before.top) < 2);
      },
    );

    await t.test(
      "completion stays paused and New chat resets the thread",
      async () => {
        const before = await metrics();
        await emit({ type: "done", action: "show", text: "", speak: false });
        await page.evaluate(() => window.closeAgent());
        assert(Math.abs((await metrics()).top - before.top) < 2);
        await page.getByRole("button", { name: "New chat" }).click();
        await page.waitForTimeout(120);
        assert.equal((await metrics()).top, 0);
        assert.equal(
          await page.getByRole("button", { name: "Jump to latest" }).count(),
          0,
        );
        assert(
          await page
            .getByRole("heading", { name: "Ask Hypa in your language" })
            .isVisible(),
        );
      },
    );
    await t.test(
      "generated media waits for the reply and reveals pictures before audio",
      async () => {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page
          .getByPlaceholder("Ask anything")
          .fill("Make a picture and audio");
        await page.getByRole("button", { name: "Send", exact: true }).click();
        await page.waitForTimeout(100);
        await emit({
          type: "image",
          id: "picture-1",
          toolCallId: "picture-tool",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
        });
        await emit({
          type: "audio",
          id: "audio-1",
          url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=",
        });
        await emit({ type: "delta", text: "Here are your picture and audio." });
        assert.equal(
          await page.getByRole("group", { name: "Generated pictures" }).count(),
          0,
        );
        assert.equal(
          await page.getByRole("group", { name: "Audio clips" }).count(),
          0,
        );
        await page.evaluate(() => {
          window.mediaSeen = {};
          const observer = new MutationObserver(() => {
            for (const label of ["Generated pictures", "Audio clips"]) {
              if (
                document.querySelector(`[aria-label="${label}"]`) &&
                !window.mediaSeen[label]
              )
                window.mediaSeen[label] = performance.now();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        });
        await emit({
          type: "done",
          action: "show",
          text: "Here are your picture and audio.",
          speak: false,
        });
        await page.getByRole("group", { name: "Audio clips" }).waitFor();
        const seen = await page.evaluate(() => window.mediaSeen);
        assert(seen["Audio clips"] - seen["Generated pictures"] >= 200);
        await page.evaluate(() => window.closeAgent());
        await page.waitForTimeout(350);
        await page.getByRole("button", { name: "New chat" }).click();
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.getByPlaceholder("Ask anything").fill("Audio only");
        await page.getByRole("button", { name: "Send", exact: true }).click();
        await page.waitForTimeout(100);
        await emit({
          type: "audio",
          url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=",
        });
        assert.equal(
          await page.getByRole("group", { name: "Audio clips" }).count(),
          0,
        );
        await emit({
          type: "done",
          action: "show",
          text: "Your audio.",
          speak: false,
        });
        await page.getByRole("group", { name: "Audio clips" }).waitFor();
        await page.evaluate(() => window.closeAgent());
      },
    );
  },
);
