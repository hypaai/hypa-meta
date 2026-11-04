import { useIsFocused } from '@react-navigation/native';
import { isAxiosError } from 'axios';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Eraser, Flashlight, FlashlightOff, Pause, Play, Square, Volume2, X } from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, type CameraRef, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { LensOverlay, type MotionToView, type OverlayCard } from '@/components/modules/lens/lens-overlay';
import LanguageSelector from '@/components/ui/language-selector';
import { FONTS } from '@/constants/fonts';
import { useSettings } from '@/context/settings-context';
import { type FrameLine, type FrameLines, useLensFrames } from '@/hooks/use-lens-frames';
import { useTranslationTargetLanguagePresets } from '@/hooks/use-model-languages';
import { LiveLines } from '@/lib/lens/live-lines';
import { evenThickness, lineShape, type Size } from '@/lib/lens/overlay-geometry';
import { type PreviewBasis, toPreviewCameraPoint } from '@/lib/lens/frame-points';
import { LensSocket, LensSocketOffline, LensSocketUnavailable, type LensTranslationMode } from '@/lib/lens/lens-socket';
import { trackLines } from '@/lib/lens/stabilize-lines';
import { StickyOverlay } from '@/lib/lens/sticky-overlay';
import { PageBlocks, type PageBlock } from '@/lib/lens/page-blocks';
import { fitText, sharedFont } from '@/lib/lens/fit-text';
import { languageNameToCode } from '@/lib/model-languages';
import { synthesizeSpeech, translateLensLine } from '@/lib/product-api';
import { useToast } from '@/lib/toast';

const NO_TEXT_HINT_MS = 1500;
const MAX_REQUESTS_PER_FRAME = 6;
const UPRIGHT_BASIS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

const isUpperCase = (text: string) => /\p{L}/u.test(text) && text === text.toLocaleUpperCase();

type TrackedLine = FrameLine & { seenAt: number; id: number };
type TrackedLines = Omit<FrameLines, 'lines'> & {
  lines: TrackedLine[];
  blocks: PageBlock[];
  pass: number;
};

const CARD_PAD = 0.12;
const MAX_PAD = 5;
const MAX_FONT = 0.85;

const segmentTexts = (blocks: PageBlock[]) => blocks.flatMap((block) => block.segments.map((segment) => segment.text));

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return active;
}

