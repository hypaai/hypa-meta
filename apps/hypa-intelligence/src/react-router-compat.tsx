/**
 * Re-exports from react-router-dom with type assertions to avoid
 * React 18 vs 19 type conflicts in the monorepo.
 */
import type { ComponentType } from "react";

import {
  Link as RouterLink,
  Outlet as RouterOutlet,
  Route as RouterRoute,
  Routes as RouterRoutes,
} from "react-router-dom";

export const Routes = RouterRoutes as ComponentType<any>;

export const Route = RouterRoute as ComponentType<any>;

export const Outlet = RouterOutlet as ComponentType<any>;

export const Link = RouterLink as ComponentType<any>;
