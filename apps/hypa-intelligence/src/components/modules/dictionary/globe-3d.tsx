import type { Mesh, Group } from "three";

import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import * as THREE from "three";
import { Canvas, Html } from "@/three-compat";
import { useTheme } from "@/components/modules/theme/theme-provider";

/* ── Theme-matching color schemes (neutral grays matching theme) ── */
const THEME_COLORS = {
  light: {
    markerActive: "#555555" /* dark gray */,
    markerInactive: "#888888" /* medium gray */,
    glowRing: "#666666" /* darker gray glow */,
    atmosphere: "#cccccc" /* light gray */,
    gridLine: "rgba(180, 180, 180, 0.25)",
    land: { r: 130, g: 130, b: 130 },
    water: { r: 255, g: 255, b: 255 },
  },
  dark: {
    markerActive: "#cccccc" /* light gray */,
    markerInactive: "#999999" /* medium gray */,
    glowRing: "#bbbbbb" /* lighter gray glow */,
    atmosphere: "#666666" /* muted gray */,
    gridLine: "rgba(150, 150, 150, 0.25)",
    land: { r: 80, g: 80, b: 80 },
    water: { r: 40, g: 40, b: 40 },
  },
};

/* ── Country / language marker data ── */
interface LanguageMarker {
  name: string;
  language: string;
  lat: number;
  lng: number;
}

