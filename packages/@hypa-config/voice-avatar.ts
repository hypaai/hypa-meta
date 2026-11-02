export function getVoiceAvatarUrl(seed: string, version = "9.x"): string {
  return `https://api.dicebear.com/${version}/open-peeps/svg?seed=${encodeURIComponent(seed)}`;
}
