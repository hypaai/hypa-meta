import assert from "node:assert/strict";
import test from "node:test";
import { AudioCapture } from "../src/audio-capture";

test("flush sends the final short chunk before microphone teardown", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const originalContext = Object.getOwnPropertyDescriptor(
    globalThis,
    "AudioContext",
  );
  let trackStopped = false;
  let contextClosed = false;
  const processor = {
    onaudioprocess: null as
      | ((event: {
          inputBuffer: { getChannelData: () => Float32Array };
        }) => void)
      | null,
    connect() {},
    disconnect() {},
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => ({
          getTracks: () => [
            {
              stop: () => {
                trackStopped = true;
              },
            },
          ],
        }),
      },
    },
  });
  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: class {
      destination = {};
      createMediaStreamSource() {
        return { connect() {} };
      }
      createScriptProcessor() {
        return processor;
      }
      async close() {
        contextClosed = true;
      }
    },
  });
  const capture = new AudioCapture({ sampleRate: 16_000, chunkDuration: 60 });
  try {
    const sent: Uint8Array[] = [];
    capture.onChunkReady((wav) => sent.push(wav));
    await capture.start();
    processor.onaudioprocess!({
      inputBuffer: { getChannelData: () => new Float32Array(3_200).fill(0.5) },
    });
    assert.equal(sent.length, 0);
    capture.flush();
    capture.stop();
    assert.equal(sent.length, 1);
    assert.equal(new DataView(sent[0].buffer).getUint32(40, true), 6_400);
    assert.ok(trackStopped && contextClosed);
    assert.equal(capture.isCapturing, false);
    capture.flush();
    assert.equal(sent.length, 1);
  } finally {
    capture.stop();
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
    if (originalContext)
      Object.defineProperty(globalThis, "AudioContext", originalContext);
    else Reflect.deleteProperty(globalThis, "AudioContext");
  }
});
