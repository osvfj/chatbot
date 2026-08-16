import { useEffect, useState } from "react";
import { useAtom } from "@effect/atom-react";
import { Settings2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cafebot/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cafebot/ui/components/dialog";
import { Input } from "@cafebot/ui/components/input";
import { Label } from "@cafebot/ui/components/label";
import { SidebarMenuButton } from "@cafebot/ui/components/sidebar";
import { useMessages } from "../../lib/use-language";
import {
  ZEN_MODELS,
  defaultZenModel,
  persistZenAccount,
  persistZenApiKey,
  persistZenModel,
  zenAccountAtom,
  zenApiKeyAtom,
  zenModelAtom,
  type ZenAccount,
} from "../../lib/zen-settings";

export function ZenSettingsDialog() {
  const m = useMessages();
  const [storedApiKey, setZenApiKey] = useAtom(zenApiKeyAtom);
  const [storedModel, setZenModel] = useAtom(zenModelAtom);
  const [storedAccount, setZenAccount] = useAtom(zenAccountAtom);
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [account, setAccount] = useState<ZenAccount>("zen");

  useEffect(() => {
    if (open) {
      setApiKey(storedApiKey);
      setAccount(storedAccount);
      const valid = ZEN_MODELS.some((entry) => entry[storedAccount] && entry.id === storedModel);
      setModel(valid ? storedModel : defaultZenModel(storedAccount));
    }
  }, [open, storedApiKey, storedAccount, storedModel]);

  const handleAccountChange = (next: ZenAccount): void => {
    setAccount(next);
    const stillValid = ZEN_MODELS.some((entry) => entry[next] && entry.id === model);
    if (!stillValid) {
      setModel(defaultZenModel(next));
    }
  };

  const handleSave = (): void => {
    const trimmed = apiKey.trim();
    setZenApiKey(trimmed);
    setZenModel(model);
    setZenAccount(account);
    persistZenApiKey(trimmed);
    persistZenModel(model);
    persistZenAccount(account);
    setOpen(false);
    toast.success(m.settingsSaved());
  };

  const availableModels = ZEN_MODELS.filter((entry) => entry[account]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SidebarMenuButton size="lg" tooltip={m.tooltipSettings()} onClick={() => setOpen(true)}>
        <Settings2Icon />
        <span>{m.tooltipSettings()}</span>
      </SidebarMenuButton>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.settingsZenTitle()}</DialogTitle>
          <DialogDescription>{m.settingsZenModelHint()}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zen-account">{m.settingsZenAccountLabel()}</Label>
            <select
              id="zen-account"
              value={account}
              onChange={(event) => handleAccountChange(event.target.value as ZenAccount)}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="zen">{m.settingsZenAccountZen()}</option>
              <option value="go">{m.settingsZenAccountGo()}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zen-api-key">{m.settingsZenApiKeyLabel()}</Label>
            <Input
              id="zen-api-key"
              type="password"
              placeholder={m.settingsZenApiKeyPlaceholder()}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zen-model">{m.settingsZenModelLabel()}</Label>
            <select
              id="zen-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {availableModels.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.id} ·{" "}
                  {entry.paid ? m.settingsZenModelPaidTag() : m.settingsZenModelFreeTag()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>{m.settingsSave()}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
