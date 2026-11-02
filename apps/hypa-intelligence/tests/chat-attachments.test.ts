import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "@playwright/test";

// Start Intelligence's Vite server first. The agent request is intercepted and
// answered locally; these tests never call a model or spend wallet funds.
test(
  "recordings and files attach as cards and are sent together",
  { timeout: 40_000 },
  async (t) => {
    const browser = await chromium.launch({
      ...(process.env.CHROME_BIN
        ? { executablePath: process.env.CHROME_BIN }
        : {}),
      args: [
        "--no-sandbox",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    });
    t.after(() => browser.close());
    const context = await browser.newContext({ permissions: ["microphone"] });
    const page = await context.newPage();
    let sent: {
      input: string;
      files: { name: string; mime: string; data: string }[];
      history?: { audio?: { name: string }[] }[];
    } = { input: "", files: [] };

    await page.route("**/v2/agent", async (route) => {
      sent = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ type: "done", action: "show", text: "Got them.", speak: false })}\n\n`,
      });
    });
    await page.goto(
      `${process.env.CHAT_TEST_URL ?? "http://localhost:5181"}/chat`,
    );

    const speak = page.getByRole("button", { name: "Speak", exact: true });
    const record = async (seconds: number) => {
      await speak.click();
      await page.getByRole("button", { name: "Stop recording" }).waitFor();
      await page.waitForTimeout(seconds * 1000);
      await page.getByRole("button", { name: "Stop recording" }).click();
    };

    await record(1.2);
    await page.getByRole("button", { name: "Play Recording 1" }).waitFor();
    await record(1.2);
    await page.getByRole("button", { name: "Play Recording 2" }).waitFor();

    await speak.click();
    await page.getByRole("button", { name: "Discard recording" }).click();
    await page.waitForTimeout(500);
    assert.equal(
      await page.getByRole("button", { name: /^Play / }).count(),
      2,
      "a discarded take is not attached",
    );

    const wav = Buffer.alloc(44 + 16000);

    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + 16000, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24);
    wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(16000, 40);
    await page
      .locator("input[type=file]")
      .setInputFiles({ name: "hello.wav", mimeType: "audio/wav", buffer: wav });
    await page.getByRole("button", { name: "Play hello.wav" }).waitFor();

    await page.locator("input[type=file]").setInputFiles({
      name: "notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    });
    await page.getByText(/Add PNG, JPG/).waitFor();
    assert.equal(
      await page.getByRole("button", { name: /^Play / }).count(),
      3,
      "an unsupported file is refused",
    );

    await page.getByPlaceholder("Ask anything").fill("Translate these");
    await page.locator("input[type=file]").setInputFiles({
      name: "fake.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.concat([
        Buffer.from([0, 0, 0, 24]),
        Buffer.from("ftypM4A "),
        Buffer.alloc(40),
      ]),
    });
    await page.getByText(/doesn't look like the audio file/).waitFor();
    assert.equal(
      await page.getByRole("button", { name: /^Play / }).count(),
      3,
      "a mislabeled file is refused",
    );

    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.getByText("Got them.").waitFor();
    assert.equal(sent.input, "Translate these");
    assert.deepEqual(
      sent.files.map((file) => `${file.name}|${file.mime}`),
      ["Recording 1|audio/wav", "Recording 2|audio/wav", "hello.wav|audio/wav"],
    );
    assert.ok(
      sent.files.every(
        (file) =>
          Buffer.from(file.data, "base64").toString("ascii", 0, 4) === "RIFF",
      ),
      "recordings are WAV, which carries a length",
    );
    assert.equal(
      await page.getByRole("button", { name: "Play Recording 1" }).count(),
      1,
      "the sent message keeps its recordings",
    );

    await page.getByPlaceholder("Ask anything").fill("And the second one?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.waitForTimeout(800);
    assert.deepEqual(
      sent.history?.[0]?.audio?.map((file) => file.name),
      ["Recording 1", "Recording 2", "hello.wav"],
      "a later message carries the earlier recordings",
    );
  },
);

test(
  "only one audio player plays at a time, and each shows its real state",
  { timeout: 40_000 },
  async (t) => {
    const browser = await chromium.launch({
      ...(process.env.CHROME_BIN
        ? { executablePath: process.env.CHROME_BIN }
        : {}),
      args: ["--no-sandbox"],
    });
    t.after(() => browser.close());
    const page = await browser.newPage();
    // Thirty seconds of silence, so nothing ends by itself while the test clicks.
    const wav = Buffer.alloc(44 + 480_000);

    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + 480_000, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24);
    wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(480_000, 40);
    const clip = `data:audio/wav;base64,${wav.toString("base64")}`;

    await page.route("**/v2/agent", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          { type: "audio", id: "c1", url: clip },
          { type: "audio", id: "c2", url: clip },
          { type: "done", action: "show", text: "Here.", speak: false },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
      }),
    );
    await page.goto(
      `${process.env.CHAT_TEST_URL ?? "http://localhost:5181"}/chat`,
    );
    await page
      .locator("input[type=file]")
      .setInputFiles({ name: "mine.wav", mimeType: "audio/wav", buffer: wav });
    await page.getByRole("button", { name: "Play mine.wav" }).waitFor();
    await page.getByPlaceholder("Ask anything").fill("Play these");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.getByRole("button", { name: "Play Audio 2" }).waitFor();

    const label = (name: string) => page.getByRole("button", { name });
    const soon = { timeout: 2_000 };

    await label("Play mine.wav").click();
    await label("Pause mine.wav").waitFor();
    await label("Play Audio 1").click();
    await label("Pause Audio 1").waitFor();
    await label("Play mine.wav").waitFor(soon);
    await label("Play Audio 2").click();
    await label("Pause Audio 2").waitFor();
    await label("Play Audio 1").waitFor(soon);
    // The paused clip responds to the next click straight away.
    await label("Play Audio 1").click();
    await label("Pause Audio 1").waitFor();
    await label("Play Audio 2").waitFor(soon);
  },
);
