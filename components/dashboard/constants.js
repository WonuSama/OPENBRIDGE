import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import MonitorHeartRounded from "@mui/icons-material/MonitorHeartRounded";
import SpaceDashboardRounded from "@mui/icons-material/SpaceDashboardRounded";
import GroupWorkRounded from "@mui/icons-material/GroupWorkRounded";
import ExtensionRounded from "@mui/icons-material/ExtensionRounded";

export const menu = [
  { id: "dashboard", label: "Resumen", icon: SpaceDashboardRounded },
  { id: "workspace", label: "Explorador", icon: FolderOpenRounded },
  { id: "multiagents", label: "Multiagentes", icon: GroupWorkRounded },
  { id: "skills", label: "Skills", icon: ExtensionRounded },
  { id: "diagnostics", label: "Salud", icon: MonitorHeartRounded },
];

export const USER_STORAGE_KEY = "openclaw-dashboard-user";
export const NOTES_STORAGE_KEY = "openclaw-dashboard-notes";
export const SIDEBAR_STORAGE_KEY = "openclaw-dashboard-sidebar";
