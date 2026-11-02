// @ts-nocheck
export type AudioController = { stop: () => void };

/**
 * Shared AudioContext singleton.
 *
 * iOS/WebKit creates every new AudioContext in a "suspended" state and only
 * allows it to transition to "running" inside a **direct user-gesture** call
 * stack (tap / click). Because TTS playback happens in an async `onSuccess`
 * callback (after the network request resolves), the original gesture has
 * "expired" and a freshly created AudioContext stays suspended — `source.start`
 * silently produces no audio.
 *
 * By reusing a single AudioContext that was resumed during the very first user
 * interaction we sidestep the problem entirely. The context stays in "running"
 * state across subsequent calls. This also avoids hitting iOS's low limit on
 * simultaneous AudioContext instances (~4-6), which is another source of
 * silent failures.
 */
type AudioContextCtor = { new (): AudioContext };
let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext {
  const win = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const AudioCtxClass = win.AudioContext || win.webkitAudioContext;

  if (!AudioCtxClass)
    throw new Error("Web Audio API is not supported in this browser");

  // Reuse existing context if it hasn't been closed
  if (sharedAudioCtx && sharedAudioCtx.state !== "closed") {
    return sharedAudioCtx;
  }

  sharedAudioCtx = new AudioCtxClass();

  return sharedAudioCtx;
}

/**
 * Warm up (resume) the shared AudioContext.
 *
 * Call this from a click/tap handler **before** starting any async work
 * (e.g. the TTS API request). On iOS this is the critical step: the
 * `resume()` must occur inside the user-gesture call stack, after which
 * the context stays "running" for all subsequent playback.
 *
 * On Android / desktop this is a harmless no-op.
 */
export function warmUpAudioContext(): void {
  try {
    const ctx = getOrCreateAudioContext();

    if (ctx.state === "suspended") {
      ctx
        .resume()
        .catch((e) => console.warn("AudioContext warm-up resume failed:", e));
    }
    // Some iOS versions only "unlock" audio after a real node starts.
    // Play a 1-sample silent buffer to satisfy the gesture requirement.
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();

    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    source.onended = () => {
      try {
        source.disconnect();
      } catch {
        // no-op
      }
    };
  } catch {
    // Non-critical; playback will still attempt to resume later
  }
}

export async function playBlobWithPitchAndSpeed(
  blob: Blob,
  opts: {
    pitch?: number;
    speed?: number;
    onended?: () => void;
    onerror?: (msg: string) => void;
  },
): Promise<AudioController> {
  const arrayBuffer = await blob.arrayBuffer();

  const audioCtx = getOrCreateAudioContext();

  // --- iOS fix: ensure the context is running before decoding/playing ---
  // If it's still suspended (e.g. warmUpAudioContext wasn't called, or the
  // device re-suspended it), try to resume now. This may or may not work
  // depending on gesture timing, but is always safe to call.
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn("AudioContext resume failed:", e);
    }
  }

  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const source = audioCtx.createBufferSource();

  source.buffer = audioBuffer;

  const playbackRate = opts.speed ?? 1;

  source.playbackRate.value = playbackRate;

  source.connect(audioCtx.destination);

  let stopped = false;

  source.onended = () => {
    if (stopped) return;
    stopped = true;
    // Don't close the shared context — keep it alive for the next playback
    if (opts.onended) opts.onended();
  };

  try {
    source.start(0);
  } catch (err) {
    if (opts.onerror) opts.onerror(String(err));
    throw err;
  }

  const controller: AudioController = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        source.stop();
      } catch (e) {
        console.error("Failed stopping source:", e);
      }
      // Don't close the shared context — keep it alive for the next playback
      if (opts.onended) opts.onended();
    },
  };

  return controller;
}

export function stopOrPauseAudio(
  a?: AudioController | HTMLAudioElement | null,
) {
  if (!a) return;
  if (typeof (a as AudioController).stop === "function") {
    try {
      (a as AudioController).stop();
    } catch (e) {
      console.error("Error stopping audio controller:", e);
    }

    return;
  }
  if (typeof (a as HTMLAudioElement).pause === "function") {
    try {
      (a as HTMLAudioElement).pause();
    } catch (e) {
      console.error("Error pausing HTMLAudioElement:", e);
    }
  }
}