const MARKERS: LanguageMarker[] = [
  /* ─── Africa ─── */
  { name: "Nigeria", language: "Yoruba, Igbo, Hausa", lat: 9.06, lng: 7.49 },
  { name: "Kenya", language: "Swahili, Kikuyu", lat: -1.29, lng: 36.82 },
  {
    name: "South Africa",
    language: "Zulu, Xhosa, Afrikaans",
    lat: -33.92,
    lng: 18.42,
  },
  { name: "Egypt", language: "Arabic", lat: 30.04, lng: 31.24 },
  { name: "Morocco", language: "Arabic, Tamazight", lat: 33.97, lng: -6.85 },
  { name: "Ethiopia", language: "Amharic, Oromo", lat: 9.02, lng: 38.75 },
  { name: "Tanzania", language: "Swahili", lat: -6.37, lng: 34.89 },
  {
    name: "DR Congo",
    language: "French, Lingala, Swahili",
    lat: -4.44,
    lng: 15.27,
  },
  { name: "Ghana", language: "English, Twi, Ga", lat: 7.95, lng: -1.02 },
  { name: "Senegal", language: "French, Wolof", lat: 14.5, lng: -14.45 },
  {
    name: "Cameroon",
    language: "French, English, Fulfulde",
    lat: 5.95,
    lng: 10.15,
  },
  { name: "Madagascar", language: "Malagasy, French", lat: -18.77, lng: 46.87 },
  { name: "Angola", language: "Portuguese, Umbundu", lat: -8.84, lng: 13.23 },
  {
    name: "Mozambique",
    language: "Portuguese, Makhuwa",
    lat: -15.6,
    lng: 35.53,
  },
  {
    name: "Uganda",
    language: "English, Luganda, Swahili",
    lat: 0.35,
    lng: 32.6,
  },
  {
    name: "Algeria",
    language: "Arabic, Tamazight, French",
    lat: 28.03,
    lng: 1.66,
  },
  { name: "Sudan", language: "Arabic, Nubian", lat: 15.5, lng: 32.56 },
  { name: "Mali", language: "French, Bambara", lat: 12.64, lng: -8.0 },
  { name: "Niger", language: "French, Hausa, Zarma", lat: 13.51, lng: 2.11 },
  {
    name: "Ivory Coast",
    language: "French, Dioula, Baoulé",
    lat: 6.83,
    lng: -5.55,
  },
  {
    name: "Zimbabwe",
    language: "Shona, Ndebele, English",
    lat: -19.02,
    lng: 29.15,
  },
  {
    name: "Rwanda",
    language: "Kinyarwanda, French, English",
    lat: -1.94,
    lng: 29.87,
  },
  { name: "Tunisia", language: "Arabic, French", lat: 33.89, lng: 9.54 },
  { name: "Libya", language: "Arabic, Tamazight", lat: 26.34, lng: 17.23 },
  { name: "Somalia", language: "Somali, Arabic", lat: 5.15, lng: 46.2 },
  /* ─── Europe ─── */
  { name: "France", language: "French", lat: 46.6, lng: 2.21 },
  { name: "Germany", language: "German", lat: 51.17, lng: 10.45 },
  {
    name: "United Kingdom",
    language: "English, Welsh",
    lat: 51.51,
    lng: -0.13,
  },
  { name: "Wales", language: "Welsh (Cymraeg)", lat: 52.13, lng: -3.78 },
  {
    name: "Spain",
    language: "Spanish, Catalan, Basque",
    lat: 40.46,
    lng: -3.75,
  },
  { name: "Italy", language: "Italian", lat: 41.87, lng: 12.57 },
  { name: "Portugal", language: "Portuguese", lat: 38.72, lng: -9.14 },
  { name: "Poland", language: "Polish", lat: 51.92, lng: 19.15 },
  { name: "Netherlands", language: "Dutch, Frisian", lat: 52.13, lng: 5.29 },
  { name: "Greece", language: "Greek", lat: 39.07, lng: 21.82 },
  { name: "Sweden", language: "Swedish, Sami", lat: 60.13, lng: 18.64 },
  { name: "Norway", language: "Norwegian, Sami", lat: 60.47, lng: 8.47 },
  {
    name: "Finland",
    language: "Finnish, Swedish, Sami",
    lat: 61.92,
    lng: 25.75,
  },
  { name: "Denmark", language: "Danish", lat: 56.26, lng: 9.5 },
  {
    name: "Ireland",
    language: "English, Irish (Gaeilge)",
    lat: 53.14,
    lng: -7.69,
  },
  { name: "Romania", language: "Romanian", lat: 45.94, lng: 24.97 },
  { name: "Czech Republic", language: "Czech", lat: 49.82, lng: 15.47 },
  { name: "Hungary", language: "Hungarian", lat: 47.16, lng: 19.5 },
  { name: "Ukraine", language: "Ukrainian", lat: 48.38, lng: 31.17 },
  {
    name: "Switzerland",
    language: "German, French, Italian, Romansh",
    lat: 46.82,
    lng: 8.23,
  },
  { name: "Austria", language: "German", lat: 47.52, lng: 14.55 },
  { name: "Serbia", language: "Serbian", lat: 44.02, lng: 21.01 },
  { name: "Croatia", language: "Croatian", lat: 45.1, lng: 15.2 },
  { name: "Iceland", language: "Icelandic", lat: 64.96, lng: -19.02 },
  /* ─── Asia ─── */
  { name: "Japan", language: "Japanese", lat: 35.68, lng: 139.69 },
  { name: "China", language: "Mandarin, Cantonese", lat: 39.9, lng: 116.4 },
  { name: "India", language: "Hindi, Tamil, Bengali", lat: 20.59, lng: 78.96 },
  { name: "Russia", language: "Russian", lat: 55.76, lng: 37.62 },
  {
    name: "Indonesia",
    language: "Bahasa Indonesia, Javanese",
    lat: -6.2,
    lng: 106.85,
  },
  { name: "Thailand", language: "Thai", lat: 15.87, lng: 100.99 },
  { name: "Turkey", language: "Turkish, Kurdish", lat: 38.96, lng: 35.24 },
  { name: "Iran", language: "Persian (Farsi)", lat: 32.43, lng: 53.69 },
  { name: "South Korea", language: "Korean", lat: 35.91, lng: 127.77 },
  { name: "Vietnam", language: "Vietnamese", lat: 14.06, lng: 108.28 },
  {
    name: "Philippines",
    language: "Filipino, Cebuano, Ilocano",
    lat: 12.88,
    lng: 121.77,
  },
  {
    name: "Malaysia",
    language: "Malay, Tamil, Mandarin",
    lat: 4.21,
    lng: 101.98,
  },
  { name: "Myanmar", language: "Burmese, Shan, Karen", lat: 19.76, lng: 96.08 },
  { name: "Bangladesh", language: "Bengali", lat: 23.68, lng: 90.36 },
  {
    name: "Pakistan",
    language: "Urdu, Punjabi, Sindhi",
    lat: 30.38,
    lng: 69.35,
  },
  { name: "Afghanistan", language: "Pashto, Dari", lat: 33.94, lng: 67.71 },
  { name: "Nepal", language: "Nepali, Maithili", lat: 28.39, lng: 84.12 },
  { name: "Sri Lanka", language: "Sinhala, Tamil", lat: 7.87, lng: 80.77 },
  { name: "Cambodia", language: "Khmer", lat: 12.57, lng: 104.99 },
  { name: "Mongolia", language: "Mongolian", lat: 46.86, lng: 103.85 },
  { name: "Kazakhstan", language: "Kazakh, Russian", lat: 48.02, lng: 66.92 },
  { name: "Uzbekistan", language: "Uzbek", lat: 41.38, lng: 64.59 },
  { name: "Saudi Arabia", language: "Arabic", lat: 23.89, lng: 45.08 },
  { name: "Iraq", language: "Arabic, Kurdish", lat: 33.22, lng: 43.68 },
  { name: "Israel", language: "Hebrew, Arabic", lat: 31.05, lng: 34.85 },
  { name: "Georgia", language: "Georgian", lat: 42.32, lng: 43.36 },
  { name: "Armenia", language: "Armenian", lat: 40.07, lng: 45.04 },
  {
    name: "Papua New Guinea",
    language: "Tok Pisin, 800+ langs",
    lat: -6.31,
    lng: 143.96,
  },
  {
    name: "Siberia (Russia)",
    language: "Yakut, Evenki, Buryat",
    lat: 62.03,
    lng: 129.73,
  },
  { name: "Tibet (China)", language: "Tibetan", lat: 29.65, lng: 91.11 },
  /* ─── Americas ─── */
  {
    name: "United States",
    language: "English, Spanish, Navajo",
    lat: 38.91,
    lng: -77.04,
  },
  {
    name: "Canada",
    language: "English, French, Cree",
    lat: 56.13,
    lng: -106.35,
  },
  { name: "Mexico", language: "Spanish, Nahuatl", lat: 19.43, lng: -99.13 },
  { name: "Brazil", language: "Portuguese", lat: -14.24, lng: -51.93 },
  { name: "Peru", language: "Spanish, Quechua", lat: -12.05, lng: -77.04 },
  { name: "Colombia", language: "Spanish", lat: 4.57, lng: -74.3 },
  { name: "Argentina", language: "Spanish", lat: -38.42, lng: -63.62 },
  { name: "Chile", language: "Spanish, Mapudungun", lat: -35.68, lng: -71.54 },
  { name: "Venezuela", language: "Spanish", lat: 6.42, lng: -66.59 },
  { name: "Cuba", language: "Spanish", lat: 21.52, lng: -77.78 },
  {
    name: "Guatemala",
    language: "Spanish, K'iche', Kaqchikel",
    lat: 14.63,
    lng: -90.51,
  },
  {
    name: "Bolivia",
    language: "Spanish, Quechua, Aymara",
    lat: -16.29,
    lng: -63.59,
  },
  { name: "Ecuador", language: "Spanish, Kichwa", lat: -1.83, lng: -78.18 },
  {
    name: "Haiti",
    language: "Haitian Creole, French",
    lat: 18.97,
    lng: -72.29,
  },
  {
    name: "Jamaica",
    language: "English, Jamaican Patois",
    lat: 18.11,
    lng: -77.3,
  },
  { name: "Paraguay", language: "Spanish, Guaraní", lat: -23.44, lng: -58.44 },
  {
    name: "Alaska (US)",
    language: "English, Yupik, Inupiaq",
    lat: 63.35,
    lng: -152.0,
  },
  {
    name: "Greenland",
    language: "Greenlandic (Kalaallisut)",
    lat: 71.71,
    lng: -42.6,
  },
  {
    name: "Hawaii (US)",
    language: "English, Hawaiian",
    lat: 19.9,
    lng: -155.58,
  },
  /* ─── Oceania ─── */
  {
    name: "Australia",
    language: "English, Aboriginal langs",
    lat: -25.27,
    lng: 133.78,
  },
  { name: "New Zealand", language: "English, Māori", lat: -40.9, lng: 174.89 },
  {
    name: "Fiji",
    language: "Fijian, Hindi, English",
    lat: -17.71,
    lng: 178.07,
  },
  { name: "Samoa", language: "Samoan, English", lat: -13.76, lng: -172.1 },
  { name: "Tonga", language: "Tongan, English", lat: -21.18, lng: -175.2 },
];

