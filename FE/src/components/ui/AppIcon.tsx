import type { ReactNode } from "react";

interface AppIconProps {
  name:
    | "home"
    | "bookmark"
    | "chat"
    | "bell"
    | "user"
    | "briefcase"
    | "list"
    | "menu"
    | "location"
    | "check"
    | "edit"
    | "logout"
    | "plus"
    | "calendar"
    | "clock"
    | "image"
    | "trash"
    | "close"
    | "users"
    | "refresh"
    | "send"
    | "save"
    | "search"
    | "filter"
    | "star"
    | "heart"
    | "arrow-left"
    | "chevron-left"
    | "chevron-right"
    | "undo"
    | "info";
  className?: string;
}

const paths: Record<AppIconProps["name"], ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5"/><path d="M9.5 21v-6h5v6"/></>,
  bookmark: <path d="M6 4.5h12v16l-6-3.7-6 3.7z"/>,
  chat: <><path d="M4 5h16v12H9l-5 4z"/><path d="M8 9h8M8 13h5"/></>,
  bell: <><path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5z"/><path d="M10 20h4"/></>,
  user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  location: <><path d="M12 22s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13Z"/><circle cx="12" cy="9" r="2.3"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z"/><path d="m13.8 6.7 3.5 3.5"/></>,
  logout: <><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4M18 12H9"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 3-3 5 5"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/><path d="M10 11v6M14 11v6"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  users: <><circle cx="9" cy="9" r="3"/><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6"/><path d="M15 6.5a3 3 0 0 1 0 5.5M16 14c2.7.4 4.1 2.3 4.5 6"/></>,
  refresh: <><path d="M20 7v5h-5"/><path d="M18.5 16a8 8 0 1 1 .5-8.5L20 12"/></>,
  send: <><path d="m3 11 18-8-8 18-2-8z"/><path d="m11 13 5-5"/></>,
  save: <><path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="12" cy="18" r="1"/></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>,
  heart: <path d="M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>,
  "arrow-left": <><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></>,
  "chevron-left": <path d="m15 18-6-6 6-6"/>,
  "chevron-right": <path d="m9 18 6-6-6-6"/>,
  undo: <><path d="M9 7H4v-5"/><path d="M4 7a9 9 0 1 1-1 7"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
};

export function AppIcon({ name, className = "" }: AppIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
