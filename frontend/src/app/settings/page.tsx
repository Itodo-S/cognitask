"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface Settings {
  theme: "paper" | "dark";
  aiEnabled: boolean;
  aiProvider: "claude" | "openai";
  backendUrl: string;
}

const defaults: Settings = {
  theme: "paper",
  aiEnabled: true,
  aiProvider: "claude",
  backendUrl: "http://localhost:3001",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("cognitask-settings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      localStorage.setItem("cognitask-settings", JSON.stringify(settings));
      toast("Settings saved");
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title="Settings" subtitle="Configure your CogniTask experience" />

      <div className="max-w-2xl space-y-6">
        {/* Appearance */}
        <Card>
          <CardContent>
            <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4">Appearance</h2>
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-sm font-medium text-ink-700">Theme</label>
              <div className="flex gap-3">
                {(["paper", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSettings((s) => ({ ...s, theme: t }))}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      settings.theme === t
                        ? "border-ink-900 bg-ink-50"
                        : "border-ink-200 bg-paper-50 hover:border-ink-300"
                    }`}
                  >
                    <div className={`w-full h-8 rounded mb-2 ${t === "paper" ? "bg-paper-50 border border-ink-200" : "bg-ink-900"}`} />
                    <span className="font-sans text-sm text-ink-700 capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardContent>
            <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4">AI Assistant</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-sm font-medium text-ink-700">Enable AI</p>
                  <p className="font-sans text-xs text-ink-400">Turn the AI assistant on or off</p>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, aiEnabled: !s.aiEnabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.aiEnabled ? "bg-ink-900" : "bg-ink-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-paper-50 rounded-full transition-transform shadow ${
                      settings.aiEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <Input
                label="Backend URL"
                value={settings.backendUrl}
                onChange={(e) => setSettings((s) => ({ ...s, backendUrl: e.target.value }))}
                placeholder="http://localhost:3001"
                hint="URL of the CogniTask backend server"
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardContent>
            <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4">Danger Zone</h2>
            <p className="font-sans text-sm text-ink-500 mb-4">
              These actions cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => { localStorage.clear(); toast("Local data cleared"); }}>
                Clear Local Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