/* ── Convert lat/lng to 3D position on a sphere ── */
function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ── Resolve the actual theme mode from 'system' | 'light' | 'dark' ── */
function useResolvedTheme(): "light" | "dark" {
  const { theme } = useTheme();
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    if (theme === "system" || !theme) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    return theme as "light" | "dark";
  });

  useEffect(() => {
    if (theme && theme !== "system") {
      setResolved(theme as "light" | "dark");

      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setResolved(e.matches ? "dark" : "light");

    mq.addEventListener("change", handler);
    setResolved(mq.matches ? "dark" : "light");

    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return resolved;
}

/* ── Load earth texture from CDN and convert to theme-matching colors ── */
function useThemedEarthTexture(isDark: boolean): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  useEffect(() => {
    const img = new Image();

    img.crossOrigin = "anonymous";
    /* Clean land/water mask — sharp continent outlines, no clouds */
    img.src =
      "https://unpkg.com/three-globe@2.34.2/example/img/earth-water.png";

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;

      /* Draw original land/water mask */
      ctx.drawImage(img, 0, 0);

      /* Remap: in earth-water.png, land=bright, water=dark */
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        const gray = d[i]; /* mask is grayscale so R=G=B */

        if (gray > 127) {
          /* Land/continents → theme land color */
          d[i] = colors.land.r;
          d[i + 1] = colors.land.g;
          d[i + 2] = colors.land.b;
        } else {
          /* Water/ocean → theme water color */
          d[i] = colors.water.r;
          d[i + 1] = colors.water.g;
          d[i + 2] = colors.water.b;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      /* Draw grid lines — theme-matching subtle lines */
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 0.5;

      /* Latitude lines */
      const latLines = 12;

      for (let i = 1; i < latLines; i++) {
        const y = (i / latLines) * canvas.height;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      /* Longitude lines */
      const lngLines = 24;

      for (let i = 1; i < lngLines; i++) {
        const x = (i / lngLines) * canvas.width;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);

      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      setTexture(tex);
    };

    img.onerror = () => {
      /* Fallback: generate a plain grid globe texture */
      const canvas = document.createElement("canvas");

      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;

      /* Theme base color */
      ctx.fillStyle = isDark ? "#2a2c35" : "#e8eaf0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* Grid */
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 12; i++) {
        const y = (i / 12) * canvas.height;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      for (let i = 1; i < 24; i++) {
        const x = (i / 24) * canvas.width;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);

      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    };
  }, [isDark, colors]);

  return texture;
}

/* ── Single marker dot with large invisible hit area ── */
const MarkerDot = ({
  marker,
  radius,
  onHover,
  onLeave,
  isActive,
  colors,
}: {
  marker: LanguageMarker;
  radius: number;
  onHover: (m: LanguageMarker) => void;
  onLeave: () => void;
  isActive: boolean;
  colors: (typeof THEME_COLORS)["light"];
}) => {
  const pos = useMemo(
    () => latLngToVector3(marker.lat, marker.lng, radius),
    [marker, radius],
  );
  const meshRef = useRef<Mesh>(null);
  const pulseRef = useRef<Mesh>(null);

  /* Subtle pulse animation on the visible dot */
  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.15;

    pulseRef.current.scale.setScalar(isActive ? 1.4 : s);
  });

  return (
    <group position={pos}>
      {/* Invisible large hit area for reliable hover detection */}
      <mesh
        ref={meshRef}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "auto";
          onLeave();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(marker);
        }}
      >
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible dot */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial
          transparent
          color={isActive ? colors.markerActive : colors.markerInactive}
          opacity={isActive ? 1 : 0.8}
        />
      </mesh>

      {/* Glow ring when active */}
      {isActive && (
        <mesh>
          <ringGeometry args={[0.05, 0.08, 32]} />
          <meshBasicMaterial
            transparent
            color={colors.glowRing}
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

/* ── Tooltip card (rendered outside the rotating group) ── */
const TooltipCard = ({
  marker,
  groupRef,
  radius,
}: {
  marker: LanguageMarker;
  groupRef: React.RefObject<Group | null>;
  radius: number;
}) => {
  const posRef = useRef(new THREE.Vector3());

  /* Recompute world position every frame so the card stays fixed even as globe rotates */
  useFrame(() => {
    if (!groupRef.current) return;
    const local = latLngToVector3(marker.lat, marker.lng, radius);

    posRef.current.copy(local);
    groupRef.current.localToWorld(posRef.current);
  });

  return (
    <Html
      center
      position={posRef.current}
      style={{ pointerEvents: "none" }}
      zIndexRange={[100, 0]}
    >
      <div
        className="pointer-events-none whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-xl"
        style={{ transform: "translateY(-50px)" }}
      >
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {marker.name}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {marker.language}
        </p>
      </div>
    </Html>
  );
};

/* ── The rotating globe sphere ── */
const GlobeSphere = () => {
  const groupRef = useRef<Group>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<LanguageMarker | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const dragStart = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const autoResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { gl } = useThree();

  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const texture = useThemedEarthTexture(isDark);

  const RADIUS = 1.6;
  const AFRICA_Y_ROTATION =
    -1.92; /* ≈ 110° so camera faces ~20°E longitude (Africa) */

  /* Auto-rotation — pause when a marker is hovered */
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (autoRotate && !isDragging && !hoveredMarker) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  /* Drag handlers */
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setIsDragging(true);
      setAutoRotate(false);
      if (autoResumeTimer.current) clearTimeout(autoResumeTimer.current);
      dragStart.current = {
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
      };
      rotationRef.current = {
        x: groupRef.current?.rotation.x ?? 0,
        y: groupRef.current?.rotation.y ?? 0,
      };
      gl.domElement.setPointerCapture(e.nativeEvent.pointerId);
    },
    [gl],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging || !groupRef.current) return;
      e.stopPropagation();
      const dx = (e.nativeEvent.clientX - dragStart.current.x) * 0.005;
      const dy = (e.nativeEvent.clientY - dragStart.current.y) * 0.005;

      groupRef.current.rotation.y = rotationRef.current.y + dx;
      groupRef.current.rotation.x = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, rotationRef.current.x + dy),
      );
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setIsDragging(false);
      gl.domElement.releasePointerCapture(e.nativeEvent.pointerId);
      autoResumeTimer.current = setTimeout(() => setAutoRotate(true), 2500);
    },
    [gl],
  );

  const handleMarkerHover = useCallback((m: LanguageMarker) => {
    setHoveredName(m.name);
    setHoveredMarker(m);
  }, []);

  const handleMarkerLeave = useCallback(() => {
    setHoveredName(null);
    setHoveredMarker(null);
  }, []);

  if (!texture) return null;

  return (
    <>
      <group
        ref={groupRef}
        rotation={[0, AFRICA_Y_ROTATION, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Globe sphere with grayscale earth texture */}
        <mesh>
          <sphereGeometry args={[RADIUS, 64, 64]} />
          <meshBasicMaterial map={texture} />
        </mesh>

        {/* Atmosphere glow */}
        <mesh>
          <sphereGeometry args={[RADIUS * 1.02, 64, 64]} />
          <meshBasicMaterial
            transparent
            color={colors.atmosphere}
            opacity={isDark ? 0.06 : 0.035}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Language marker dots */}
        {MARKERS.map((m) => (
          <MarkerDot
            key={m.name}
            colors={colors}
            isActive={hoveredName === m.name}
            marker={m}
            radius={RADIUS + 0.015}
            onHover={handleMarkerHover}
            onLeave={handleMarkerLeave}
          />
        ))}
      </group>

      {/* Tooltip rendered OUTSIDE the rotating group so it doesn't spin */}
      {hoveredMarker && (
        <TooltipCard
          groupRef={groupRef}
          marker={hoveredMarker}
          radius={RADIUS + 0.015}
        />
      )}
    </>
  );
};

/* ── Main export ── */
const Globe3D = ({ className = "" }: { className?: string }) => (
  <div
    className={`globe-stage relative block shrink-0 overflow-hidden ${className}`.trim()}
    style={{
      contain: "layout paint size",
      transform: "translateZ(0)",
    }}
  >
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      dpr={
        typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio) : 1
      }
      gl={{ antialias: true, alpha: true }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 120 } }}
      style={{
        background: "transparent",
        display: "block",
        height: "100%",
        width: "100%",
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight intensity={0.5} position={[5, 3, 5]} />
      <directionalLight intensity={0.15} position={[-3, -1, -4]} />
      <GlobeSphere />
    </Canvas>
  </div>
);

export default Globe3D;
