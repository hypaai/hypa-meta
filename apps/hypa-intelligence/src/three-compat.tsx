/**
 * Re-exports from @react-three/fiber and @react-three/drei with type assertions
 * to avoid React 18 vs 19 type conflicts in the monorepo.
 */
import type { ComponentType } from "react";

import { Canvas as CanvasOrig } from "@react-three/fiber";
import { Html as HtmlOrig } from "@react-three/drei";

export const Canvas = CanvasOrig as ComponentType<any>;

export const Html = HtmlOrig as ComponentType<any>;
