import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/** A full-screen camera that hands back one snapped photo. */
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (photo: File) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | undefined;
    let closed = false;

    dialog.current?.showModal();
    void (async () => {
      try {
        const opened = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (closed) {
          opened.getTracks().forEach((track) => track.stop());

          return;
        }
        stream = opened;
        if (video.current) video.current.srcObject = opened;
      } catch {
        setError("Couldn't open the camera. Check that it is allowed.");
      }
    })();

    return () => {
      closed = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const snap = () => {
    const frame = video.current;

    if (!frame?.videoWidth) return;
    const canvas = document.createElement("canvas");

    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    canvas.getContext("2d")?.drawImage(frame, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Camera"
      className="m-0 size-full max-h-none max-w-none bg-transparent p-0 text-white backdrop:bg-black"
      onClose={onClose}
    >
      {error ? (
        <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm">
          {error}
        </p>
      ) : (
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          className="size-full object-contain"
        />
      )}
      <button
        aria-label="Close camera"
        className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-black/50 backdrop-blur"
        type="button"
        onClick={onClose}
      >
        <X aria-hidden="true" className="size-5" />
      </button>
      {!error && (
        <button
          aria-label="Take photo"
          className="absolute bottom-8 left-1/2 size-16 -translate-x-1/2 rounded-full border-4 border-white bg-white/30 transition active:scale-95 motion-reduce:transition-none"
          type="button"
          onClick={snap}
        />
      )}
    </dialog>
  );
}
