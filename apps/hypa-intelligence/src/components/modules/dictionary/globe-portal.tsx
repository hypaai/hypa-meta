import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import Globe3D from "./globe-3d";

const GlobePortal = ({ className = "" }: { className?: string }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");

    el.className = "globe-portal-root";
    document.body.appendChild(el);
    setContainer(el);

    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  if (!container) return null;

  return ReactDOM.createPortal(
    <div
      className={`globe-portal pointer-events-none select-none opacity-[0.07] ${className}`.trim()}
    >
      <React.Suspense fallback={null}>
        <Globe3D className="h-full w-full" />
      </React.Suspense>
    </div>,
    container,
  );
};

export default GlobePortal;
