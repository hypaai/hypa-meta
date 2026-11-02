/**
 * Re-exports from lucide-react with type assertions to avoid
 * React 18 vs 19 type conflicts in the monorepo.
 */
import type { ComponentType } from "react";

import * as L from "lucide-react";

export type LucideProps = L.LucideProps;
const asIcon = (C: unknown) => C as ComponentType<L.LucideProps>;

export const AlertCircle = asIcon(L.AlertCircle);
export const ArrowRight = asIcon(L.ArrowRight);
export const ArrowUpRight = asIcon(L.ArrowUpRight);
export const Bookmark = asIcon(L.Bookmark);
export const BookmarkX = asIcon(L.BookmarkX);
export const BookOpen = asIcon(L.BookOpen);
export const Check = asIcon(L.Check);
export const ChevronDown = asIcon(L.ChevronDown);
export const Cpu = asIcon(L.Cpu);
export const Database = asIcon(L.Database);
export const Download = asIcon(L.Download);
export const Edit3 = asIcon(L.Edit3);
export const ExternalLink = asIcon(L.ExternalLink);
export const Eye = asIcon(L.Eye);
export const EyeOff = asIcon(L.EyeOff);
export const Globe = asIcon(L.Globe);
export const Grid3X3 = asIcon(L.Grid3X3);
export const History = asIcon(L.History);
export const Home = asIcon(L.Home);
export const Info = asIcon(L.Info);
export const Loader2 = asIcon(L.Loader2);
export const Lock = asIcon(L.Lock);
export const LogIn = asIcon(L.LogIn);
export const LogOut = asIcon(L.LogOut);
export const Mail = asIcon(L.Mail);
export const MessageSquare = asIcon(L.MessageSquare);
export const Monitor = asIcon(L.Monitor);
export const Moon = asIcon(L.Moon);
export const Languages = asIcon(L.Languages);
export const Palette = asIcon(L.Palette);
export const Play = asIcon(L.Play);
export const Search = asIcon(L.Search);
export const SearchX = asIcon(L.SearchX);
export const Settings = asIcon(L.Settings);
export const Sparkles = asIcon(L.Sparkles);
export const Square = asIcon(L.Square);
export const Star = asIcon(L.Star);
export const Sun = asIcon(L.Sun);
export const Trash2 = asIcon(L.Trash2);
export const User = asIcon(L.User);
export const Users = asIcon(L.Users);
export const Volume2 = asIcon(L.Volume2);
export const X = asIcon(L.X);
