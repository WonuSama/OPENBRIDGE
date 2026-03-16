"use client";

import { SettingsFlow } from "@/components/dashboard/settings-flow";

export function SettingsModal({ open, onClose, setupData, refreshSetup, onCompleted }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-[rgba(242,244,247,0.82)] backdrop-blur-[8px]">
      <div className="flex min-h-full items-center justify-center px-4 py-4 lg:px-6 lg:py-6">
        <div className="w-full max-w-[min(1120px,100vw-2rem)]">
          <SettingsFlow
            setupData={setupData}
            refreshSetup={refreshSetup}
            onCompleted={onCompleted || onClose}
            onCancel={onClose}
            finishLabel="Finalizar configuracion"
            allowClose
          />
        </div>
      </div>
    </div>
  );
}