export default function LensScreen() {
  const searchParams = useLocalSearchParams();
  const { use_agent } = searchParams;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<CameraRef>(null);
  const { languages, models, settings, resolvePlaybackVoice, targetLanguageVoices } = useSettings();
  const targetLanguages = useTranslationTargetLanguagePresets();

  const [targetLang, setTargetLang] = useState(languages.targetLang || targetLanguages[0]?.name || 'French');
  const [paused, setPaused] = useState(false);
  const [torch, setTorch] = useState(false);
  const [frameLines, setFrameLines] = useState<TrackedLines | null>(null);
  const [viewSize, setViewSize] = useState<Size | null>(null);
  const [offline, setOffline] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [noText, setNoText] = useState(false);
  const [translationsVersion, setTranslationsVersion] = useState(0);
  const [speaking, setSpeaking] = useState<'loading' | 'playing' | null>(null);

  const liveLines = useRef(new LiveLines()).current;
  const sticky = useRef(new StickyOverlay()).current;
  const pages = useRef(new PageBlocks()).current;
  const trackedRef = useRef<TrackedLine[]>([]);
  const passRef = useRef(0);
  const [fast, setFast] = useState(false);
  const abort = useRef(new AbortController()).current;
  const socket = useRef(new LensSocket()).current;
  const lastTextAt = useRef(Date.now());
  const agentRef = useRef({ provider: 'meta', model: 'muse-spark-1.3' });
  agentRef.current = {
    provider: settings?.assistantProvider ?? 'meta',
    model: settings?.assistantModel ?? 'muse-spark-1.3',
  };
  const translationModeRef = useRef<LensTranslationMode>({
    type: 'agent',
    ...agentRef.current,
  });
  translationModeRef.current =
    use_agent === 'false'
      ? {
          type: 'mt',
          provider: settings?.translationProvider ?? 'auto',
          model: models.translationModel ?? 'auto',
        }
      : { type: 'agent', ...agentRef.current };
  const targetRef = useRef(targetLang);
  targetRef.current = targetLang;
  const playerRef = useRef<AudioPlayer | null>(null);
  const playbackEpoch = useRef(0);

  useEffect(() => {
    if (canRequestPermission) void requestPermission();
  }, [canRequestPermission, requestPermission]);

  const stopSpeech = useCallback(() => {
    playbackEpoch.current += 1;
    try {
      playerRef.current?.pause();
      playerRef.current?.remove();
    } catch {}
    playerRef.current = null;
    setSpeaking(null);
  }, []);

  useEffect(
    () => () => {
      abort.abort();
      socket.close();
      stopSpeech();
    },
    [abort, socket, stopSpeech],
  );

  const translate = useCallback(
    (due: string[], target: string) => {
      for (const line of due) {
        socket
          .translate(line, target, translationModeRef.current)
          .catch((error) => {
            if (error instanceof LensSocketUnavailable) {
              const mode = translationModeRef.current;
              return translateLensLine({
                text: line,
                targetLang: target,
                ...(mode.type === 'mt'
                  ? { provider: mode.provider, translationModel: mode.model }
                  : {}),
                signal: abort.signal,
              });
            }
            throw error;
          })
          .then((translation) => {
            liveLines.resolve(target, [{ line, translation }]);
            setOffline(false);
            setUnavailable(false);
            setTranslationsVersion((version) => version + 1);
          })
          .catch((error) => {
            if (abort.signal.aborted) return;
            liveLines.reject(target, [line], Date.now());
            if (error instanceof LensSocketOffline || (isAxiosError(error) && !error.response)) setOffline(true);
            else setUnavailable(true);
            setTranslationsVersion((version) => version + 1);
          });
      }
    },
    [abort, liveLines, socket],
  );

  const onLines = useCallback(
    (result: FrameLines) => {
      const now = Date.now();
      const tracked = trackLines(trackedRef.current, result.lines, now);
      trackedRef.current = tracked;
      const blocks = pages.build(tracked, result.image);
      setFrameLines({
        ...result,
        lines: tracked,
        blocks,
        pass: ++passRef.current,
      });
      if (result.lines.length) lastTextAt.current = now;
      setNoText(now - lastTextAt.current > NO_TEXT_HINT_MS);
      const due = liveLines.observe(segmentTexts(blocks), targetRef.current, now, MAX_REQUESTS_PER_FRAME);
      if (due.length) translate(due, targetRef.current);
    },
    [liveLines, pages, translate],
  );

  const { frameOutput, motion } = useLensFrames({ paused, onLines });
  const motionToView = useSharedValue<MotionToView | null>(null);

  const previewBasis = frameLines?.previewBasis;
  const viewBasis = useMemo<PreviewBasis | null>(() => {
    if (!previewBasis || !viewSize || !camera.current) return null;
    try {
      return UPRIGHT_BASIS.map((point) =>
        camera.current!.convertCameraPointToViewPoint(toPreviewCameraPoint(point, previewBasis)),
      ) as PreviewBasis;
    } catch {
      return null;
    }
  }, [previewBasis, viewSize]);

  useEffect(() => {
    if (!viewBasis) return;
    const [origin, right, down] = viewBasis;
    motionToView.value = {
      x: { x: right.x - origin.x, y: right.y - origin.y },
      y: { x: down.x - origin.x, y: down.y - origin.y },
    };
  }, [motionToView, viewBasis]);

  /**
   * Lines first: each source line gets its own patch with a skeleton while it translates. When a
   * segment's translation arrives, its lines merge into one tight box holding the wrapped translation.
   */
  const overlay = useMemo<OverlayCard[]>(() => {
    if (!frameLines || !viewBasis) return [];
    const { blocks } = frameLines;
    const byId = new Map(frameLines.lines.map((line) => [line.id, line]));
    const toView = (corners: { x: number; y: number }[]) =>
      lineShape(corners.map((point) => toPreviewCameraPoint(point, viewBasis)));
    const cards: OverlayCard[] = [];
    const live: string[] = [];
    const pending: (() => void)[] = [];
    sticky.retarget(targetLang);
    sticky.noteLines(blocks.flatMap((block) => block.segments.flatMap((segment) => segment.lineIds)));

    for (const block of blocks) {
      const translated: { card: OverlayCard; fit: number }[] = [];
      // Source lines of one paragraph share one bar thickness, measured in view points.
      const sharedThickness = block.lineHeight * (toView(block.corners).length / Math.max(1, block.length));
      for (const segment of block.segments) {
        const fresh = liveLines.lookup(segment.text, targetLang);
        const shown = sticky.text(segment.key, fresh, segment.lineIds);
        if (shown) {
          const key = `s:${segment.key}`;
          live.push(key);
          pending.push(() => {
            const seen = toView(segment.corners);
            const lineHeight = segment.lineHeight * (seen.length / Math.max(1, segment.length));
            const placed = sticky.place(key, seen, lineHeight);
            const pad = Math.min(MAX_PAD, lineHeight * CARD_PAD);
            const text = isUpperCase(segment.text) ? shown.toLocaleUpperCase() : shown;
            // Boxes never grow past the lines they cover (that is how they run into each other): the text shrinks instead.
            const fit = fitText([text], placed.length, placed.thickness + pad * 0.4, lineHeight * MAX_FONT);
            translated.push({
              fit: fit.fontSize,
              card: {
                ...placed,
                key,
                background: sticky.colors.background,
                color: sticky.colors.color,
                pad,
                fontSize: fit.fontSize,
                lineHeight,
                segments: [{ key: segment.key, text, bars: [] }],
              },
            });
          });
          continue;
        }
        if (!liveLines.isLoading(segment.text, targetLang)) continue;
        for (const id of segment.lineIds) {
          const line = byId.get(id);
          if (!line || !sticky.mayLoad(id)) continue;
          const key = `l:${id}`;
          live.push(key);
          pending.push(() => {
            const seen = evenThickness(toView(line.corners), sharedThickness);
            const placed = sticky.place(key, seen, seen.thickness);
            cards.push({
              ...placed,
              key,
              background: sticky.colors.background,
              color: sticky.colors.color,
              pad: Math.min(MAX_PAD, placed.thickness * CARD_PAD),
              fontSize: placed.thickness * MAX_FONT,
              lineHeight: placed.thickness,
              segments: [{ key: String(id), bars: [1] }],
            });
          });
        }
      }
      // The translations of one block share a size (see sharedFont), so the paragraph doesn't read as mixed type.
      pending.push(() => {
        const shared = sharedFont(translated.map((entry) => entry.fit));
        for (const { card, fit } of translated) {
          cards.push({
            ...card,
            fontSize: shared === undefined ? fit : Math.min(fit, shared),
          });
        }
      });
    }
    sticky.begin(
      targetLang,
      frameLines.lines,
      live,
      blocks.flatMap((block) => block.segments.map((segment) => segment.key)),
    );
    for (const place of pending) place();
    return sticky.settle(cards, frameLines.pass, Date.now());
  }, [frameLines, liveLines, sticky, targetLang, translationsVersion, viewBasis]);

  const spokenText = useMemo(
    () =>
      overlay.flatMap((card) => card.segments.flatMap((segment) => (segment.text ? [segment.text] : []))).join('\n'),
    [overlay],
  );
  const voice = useMemo(() => {
    const code = languageNameToCode(targetLang) || targetLang;
    return resolvePlaybackVoice('output', code, targetLanguageVoices[code.toLowerCase()]);
  }, [resolvePlaybackVoice, targetLang, targetLanguageVoices]);

  const speak = useCallback(async () => {
    if (speaking) {
      stopSpeech();
      return;
    }
    if (!spokenText || !voice) return;
    stopSpeech();
    const epoch = playbackEpoch.current;
    setSpeaking('loading');
    try {
      const audio = await synthesizeSpeech({
        text: spokenText,
        language: targetLang,
        voice,
        model: models.ttsModel,
        provider: settings?.ttsProvider,
      });
      if (playbackEpoch.current !== epoch) return;
      const player = createAudioPlayer({
        uri: `data:${audio.audio_type};base64,${audio.audio_b64}`,
      });
      playerRef.current = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (playbackEpoch.current !== epoch) return;
        if (status.didJustFinish) setSpeaking(null);
      });
      setSpeaking('playing');
      player.play();
    } catch (error) {
      if (playbackEpoch.current !== epoch) return;
      setSpeaking(null);
      toast.showError('Audio failed', error instanceof Error ? error.message : undefined);
    }
  }, [models.ttsModel, settings?.ttsProvider, speaking, spokenText, stopSpeech, targetLang, toast, voice]);

  const changeTarget = useCallback(
    (next: string) => {
      if (next === targetRef.current) return;
      stopSpeech();
      setTargetLang(next);
      if (paused) {
        const due = liveLines.observe(segmentTexts(frameLines?.blocks ?? []), next, Date.now());
        if (due.length) translate(due, next);
      }
    },
    [frameLines, liveLines, paused, stopSpeech, translate],
  );

  const clearOverlay = useCallback(() => {
    stopSpeech();
    liveLines.clear();
    sticky.clear();
    setUnavailable(false);
    pages.reset();
    trackedRef.current = [];
    setFrameLines(null);
    setTranslationsVersion((version) => version + 1);
  }, [liveLines, pages, sticky, stopSpeech]);

  const togglePause = useCallback(() => {
    stopSpeech();
    setPaused((value) => !value);
  }, [stopSpeech]);

  const close = useCallback(() => {
    stopSpeech();
    router.back();
  }, [stopSpeech]);

  if (!hasPermission) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <CloseButton onPress={close} top={insets.top} />
        {canRequestPermission ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.title}>Camera access is off</Text>
            <Text style={styles.body}>Lens needs the camera to read and translate the text in front of you.</Text>
            <Pressable onPress={() => void Linking.openSettings()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <StatusBar style="light" />
        <CloseButton onPress={close} top={insets.top} />
        <Text style={styles.body}>No camera available on this device.</Text>
      </View>
    );
  }

  const status = offline
    ? "Offline: can't translate"
    : fast && !paused
      ? 'Moving too fast. Hold steady to translate'
      : unavailable
        ? "Translation isn't available right now"
        : noText && !paused
          ? 'Point at text'
          : null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        onLayout={(event) => setViewSize(event.nativeEvent.layout)}
        device={device}
        isActive={isFocused && appActive}
        outputs={[frameOutput]}
        torchMode={torch ? 'on' : 'off'}
        resizeMode="cover"
      />
      <LensOverlay cards={overlay} motion={motion} motionToView={motionToView} onFastChange={setFast} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <RoundButton label="Close Lens" onPress={close}>
          <X color="#fff" size={22} />
        </RoundButton>
        <View style={styles.languagePill}>
          <Text style={styles.autoLabel}>Auto →</Text>
          <LanguageSelector
            languages={targetLanguages}
            value={targetLang}
            onChange={changeTarget}
            title="Translate into"
          />
        </View>
        {device.hasTorch ? (
          <RoundButton label={torch ? 'Turn flash off' : 'Turn flash on'} onPress={() => setTorch((on) => !on)}>
            {torch ? <Flashlight color="#fff" size={20} /> : <FlashlightOff color="#fff" size={20} />}
          </RoundButton>
        ) : (
          <View style={styles.roundButton} />
        )}
      </View>

      {status ? (
        <View style={[styles.status, { top: insets.top + 72 }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <RoundButton label={paused ? 'Resume' : 'Pause'} onPress={togglePause}>
          {paused ? <Play color="#fff" size={22} /> : <Pause color="#fff" size={22} />}
        </RoundButton>
        <RoundButton
          label={speaking ? 'Stop reading' : 'Read translation aloud'}
          onPress={() => void speak()}
          disabled={!speaking && (!spokenText || !voice)}
        >
          {speaking === 'loading' ? (
            <ActivityIndicator color="#fff" />
          ) : speaking === 'playing' ? (
            <Square color="#fff" fill="#fff" size={18} />
          ) : (
            <Volume2 color="#fff" size={22} />
          )}
        </RoundButton>
        <RoundButton label="Clear translations" onPress={clearOverlay} disabled={!overlay.length}>
          <Eraser color="#fff" size={22} />
        </RoundButton>
      </View>
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[styles.roundButton, disabled && styles.disabled]}
    >
      {children}
    </Pressable>
  );
}

function CloseButton({ onPress, top }: { onPress: () => void; top: number }) {
  return (
    <View style={[styles.closeCorner, { top: top + 8 }]}>
      <RoundButton label="Close Lens" onPress={onPress}>
        <X color="#fff" size={22} />
      </RoundButton>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontFamily: FONTS.main.semiBold,
    fontSize: 20,
    textAlign: 'center',
  },
  body: {
    color: '#d4d4d4',
    fontFamily: FONTS.main.regular,
    fontSize: 15,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#111',
    fontFamily: FONTS.main.semiBold,
    fontSize: 15,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  languagePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoLabel: { color: '#fff', fontFamily: FONTS.main.medium, fontSize: 14 },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  disabled: { opacity: 0.4 },
  closeCorner: { position: 'absolute', left: 16 },
  status: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusText: { color: '#fff', fontFamily: FONTS.main.medium, fontSize: 14 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
});
