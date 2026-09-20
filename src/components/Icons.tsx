import type { ReactNode } from 'react'

const Icon = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
export const CopyIcon = () => <Icon><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Icon>
export const DownloadIcon = () => <Icon><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></Icon>
export const CloseIcon = () => <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>
export const SunIcon = () => <Icon><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></Icon>
export const MoonIcon = () => <Icon><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></Icon>
export const RotateIcon = () => <Icon><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></Icon>
export const TrashIcon = () => <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Icon>
export const UndoIcon = () => <Icon><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Icon>
export const RedoIcon = () => <Icon><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Icon>
export const DuplicateIcon = () => <Icon><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></Icon>
export const FitIcon = () => <Icon><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Icon>
export const PrintIcon = () => <Icon><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v6H7z" /></Icon>
export const WarnIcon = () => <Icon><path d="M12 4 3 20h18L12 4Z" /><path d="M12 10v4M12 17.5v.01" /></Icon>
export const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>
export const MinusIcon = () => <Icon><path d="M5 12h14" /></Icon>
export const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.76 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
)

export const CursorIcon = () => <Icon><path d="M5 3l14 7-6 2-2 7z" /></Icon>
export const HandIcon = () => <Icon><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2 7-6 7-3 0-4.5-1.5-6-4l-1.3-2.6a1.4 1.4 0 0 1 2.4-1.4L8 14" /></Icon>
export const FlipHIcon = () => <Icon><path d="M12 3v18" strokeDasharray="2 2.5" /><path d="M9 7 3 17h6z" /><path d="M15 7l6 10h-6z" /></Icon>
export const FlipVIcon = () => <Icon><path d="M3 12h18" strokeDasharray="2 2.5" /><path d="M7 9h10l-5-6z" /><path d="M7 15h10l-5 6z" /></Icon>
export const AlignLeftIcon = () => <Icon><path d="M4 4v16M8 8h12M8 14h7" /></Icon>
export const AlignCenterIcon = () => <Icon><path d="M12 3v18M6 8h12M8 14h8" /></Icon>
export const AlignRightIcon = () => <Icon><path d="M20 4v16M4 8h12M9 14h7" /></Icon>
export const AlignTopIcon = () => <Icon><path d="M4 4h16M8 8v12M14 8v7" /></Icon>
export const AlignMiddleIcon = () => <Icon><path d="M3 12h18M8 6v12M14 8v8" /></Icon>
export const AlignBottomIcon = () => <Icon><path d="M4 20h16M8 4v12M14 9v7" /></Icon>
export const DistributeHIcon = () => <Icon><path d="M4 4v16M20 4v16M10 8h4v8h-4z" /></Icon>
export const DistributeVIcon = () => <Icon><path d="M4 4h16M4 20h16M8 10h8v4H8z" /></Icon>