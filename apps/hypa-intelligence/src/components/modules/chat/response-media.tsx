import type {
  AgentAudioClip,
  AgentStep,
} from "@hypa/intelligence-core/agent-stream";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { AudioClips } from "./audio-clips";
import { ImageGallery } from "./image-gallery";

/** Mounted once a reply ends: pictures reveal first, then the audio players. */
export function ResponseMedia({
  images = [],
  clips = [],
  steps,
}: {
  images?: string[];
  clips?: AgentAudioClip[];
  steps?: AgentStep[];
}) {
  const reduceMotion = useReducedMotion();
  const [picturesRevealed, setPicturesRevealed] = useState(images.length === 0);
  const reveal = {
    initial: { height: 0, opacity: 0, overflow: "hidden" as const },
    animate: {
      height: "auto",
      opacity: 1,
      transitionEnd: { overflow: "visible" },
    },
    transition: { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" as const },
  };

  return (
    <>
      {images.length > 0 && (
        <motion.div
          {...reveal}
          className="flow-root"
          onAnimationComplete={() => setPicturesRevealed(true)}
        >
          <ImageGallery urls={images} />
        </motion.div>
      )}
      {clips.length > 0 && (picturesRevealed || reduceMotion) && (
        <motion.div {...reveal} className="flow-root">
          <AudioClips clips={clips} steps={steps} />
        </motion.div>
      )}
    </>
  );
}
