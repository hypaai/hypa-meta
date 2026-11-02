import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mic, MicOff, X } from "lucide-react-native";
import { startKeyboardMic, stopKeyboardMic } from "hypa-keyboard-storage";
import { Text } from "@/components/ui/text";
import { FONTS } from "@/constants/fonts";
import { useThemeColors } from "@/hooks/use-theme-color";


export default function KeyboardMicScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { at } = useLocalSearchParams<{ at?: string }>();
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<"starting" | "listening" | "stopped">("starting");

  useEffect(() => {
    setError(undefined);
    setPhase("starting");
    startKeyboardMic()
      .then(() => setPhase("listening"))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't start the microphone."));
  }, [at]);

  const stop = () => {
    stopKeyboardMic();
    setPhase("stopped");
  };
  const close = () => {
    stopKeyboardMic();
    router.replace("/");
  };

  const listening = phase === "listening" && !error;
  const Icon = listening ? Mic : MicOff;
  const title = error ?? (phase === "starting" ? "Starting the microphone…" : listening ? "Hypa is listening" : "Listening stopped");
  const button = { height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" } as const;
  const label = { fontFamily: FONTS.main.medium, fontSize: 16 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={10} style={{ marginLeft: 20, alignSelf: "flex-start" }}>
        <X color={colors.icon} size={22} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 }}>
        {phase === "starting" && !error ? <ActivityIndicator /> : <Icon color={colors.icon} size={32} />}
        <Text style={{ color: colors.text, fontFamily: FONTS.main.medium, fontSize: 17, textAlign: "center" }}>{title}</Text>
        {listening && (
          <Text style={{ color: colors.textMuted, fontFamily: FONTS.main.regular, fontSize: 15, textAlign: "center" }}>
            You can go back to your app and start speaking. Tap stop in the keyboard when you're done.
          </Text>
        )}
      </View>
      {listening && (
        <Pressable accessibilityRole="button" onPress={stop} style={{ ...button, marginHorizontal: 20, backgroundColor: colors.muted }}>
          <Text style={{ ...label, color: colors.text }}>Stop listening</Text>
        </Pressable>
      )}
    </View>
  );
}
