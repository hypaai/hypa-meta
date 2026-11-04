import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { FONTS } from '@/constants/fonts';
import type { LensMotion } from '@/hooks/use-lens-frames';
import { LINE_HEIGHT } from '@/lib/lens/fit-text';
import { followMotion, motionSpeed, predictMotion, type Steadiness, stepSteadiness } from '@/lib/lens/motion-placement';
import type { LineShape } from '@/lib/lens/overlay-geometry';

/** One translation unit inside a card. No text yet means it is still translating. */
export type CardSegment = { key: string; text?: string; bars: number[] };

/** One paragraph card, drawn over the block of source text it translates. */
export type OverlayCard = LineShape & {
  key: string;
  background: string;
  color: string;
  /** Padding around the source text, in view points. */
  pad: number;
  fontSize: number;
  /** Source line height in view points: sets the skeleton bar rhythm. */
  lineHeight: number;
  segments: CardSegment[];
};

export type MotionToView = { x: { x: number; y: number }; y: { x: number; y: number } };

const GLIDE_MS = 90;
const PULSE_MS = 750;
const REVEAL_MS = 180;
const HIDE_MS = 120;
const SHOW_MS = 220;
const SKELETON_HEIGHT = 0.4;
const SKELETON_MIN = 0.18;
const SKELETON_MAX = 0.38;
export function LensOverlay({
  cards,
  motion,
  motionToView,
  onFastChange,
}: {
  cards: OverlayCard[];
  motion: LensMotion;
  motionToView: SharedValue<MotionToView | null>;
  onFastChange?: (fast: boolean) => void;
}) {
  const offset = useSharedValue({ x: 0, y: 0 });
  const pulse = useSharedValue(0);
  const shown = useSharedValue(1);
  const steadiness = useSharedValue<Steadiness>({ moving: false, steadySince: 0 });

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);

  useFrameCallback((frame) => {
    const toView = motionToView.value;
    if (!toView) return;
    const now = Date.now();
    const state = motion.getDirty();
    const { x, y } = predictMotion(state, now);
    const target = {
      x: toView.x.x * x + toView.y.x * y,
      y: toView.x.y * x + toView.y.y * y,
    };
    offset.value = followMotion(offset.value, target, frame.timeSincePreviousFrame ?? 1000);

    const next = stepSteadiness(steadiness.value, motionSpeed(state, toView, now), now);
    if (next.moving !== steadiness.value.moving) {
      shown.value = withTiming(next.moving ? 0 : 1, { duration: next.moving ? HIDE_MS : SHOW_MS });
      if (onFastChange) scheduleOnRN(onFastChange, next.moving);
    }
    if (next !== steadiness.value) steadiness.value = next;
  });

  const follow = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: offset.value.x }, { translateY: offset.value.y }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, follow]}>
      {cards.map((card) => (
        <Card key={card.key} card={card} pulse={pulse} />
      ))}
    </Animated.View>
  );
}

function Card({ card, pulse }: { card: OverlayCard; pulse: SharedValue<number> }) {
  const centerX = useSharedValue(card.centerX);
  const centerY = useSharedValue(card.centerY);
  const length = useSharedValue(card.length);
  const thickness = useSharedValue(card.thickness);
  const angle = useSharedValue(card.angle);
  const pad = useSharedValue(card.pad);

  useEffect(() => {
    const glide = { duration: GLIDE_MS };
    centerX.value = withTiming(card.centerX, glide);
    centerY.value = withTiming(card.centerY, glide);
    length.value = withTiming(card.length, glide);
    thickness.value = withTiming(card.thickness, glide);
    pad.value = withTiming(card.pad, glide);
    angle.value = withTiming(angle.value + ((((card.angle - angle.value + 540) % 360) + 360) % 360) - 180, glide);
  }, [angle, card.angle, card.centerX, card.centerY, card.length, card.pad, card.thickness, centerX, centerY, length, pad, thickness]);

  const placement = useAnimatedStyle(() => {
    const width = length.value + pad.value * 2;
    const height = thickness.value + pad.value * 2;
    return {
      left: centerX.value - width / 2,
      top: centerY.value - height / 2,
      width,
      height,
      transform: [{ rotate: `${angle.value}deg` }],
    };
  });

  const radius = Math.min(6, Math.max(2, card.lineHeight * 0.15));
  return (
    <Animated.View
      style={[
        styles.card,
        placement,
        {
          backgroundColor: card.background,
          borderRadius: radius,
          paddingHorizontal: card.pad,
          paddingVertical: card.pad * 0.8,
          boxShadow: `0 ${radius / 2}px ${radius * 2}px rgba(0,0,0,0.18)`,
        },
      ]}>
      {card.segments.map((segment) => (
        <Segment key={segment.key} segment={segment} card={card} pulse={pulse} />
      ))}
    </Animated.View>
  );
}

function Segment({ segment, card, pulse }: { segment: CardSegment; card: OverlayCard; pulse: SharedValue<number> }) {
  // Text always fades in over its (already opaque) card, so lines merging into a box never flash the source.
  const arrived = useSharedValue(0);
  const [text, setText] = useState(segment.text);

  useEffect(() => {
    if (!segment.text) return;
    setText(segment.text);
    arrived.value = withTiming(1, { duration: REVEAL_MS });
  }, [arrived, segment.text]);

  const skeleton = useAnimatedStyle(() => ({
    opacity: (1 - arrived.value) * (SKELETON_MIN + (SKELETON_MAX - SKELETON_MIN) * pulse.value),
  }));
  const reveal = useAnimatedStyle(() => ({ opacity: arrived.value }));

  if (text) {
    return (
      <Animated.View style={reveal}>
        <Text
          style={[
            styles.text,
            { color: card.color, fontSize: card.fontSize, lineHeight: card.fontSize * LINE_HEIGHT },
          ]}>
          {text}
        </Text>
      </Animated.View>
    );
  }
  const bar = Math.max(3, card.lineHeight * SKELETON_HEIGHT);
  return (
    <Animated.View style={skeleton}>
      {segment.bars.map((width, index) => (
        <View key={index} style={{ height: card.lineHeight, justifyContent: 'center' }}>
          <View
            style={{
              width: `${Math.max(12, Math.min(100, width * 100))}%`,
              height: bar,
              borderRadius: bar / 2,
              backgroundColor: card.color,
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  text: {
    fontFamily: FONTS.main.regular,
    includeFontPadding: false,
    textAlign: 'left',
  },
});
