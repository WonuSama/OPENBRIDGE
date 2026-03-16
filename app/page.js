"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardOverviewTab } from "@/components/dashboard/overview-tab";
import { WorkspaceTab } from "@/components/dashboard/workspace-tab";
import { EditorModal } from "@/components/dashboard/editor-modal";
import { DiagnosticsTab } from "@/components/dashboard/diagnostics-tab";
import { MultiagentsTab } from "@/components/dashboard/multiagents-tab";
import { SettingsModal } from "@/components/dashboard/settings-modal";
import { SettingsTab } from "@/components/dashboard/settings-tab";
import { SkillsTab } from "@/components/dashboard/skills-tab";
import { NOTES_STORAGE_KEY, SIDEBAR_STORAGE_KEY, USER_STORAGE_KEY } from "@/components/dashboard/constants";
import { api, parseDiagnostics } from "@/components/dashboard/utils";

export default function Page() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [multiagentsView, setMultiagentsView] = useState("team");
  const [scope, setScope] = useState("workspace");
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "Usuario", role: "Operador", initials: "US" });
  const [draftProfile, setDraftProfile] = useState({ name: "Usuario", role: "Operador" });
  const [notes, setNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [health, setHealth] = useState({ loading: true, ok: false, output: "" });
  const [systemStats, setSystemStats] = useState({ disk: {}, mem: {}, cpu: {}, connection: {} });
  const [stats, setStats] = useState({ totalFiles: 0, totalDirs: 0, totalSize: 0, largest: [], recent: [] });
  const [tree, setTree] = useState({ currentPath: "", parentPath: null, items: [] });
  const [selectedFile, setSelectedFile] = useState("");
  const [fileData, setFileData] = useState({ path: "", content: "", isText: false, mimeType: "", size: 0 });
  const [loadingTree, setLoadingTree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setupData, setSetupData] = useState(null);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tree.items;
    return tree.items.filter((item) => item.name.toLowerCase().includes(normalized) || item.path.toLowerCase().includes(normalized));
  }, [query, tree.items]);

  const diagnostics = useMemo(() => parseDiagnostics(health.output), [health.output]);
  const largestItems = useMemo(() => stats.largest.slice(0, 6), [stats.largest]);
  const statusLabel = health.loading ? "Verificando" : health.ok ? "Activo" : "Atencion";

  async function loadHealth() {
    try {
      setHealth((current) => ({ ...current, loading: true }));
      const data = await api("/api/health");
      const ok = /Gateway reachable|configured, running|active/.test(data.output || "");
      setHealth({ loading: false, ok, output: data.output || "" });
    } catch (err) {
      setHealth({ loading: false, ok: false, output: err.message });
    }
  }

  async function loadStats(currentScope = scope) {
    const data = await api(`/api/workspace/stats?scope=${encodeURIComponent(currentScope)}`);
    setStats(data);
  }

  async function loadSystemStats() {
    const data = await api("/api/system/stats");
    setSystemStats(data);
  }

  async function loadTree(currentPath = "", currentScope = scope) {
    setLoadingTree(true);
    try {
      const data = await api(`/api/workspace/tree?scope=${encodeURIComponent(currentScope)}&path=${encodeURIComponent(currentPath)}`);
      setTree(data);
    } finally {
      setLoadingTree(false);
    }
  }

  async function loadSetup() {
    const data = await api("/api/setup");
    setSetupData(data);
    return data;
  }

  async function openFile(path, customScope = scope) {
    const data = await api(`/api/workspace/file?scope=${encodeURIComponent(customScope)}&path=${encodeURIComponent(path)}`);
    setSelectedFile(path);
    setFileData(data);
    setEditorOpen(true);
  }

  async function saveFile() {
    if (!selectedFile || !fileData.isText) return;
    try {
      setSaving(true);
      await api("/api/workspace/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, path: selectedFile, content: fileData.content }),
      });
      await Promise.all([loadStats(scope), loadTree(tree.currentPath, scope)]);
    } finally {
      setSaving(false);
    }
  }

  async function refreshAll(currentScope = scope, currentPath = tree.currentPath) {
    setRefreshing(true);
    setError("");
    try {
      await Promise.all([loadHealth(), loadStats(currentScope), loadTree(currentPath, currentScope), loadSystemStats()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const nextTab = params.get("tab");
      const nextMultiagents = params.get("multiagents");
      if (nextTab) setActiveTab(nextTab);
      if (nextMultiagents) setMultiagentsView(nextMultiagents);

      const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const name = parsed.name || "Usuario";
        const role = parsed.role || "Operador";
        setUserProfile({ name, role, initials: name.slice(0, 2).toUpperCase() });
        setDraftProfile({ name, role });
      }

      const storedSidebar = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (storedSidebar) setSidebarCollapsed(storedSidebar === "collapsed");

      const storedNotes = window.localStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes) setNotes(JSON.parse(storedNotes));
      else {
        setNotes([
          { id: "seed-1", title: "Revisar actividad del bot", detail: "Confirmar que Telegram sigue respondiendo con normalidad.", done: false },
          { id: "seed-2", title: "Validar archivos criticos", detail: "Controlar cambios recientes en el workspace antes de editar.", done: false },
        ]);
      }
    } catch {}

    Promise.all([refreshAll(scope, ""), loadSetup()])
      .then(([, setup]) => {
        if (!setup?.config?.onboardingCompleted) setSettingsOpen(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadSystemStats().catch(() => {});
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (activeTab === "workspace" && scope !== "state") {
      setScope("state");
      refreshAll("state", "");
      return;
    }
    if (activeTab === "dashboard" && scope !== "workspace") {
      setScope("workspace");
      refreshAll("workspace", "");
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
    } catch {}
  }, [userProfile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "collapsed" : "expanded");
    } catch {}
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  function saveUserProfile() {
    const cleanName = draftProfile.name.trim() || "Usuario";
    const cleanRole = draftProfile.role.trim() || "Operador";
    setUserProfile({ name: cleanName, role: cleanRole, initials: cleanName.slice(0, 2).toUpperCase() });
  }

  function addNote() {
    const value = noteDraft.trim();
    if (!value) return;
    setNotes((current) => [{ id: `${Date.now()}`, title: value, detail: "Recordatorio personal guardado localmente en este navegador.", done: false }, ...current]);
    setNoteDraft("");
  }

  function toggleNote(id) {
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, done: !note.done } : note)));
  }

  async function handleRefreshSetup() {
    const data = await loadSetup();
    await refreshAll(scope, tree.currentPath);
    return data;
  }

  return (
    <div className="min-h-screen bg-transparent text-neutral-950">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400">Ir al contenido principal</a>

      <div className={`grid min-h-screen w-full ${sidebarCollapsed ? "lg:grid-cols-[92px_minmax(0,1fr)]" : "lg:grid-cols-[300px_minmax(0,1fr)]"}`}>
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          multiagentsView={multiagentsView}
          setMultiagentsView={setMultiagentsView}
          onOpenSettings={() => {
            if (setupData?.config?.onboardingCompleted) setActiveTab("settings");
            else setSettingsOpen(true);
          }}
          setupReady={!!setupData?.config?.onboardingCompleted}
          userProfile={userProfile}
          draftProfile={draftProfile}
          setDraftProfile={setDraftProfile}
          saveUserProfile={saveUserProfile}
          refreshing={refreshing}
          onRefresh={() => refreshAll(scope, tree.currentPath)}
        />

        <main id="main-content" className="min-w-0 pr-4 pt-5 pb-5 pl-2 lg:pr-6 lg:pt-6 lg:pb-6 lg:pl-3">
          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="mt-2 space-y-6 lg:mt-0">
            {activeTab === "dashboard" ? <DashboardOverviewTab userProfile={userProfile} health={health} scope={scope} stats={stats} loadingTree={loadingTree} filteredItems={filteredItems} setActiveTab={setActiveTab} loadTree={loadTree} openFile={openFile} notes={notes} noteDraft={noteDraft} setNoteDraft={setNoteDraft} addNote={addNote} toggleNote={toggleNote} setEditorOpen={setEditorOpen} systemStats={systemStats} /> : null}
            {activeTab === "workspace" ? <WorkspaceTab tree={tree} scope={scope} loadTree={loadTree} filteredItems={filteredItems} openFile={openFile} largestItems={largestItems} /> : null}
            {activeTab === "multiagents" ? <MultiagentsTab view={multiagentsView} onChangeView={setMultiagentsView} /> : null}
            {activeTab === "skills" ? <SkillsTab /> : null}
            {activeTab === "diagnostics" ? <DiagnosticsTab health={health} diagnostics={diagnostics} statusLabel={statusLabel} /> : null}
            {activeTab === "settings" ? <SettingsTab setupData={setupData} refreshSetup={handleRefreshSetup} onCompleted={() => loadSetup()} /> : null}
          </div>
        </main>
      </div>

      <EditorModal open={editorOpen} onClose={() => setEditorOpen(false)} selectedFile={selectedFile} fileData={fileData} saveFile={saveFile} saving={saving} setFileData={setFileData} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} setupData={setupData} refreshSetup={handleRefreshSetup} onCompleted={async () => {
        await loadSetup();
        setActiveTab("settings");
        setSettingsOpen(false);
      }} />
    </div>
  );
}
