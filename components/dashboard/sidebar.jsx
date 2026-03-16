import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import KeyboardDoubleArrowLeftRounded from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRounded from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import { menu } from "@/components/dashboard/constants";
import { NavButton } from "@/components/dashboard/shared";
import { DashboardSidebarControls } from "@/components/dashboard/sidebar-controls";
import { cn } from "@/lib/utils";

const multiagentMenu = [{ id: "team", label: "Equipo" }];
const sections = [
  { id: "main", label: "Workspace", items: ["dashboard", "workspace", "multiagents", "skills"] },
  { id: "system", label: "System", items: ["diagnostics"] },
];

function BrandMark() {
  return <img src="/openbridge.png" alt="OPENBRIDGE" className="h-10 w-10 rounded-[12px] object-cover" />;
}

export function DashboardSidebar({ activeTab, setActiveTab, collapsed, setCollapsed, multiagentsView, setMultiagentsView, onOpenSettings, setupReady, userProfile, draftProfile, setDraftProfile, saveUserProfile, refreshing, onRefresh }) {
  const menuMap = new Map(menu.map((item) => [item.id, item]));

  return (
    <aside className="sticky top-0 self-start pl-2 pr-2 py-4 lg:h-screen lg:pl-2 lg:pr-3 lg:py-5">
      <div className={cn("flex min-h-[calc(100vh-2rem)] flex-col border border-[#262a31] bg-[#181a20] p-3 text-white shadow-[0_16px_48px_rgba(7,10,18,0.18)] lg:h-[calc(100vh-2.5rem)] lg:min-h-0", "rounded-[18px]", collapsed && "items-center")}>
        <div className={cn("flex w-full", collapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-3")}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-white">OPENBRIDGE</div>
              </div>
            </div>
          ) : (
            <BrandMark />
          )}

          <button type="button" onClick={() => setCollapsed((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/6 text-white/74 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label={collapsed ? "Expandir sidebar" : "Plegar sidebar"}>
            {collapsed ? <KeyboardDoubleArrowRightRounded sx={{ fontSize: 18 }} /> : <KeyboardDoubleArrowLeftRounded sx={{ fontSize: 18 }} />}
          </button>
        </div>

        <nav className={cn("mt-6 w-full flex-1", collapsed ? "space-y-3" : "space-y-5")}>
          {sections.map((section) => (
            <div key={section.id} className="w-full">
              {!collapsed ? <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/28">{section.label}</div> : null}
              <div className={cn("space-y-1.5", !collapsed && "rounded-[14px] border border-white/6 bg-[#15171c] p-2")}>
                {section.items.map((itemId) => {
                  const item = menuMap.get(itemId);
                  if (!item) return null;
                  return (
                    <div key={item.id} className={collapsed ? "flex justify-center" : "block"}>
                      <div className={collapsed ? "w-10" : "w-full"}>
                        <NavButton active={activeTab === item.id} icon={item.icon} label={item.label} compact={collapsed} onClick={() => setActiveTab(item.id)} />
                      </div>
                      {!collapsed && item.id === "multiagents" && activeTab === "multiagents" ? (
                        <div className="mt-1 space-y-1 pl-11 pr-2">
                          {multiagentMenu.map((subitem) => (
                            <button key={subitem.id} type="button" onClick={() => setMultiagentsView(subitem.id)} className={cn("block w-full rounded-[10px] px-3 py-2 text-left text-sm transition-colors", multiagentsView === subitem.id ? "bg-white/10 text-white" : "text-white/54 hover:bg-white/6 hover:text-white/84")}>
                              {subitem.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {!collapsed ? (
          <a
            href="https://www.playclaw.info"
            target="_blank"
            rel="noreferrer"
            className="mb-3 overflow-hidden rounded-[14px] border border-white/8 bg-[linear-gradient(135deg,#252832_0%,#181b22_100%)] transition-transform hover:-translate-y-[1px]"
          >
            <div className="flex h-[70px] items-stretch">
              <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/42">
                  <AutoAwesomeRounded sx={{ fontSize: 13 }} />
                  Optimization
                </div>
                <div className="mt-1 text-[12px] font-semibold leading-4 text-white">¿Dudas de tu agente?</div>
                <div className="whitespace-nowrap text-[13px] font-semibold leading-4 tracking-tight text-white/92">¡Haz un análisis y mejóralo!</div>
              </div>
              <div className="w-[88px] shrink-0 bg-[radial-gradient(circle_at_70%_25%,rgba(255,255,255,0.08),transparent_45%)]">
                <img src="/LobGirl%20(12).png" alt="Ilustración decorativa" className="h-full w-full object-contain object-center [image-rendering:auto]" />
              </div>
            </div>
          </a>
        ) : null}

        <div className={cn("mb-3 w-full", collapsed ? "flex justify-center" : "") }>
          <DashboardSidebarControls
            collapsed={collapsed}
            userProfile={userProfile}
            draftProfile={draftProfile}
            setDraftProfile={setDraftProfile}
            saveUserProfile={saveUserProfile}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpenSettings={onOpenSettings}
          />
        </div>
      </div>
    </aside>
  );
}

