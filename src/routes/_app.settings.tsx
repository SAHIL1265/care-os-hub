import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  User, Globe, Watch, Camera, Image as ImageIcon, Pencil, Save, X, Bluetooth,
  BluetoothOff, BatteryMedium, Bell, BellOff, Loader2, Plus, Palette, Trash2, Send,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { ReportCamera } from "@/components/report-camera";
import { useTheme } from "@/components/theme-provider";
import { useI18n } from "@/lib/i18n";
import { LANGUAGES, getLanguageMeta, type LanguageCode } from "@/lib/i18n-languages";
import {
  AVATAR_ACCEPT, BLOOD_GROUPS, compressAvatar, initialsFrom, isValidEmail,
  validateImage, type UserProfile,
} from "@/lib/profile-helpers";
import {
  DEVICE_TYPES, DeviceError, bluetoothSupport, deliverNotification, disconnectDevice,
  readBattery, requestBluetoothDevice, trackDevice,
  type DeviceType, type Transport, type UserDevice,
} from "@/lib/devices";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Sahara Health" },
      { name: "description", content: "Manage your Sahara profile, app language and connected health devices." },
      { property: "og:title", content: "Settings · Sahara Health" },
      { property: "og:description", content: "Profile, language and connected devices for your Sahara health workspace." },
    ],
  }),
  component: SettingsPage,
});

type FormState = {
  full_name: string;
  email: string;
  age: string;
  blood_group: string;
};

