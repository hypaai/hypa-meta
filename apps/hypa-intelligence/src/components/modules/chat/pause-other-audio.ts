/** Starting one player pauses every other one on the page, whichever component owns it. */
export function pauseOtherAudio(playing: HTMLAudioElement) {
  document.querySelectorAll("audio").forEach((other) => {
    if (other !== playing) other.pause();
  });
}