function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ full_name: "", email: "", age: "", blood_group: "" });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [editingLanguage, setEditingLanguage] = useState(false);
  const [draftLanguage, setDraftLanguage] = useState<LanguageCode>(language);
  const [savingLanguage, setSavingLanguage] = useState(false);

  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState<UserDevice | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: "", vendor: "", device_type: "watch" as DeviceType });

  const btSupport = useMemo(() => bluetoothSupport(), []);

  useEffect(() => setDraftLanguage(language), [language]);

  const signedAvatar = useCallback(async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }, []);

  const loadDevices = useCallback(async (uid: string) => {
    setDevicesLoading(true);
    const { data, error } = await supabase
      .from("user_devices").select("*").eq("user_id", uid).order("created_at", { ascending: true });
    if (error) toast.error("Could not load your devices.");
    setDevices((data ?? []) as unknown as UserDevice[]);
    setDevicesLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || !active) { setLoading(false); return; }
      setUserId(user.id);

      const { data: row, error } = await supabase
        .from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) toast.error("Could not load your profile.");

      const next: UserProfile = (row as unknown as UserProfile) ?? {
        id: user.id, full_name: null, email: user.email ?? null,
        age: null, blood_group: null, avatar_path: null, language,
      };
      if (!active) return;
      setProfile(next);
      setForm({
        full_name: next.full_name ?? "",
        email: next.email ?? user.email ?? "",
        age: next.age?.toString() ?? "",
        blood_group: next.blood_group ?? "",
      });
      setAvatarUrl(await signedAvatar(next.avatar_path));
      setEditingProfile(!row);
      setLoading(false);
      void loadDevices(user.id);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDevices, signedAvatar]);

  function pickImage(file: File) {
    const problem = validateImage(file);
    if (problem === "type") { toast.error(t("profile.imageType")); return; }
    if (problem === "size") { toast.error(t("profile.imageTooLarge")); return; }
    void (async () => {
      const blob = await compressAvatar(file);
      setAvatarBlob(blob);
      setAvatarPreview(URL.createObjectURL(blob));
      setEditingProfile(true);
    })();
  }

  async function saveProfile() {
    if (!userId) return;
    if (!form.full_name.trim()) { toast.error(t("profile.nameRequired")); return; }
    if (!isValidEmail(form.email)) { toast.error(t("profile.invalidEmail")); return; }
    const ageValue = form.age.trim() === "" ? null : Number(form.age);
    if (ageValue !== null && (!Number.isFinite(ageValue) || ageValue < 0 || ageValue > 130)) {
      toast.error(t("profile.invalidAge")); return;
    }

    setSaving(true);
    try {
      let avatarPath = profile?.avatar_path ?? null;
      if (avatarBlob) {
        const path = `${userId}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars").upload(path, avatarBlob, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw uploadError;
        if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
        avatarPath = path;
      }

      const payload = {
        id: userId,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        age: ageValue,
        blood_group: form.blood_group || null,
        avatar_path: avatarPath,
        language,
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      setProfile(payload as UserProfile);
      setAvatarBlob(null);
      setAvatarPreview(null);
      setAvatarUrl(await signedAvatar(avatarPath));
      setEditingProfile(false);
      toast.success(t("profile.savedOk"));
    } catch (err) {
      toast.error((err as Error)?.message ?? "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLanguage() {
    setSavingLanguage(true);
    setLanguage(draftLanguage);
    try {
      if (userId) {
        const { error } = await supabase.from("profiles")
          .upsert({ id: userId, language: draftLanguage, email: profile?.email ?? form.email || null });
        if (error) throw error;
      }
      setEditingLanguage(false);
      toast.success(t("language.savedOk"));
    } catch {
      toast.error("Language saved on this device, but we couldn't sync it to your account.");
      setEditingLanguage(false);
    } finally {
      setSavingLanguage(false);
    }
  }

  async function pairBluetooth() {
    if (!userId) return;
    setPairing(true);
    try {
      const paired = await requestBluetoothDevice();
      const guessedType: DeviceType = /watch/i.test(paired.name)
        ? "watch" : /band|fit/i.test(paired.name) ? "band"
        : /buds|pods|headset|earphone/i.test(paired.name) ? "earbuds" : "other";

      const { data, error } = await supabase.from("user_devices").insert({
        user_id: userId,
        name: paired.name,
        device_type: guessedType,
        transport: "bluetooth" satisfies Transport,
        device_key: paired.key,
        status: "connected",
        battery_level: paired.batteryLevel,
        supports_notifications: paired.supportsNotifications,
        last_connected_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      const record = data as unknown as UserDevice;
      trackDevice(record.id, paired.raw, () => {
        setDevices((prev) => prev.map((d) => (d.id === record.id ? { ...d, status: "disconnected" } : d)));
        void supabase.from("user_devices").update({ status: "disconnected" }).eq("id", record.id);
        toast.warning(`${record.name} disconnected`);
      });
      setDevices((prev) => [...prev, record]);
      toast.success(`${record.name} connected`);
    } catch (err) {
      if (err instanceof DeviceError) {
        if (err.code === "denied") toast.error(t("devices.permissionDenied"));
        else if (err.code === "not_found") toast.error(t("devices.notFound"));
        else if (err.code === "insecure" || err.code === "unsupported") toast.error(t("devices.unsupported"));
        else toast.error(err.message);
      } else {
        toast.error((err as Error)?.message ?? "Could not pair the device.");
      }
    } finally {
      setPairing(false);
    }
  }

  async function addManualDevice() {
    if (!userId) return;
    if (!manual.name.trim()) { toast.error("Please enter a device name."); return; }
    const { data, error } = await supabase.from("user_devices").insert({
      user_id: userId,
      name: manual.name.trim(),
      vendor: manual.vendor.trim() || null,
      device_type: manual.device_type,
      transport: "manufacturer" satisfies Transport,
      status: "disconnected",
      supports_notifications: false,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setDevices((prev) => [...prev, data as unknown as UserDevice]);
    setManual({ name: "", vendor: "", device_type: "watch" });
    setManualOpen(false);
    toast.success("Device added. Connect it once its manufacturer integration is available.");
  }

  async function confirmDisconnect() {
    const device = pendingDisconnect;
    setPendingDisconnect(null);
    if (!device) return;
    await disconnectDevice(device.id);
    const { error } = await supabase.from("user_devices")
      .update({ status: "disconnected" }).eq("id", device.id);
    if (error) { toast.error(error.message); return; }
    setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, status: "disconnected" } : d)));
    toast.success(`${device.name} disconnected`);
  }

  async function removeDevice(device: UserDevice) {
    await disconnectDevice(device.id);
    const { error } = await supabase.from("user_devices").delete().eq("id", device.id);
    if (error) { toast.error(error.message); return; }
    setDevices((prev) => prev.filter((d) => d.id !== device.id));
    toast.success("Device removed");
  }

  async function toggleDeviceNotifications(device: UserDevice, value: boolean) {
    setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, notifications_enabled: value } : d)));
    const { error } = await supabase.from("user_devices")
      .update({ notifications_enabled: value }).eq("id", device.id);
    if (error) toast.error(error.message);
  }

  async function refreshBattery(device: UserDevice) {
    const level = await readBattery(device.id);
    if (level == null) { toast.info("This device doesn't report its battery level."); return; }
    setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, battery_level: level } : d)));
    await supabase.from("user_devices").update({ battery_level: level }).eq("id", device.id);
  }

  async function sendTestNotification(device: UserDevice) {
    const message = {
      title: "Doctor appointment",
      body: "Your appointment with Dr. Sharma is scheduled for 5:00 PM today.",
    };
    const route = await deliverNotification(message, device, (m) => toast(m.title, { description: m.body }));
    if (route === "device") toast.success(`Sent to ${device.name}`);
    else if (route === "system") toast.success("Sent to this device's notification centre");
  }

  const displayAvatar = avatarPreview ?? avatarUrl ?? undefined;
  const currentLanguage = getLanguageMeta(language);

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {/* Profile ------------------------------------------------------- */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>
              {t("profile.title")}
            </CardTitle>
            <CardDescription className="mt-1">{t("profile.desc")}</CardDescription>
          </div>
          {!loading && !editingProfile && (
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setEditingProfile(true)}>
              <Pencil className="h-4 w-4" />{t("profile.edit")}
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 ring-2 ring-primary/25">
                  <AvatarImage src={displayAvatar} alt={form.full_name || "Profile picture"} />
                  <AvatarFallback className="text-lg">{initialsFrom(form.full_name, form.email)}</AvatarFallback>
                </Avatar>

                {editingProfile ? (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <input
                      ref={fileRef} type="file" accept={AVATAR_ACCEPT} className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }}
                    />
                    <Button variant="secondary" className="gap-2" onClick={() => fileRef.current?.click()}>
                      <ImageIcon className="h-4 w-4" />{t("profile.gallery")}
                    </Button>
                    <Button variant="secondary" className="gap-2" onClick={() => setCameraOpen(true)}>
                      <Camera className="h-4 w-4" />{t("profile.camera")}
                    </Button>
                  </div>
                ) : (
                  <div className="min-w-0 text-center sm:text-left">
                    <div className="truncate text-lg font-semibold">{form.full_name || t("common.notSet")}</div>
                    <div className="truncate text-sm text-muted-foreground">{form.email || t("common.notSet")}</div>
                    <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <Badge variant="secondary">{t("profile.age")}: {form.age || t("common.notSet")}</Badge>
                      <Badge variant="secondary">{t("profile.bloodGroup")}: {form.blood_group || t("common.notSet")}</Badge>
                    </div>
                  </div>
                )}
              </div>

              {editingProfile && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-name">{t("profile.fullName")}</Label>
                      <Input id="profile-name" value={form.full_name} autoComplete="name"
                        onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-email">{t("profile.email")}</Label>
                      <Input id="profile-email" type="email" value={form.email} autoComplete="email"
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-age">{t("profile.age")}</Label>
                      <Input id="profile-age" type="number" min={0} max={130} value={form.age}
                        onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-blood">{t("profile.bloodGroup")}</Label>
                      <Select value={form.blood_group || undefined}
                        onValueChange={(v) => setForm((f) => ({ ...f, blood_group: v }))}>
                        <SelectTrigger id="profile-blood"><SelectValue placeholder={t("common.notSet")} /></SelectTrigger>
                        <SelectContent>
                          {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="gap-2" onClick={() => void saveProfile()} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? t("common.saving") : t("profile.save")}
                    </Button>
                    <Button variant="ghost" className="gap-2" disabled={saving}
                      onClick={() => {
                        setEditingProfile(false);
                        setAvatarBlob(null); setAvatarPreview(null);
                        setForm({
                          full_name: profile?.full_name ?? "", email: profile?.email ?? "",
                          age: profile?.age?.toString() ?? "", blood_group: profile?.blood_group ?? "",
                        });
                      }}>
                      <X className="h-4 w-4" />{t("common.cancel")}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Language ------------------------------------------------------ */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Globe className="h-4 w-4" />
              </span>
              {t("language.title")}
            </CardTitle>
            <CardDescription className="mt-1">{t("language.desc")}</CardDescription>
          </div>
          {!editingLanguage && (
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setEditingLanguage(true)}>
              <Pencil className="h-4 w-4" />{t("language.edit")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">{t("language.current")}</span>
            <span className="text-sm font-semibold">{currentLanguage.label} · {currentLanguage.english}</span>
          </div>

          {editingLanguage && (
            <div className="space-y-3">
              <Label htmlFor="language-select">{t("language.title")}</Label>
              <Select value={draftLanguage} onValueChange={(v) => setDraftLanguage(v as LanguageCode)}>
                <SelectTrigger id="language-select" className="w-full sm:w-80"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      <span style={{ fontFamily: l.font }}>{l.label}</span>
                      <span className="ml-2 text-muted-foreground">{l.english}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("language.hint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button className="gap-2" onClick={() => void saveLanguage()} disabled={savingLanguage}>
                  {savingLanguage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("language.save")}
                </Button>
                <Button variant="ghost" className="gap-2"
                  onClick={() => { setDraftLanguage(language); setEditingLanguage(false); }}>
                  <X className="h-4 w-4" />{t("common.cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected devices --------------------------------------------- */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <Watch className="h-4 w-4" />
              </span>
              {t("devices.title")}
            </CardTitle>
            <CardDescription className="mt-1">{t("devices.desc")}</CardDescription>
          </div>
          <Button size="sm" className="gap-2 shrink-0" onClick={() => void pairBluetooth()}
            disabled={pairing || btSupport !== "supported"}>
            {pairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
            {t("devices.add")}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {btSupport !== "supported" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <BluetoothOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>{t("devices.unsupported")}</p>
            </div>
          )}

          {devicesLoading ? (
            <div className="space-y-3"><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /></div>
          ) : devices.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              {t("devices.empty")}
            </div>
          ) : (
            <ul className="space-y-3">
              {devices.map((device) => {
                const typeLabel = DEVICE_TYPES.find((d) => d.value === device.device_type)?.labelKey ?? "devices.typeOther";
                const connected = device.status === "connected";
                return (
                  <li key={device.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold">{device.name}</span>
                          <Badge variant={connected ? "default" : "secondary"}>
                            {connected ? t("devices.connected") : t("devices.disconnected")}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{t(typeLabel)}</span>
                          <span>{t("devices.connection")}: {device.transport === "bluetooth" ? "Bluetooth" : t("devices.manufacturer")}</span>
                          {device.battery_level != null && (
                            <span className="inline-flex items-center gap-1">
                              <BatteryMedium className="h-3.5 w-3.5" />{t("devices.battery")}: {device.battery_level}%
                            </span>
                          )}
                          {device.vendor && <span>{device.vendor}</span>}
                          {device.last_connected_at && (
                            <span>{t("devices.lastConnected")}: {new Date(device.last_connected_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {device.transport === "bluetooth" && connected && (
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refreshBattery(device)}>
                            <BatteryMedium className="h-4 w-4" />{t("common.manage")}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void sendTestNotification(device)}>
                          <Send className="h-4 w-4" />{t("devices.test")}
                        </Button>
                        {connected ? (
                          <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setPendingDisconnect(device)}>
                            <BluetoothOff className="h-4 w-4" />{t("common.disconnect")}
                          </Button>
                        ) : device.transport === "bluetooth" ? (
                          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => void pairBluetooth()}>
                            <Bluetooth className="h-4 w-4" />{t("common.connect")}
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" aria-label={`${t("common.remove")} ${device.name}`}
                          className="min-h-9 min-w-9" onClick={() => void removeDevice(device)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {device.supports_notifications ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                        {device.supports_notifications ? t("devices.notifSupported") : t("devices.notifUnsupported")}
                      </span>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`notif-${device.id}`} className="text-xs text-muted-foreground">
                          {t("devices.notifications")}
                        </Label>
                        <Switch id={`notif-${device.id}`} checked={device.notifications_enabled}
                          onCheckedChange={(v) => void toggleDeviceNotifications(device, v)} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{t("devices.manufacturer")}</div>
                <p className="text-xs text-muted-foreground">{t("devices.manufacturerDesc")}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setManualOpen((v) => !v)}>
                <Plus className="h-4 w-4" />{manualOpen ? t("common.cancel") : t("common.connect")}
              </Button>
            </div>

            {manualOpen && (
              <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manual-name">Device name</Label>
                  <Input id="manual-name" value={manual.name} placeholder="Fitbit Charge 6"
                    onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-vendor">Manufacturer</Label>
                  <Input id="manual-vendor" value={manual.vendor} placeholder="Fitbit"
                    onChange={(e) => setManual((m) => ({ ...m, vendor: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-type">Device type</Label>
                  <Select value={manual.device_type} onValueChange={(v) => setManual((m) => ({ ...m, device_type: v as DeviceType }))}>
                    <SelectTrigger id="manual-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{t(d.labelKey)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Button className="gap-2" onClick={() => void addManualDevice()}>
                    <Plus className="h-4 w-4" />Add device
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appearance ----------------------------------------------------- */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-muted"><Palette className="h-4 w-4" /></span>
            Appearance
          </CardTitle>
          <CardDescription>Switch between the light and dark healthcare themes.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <Label htmlFor="dark-mode" className="text-sm">Dark mode</Label>
          <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </CardContent>
      </Card>

      <ReportCamera
        open={cameraOpen}
        title={t("profile.camera")}
        hint="Center your face in the frame and make sure the light is good."
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => { setCameraOpen(false); pickImage(file); }}
        onUploadInstead={() => { setCameraOpen(false); fileRef.current?.click(); }}
      />

      <AlertDialog open={!!pendingDisconnect} onOpenChange={(open) => { if (!open) setPendingDisconnect(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("devices.disconnectConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("devices.disconnectConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDisconnect()}>{t("common.disconnect")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
