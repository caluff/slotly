"use client";

import { useAction, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs } from "radix-ui";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ChevronLeft, ChevronDown } from "@/components/ui/icons";
import { navigateWorkspace } from "@/components/dashboard-workspace";
import { openWorkspaceSection } from "@/components/workspace-panel";
import { useDraftWarning } from "@/components/use-draft-warning";
import { useLastDefined } from "@/components/use-last-defined";
import { PublicBookingSurface, PublicReservationFields, type ReservationFields } from "@/components/public-booking-presentation";
import { FormSkeleton } from "@/components/loading-screens";
import { dashboardHref } from "@/lib/dashboard-navigation";
import { isLocalDate } from "@/lib/local-date";
import { MAX_PUBLIC_PHOTO_BYTES, publicAppearanceSchema, publicThemes, type PrivatePublicAppearance, type PublicAppearanceSettings } from "@/lib/public-appearance";
import "@/components/public-appearance-editor.css";

type Command = { settings: PublicAppearanceSettings; expectedVersion: number; operationId: string; removePhoto: boolean; imageBytes?: ArrayBuffer };
type Photo = { bytes: ArrayBuffer; url: string };

export function PublicAppearanceEditor({ businessName, timeZone, enabled }: { businessName: string; timeZone: string; enabled: boolean }) {
  const profile = useLastDefined(useQuery(api.publicAppearance.getMy, enabled ? {} : "skip"));
  return profile ? <Editor initial={profile} latest={profile} businessName={businessName} timeZone={timeZone} enabled={enabled} /> : <div className="p-6"><FormSkeleton label="Cargando personalización" /></div>;
}

function Editor({ initial, latest, businessName, timeZone, enabled }: { initial: PrivatePublicAppearance; latest: PrivatePublicAppearance; businessName: string; timeZone: string; enabled: boolean }) {
  const [accepted, setAccepted] = useState(initial), [settings, setSettings] = useState(initial.settings);
  const [photo, setPhoto] = useState<Photo | null>(null), [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [pending, setPending] = useState<Command | null>(null);
  const [error, setError] = useState(""), [invalid, setInvalid] = useState<string | null>(null), [mobileTab, setMobileTab] = useState("edit");
  const form = useRef<HTMLFormElement>(null), heading = useRef<HTMLHeadingElement>(null), alert = useRef<HTMLParagraphElement>(null), lock = useRef(false), fileInput = useRef<HTMLInputElement>(null);
  const photoRequest = useRef(0), save = useAction(api.publicAppearance.save), params = useSearchParams();
  const dirty = JSON.stringify(settings) !== JSON.stringify(accepted.settings) || !!photo || removePhoto;
  const changedElsewhere = latest.version > accepted.version;
  useDraftWarning(dirty || !!pending);
  useEffect(() => { if (enabled) heading.current?.focus(); }, [enabled]);
  useEffect(() => { if (error) { const target = invalid ? form.current?.querySelector<HTMLElement>(`[name="${invalid}"]`) : alert.current; const section = target?.closest("details"); if (section) section.open = true; target?.focus(); } }, [error, invalid]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => () => { photoRequest.current++; }, []);
  function update<K extends keyof PublicAppearanceSettings>(field: K, value: PublicAppearanceSettings[K]) { setSettings(old => ({ ...old, [field]: value })); setError(""); setInvalid(null); }
  function reload() {
    if (busy) return;
    setAccepted(latest); setSettings(latest.settings); setPhoto(null); setRemovePhoto(false); setPending(null); setError(""); setInvalid(null);
  }
  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const request = ++photoRequest.current; setPreparing(true); setError("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw Error("Elige una imagen JPG, PNG o WebP de hasta 5 MB.");
      const image = await createImageBitmap(file);
      try {
        if (!image.width || !image.height || image.width * image.height > 40_000_000) throw Error("La imagen es demasiado grande. Elige otra de menor resolución.");
        const scale = Math.min(1, 768 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d"); if (!context) throw Error("No pudimos preparar la foto. Prueba con otra imagen.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error("No pudimos preparar la foto.")), "image/webp", .85));
        if (blob.size > MAX_PUBLIC_PHOTO_BYTES) throw Error("La foto sigue siendo demasiado grande. Elige otra imagen.");
        const bytes = await blob.arrayBuffer();
        if (request !== photoRequest.current) return;
        setPhoto({ bytes, url: URL.createObjectURL(blob) }); setRemovePhoto(false); update("showPhoto", true);
      } finally { image.close(); }
    } catch (cause) { if (request === photoRequest.current) { setInvalid("photo"); setError(cause instanceof Error ? cause.message : "No pudimos leer la foto."); } }
    finally { if (request === photoRequest.current) setPreparing(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || preparing || !enabled) return;
    let command = pending;
    if (!command) {
      const parsed = publicAppearanceSchema.safeParse(settings);
      if (!parsed.success) { const issue = parsed.error.issues[0]; setInvalid(String(issue.path[0])); setError(issue.message); setMobileTab("edit"); return; }
      if (settings.showPhoto && !photo && (!accepted.hasPhoto || removePhoto)) { setInvalid("photo"); setError("Añade una foto o desactiva Mostrar foto."); setMobileTab("edit"); return; }
      command = { settings: parsed.data, expectedVersion: accepted.version, operationId: crypto.randomUUID(), removePhoto, ...(photo ? { imageBytes: photo.bytes } : {}) };
      setPending(command);
    }
    lock.current = true; setBusy(true); setError(""); setInvalid(null);
    try {
      const result = await save(command);
      setAccepted(result); setSettings(result.settings); setPhoto(null); setRemovePhoto(false); setPending(null);
      if (result.changed) toast.success("Vista pública guardada");
    } catch (cause) {
      const data = cause instanceof ConvexError ? cause.data : null;
      const code = data && typeof data === "object" && "code" in data ? data.code : null;
      if (code === "PROFILE_CHANGED" || code === "COMMAND_CONFLICT") { setPending(null); setError("La configuración cambió en otra pestaña. Tus cambios siguen aquí; carga la versión guardada antes de volver a editar."); }
      else if (code === "INVALID_PHOTO" || code === "PHOTO_REQUIRED" || code === "INVALID_APPEARANCE") { setPending(null); setError("Revisa los datos y la foto antes de guardar."); }
      else setError("No recibimos la confirmación. Reintenta el mismo guardado para comprobarlo sin duplicarlo.");
    } finally { lock.current = false; setBusy(false); }
  }
  const frozen = busy || !!pending || preparing || !enabled;
  const photoUrl = photo?.url ?? (removePhoto ? null : accepted.photoUrl);
  return <section className="appearance-editor" aria-label="Personalizar vista pública" data-panel-mutation-busy={busy || preparing} onKeyDown={event => { if (event.key === "Escape" && !busy && !preparing && !(event.target instanceof HTMLSelectElement)) { event.preventDefault(); openWorkspaceSection("negocio"); } }}>
    <header className="appearance-toolbar">
      <a className="appearance-back" href={dashboardHref("negocio", params.get("fecha"), params)} onClick={navigateWorkspace} aria-label="Volver a Negocio"><ChevronLeft aria-hidden="true" /></a>
      <h1 ref={heading} id="appearance-heading" tabIndex={-1}>Personalizar vista pública</h1>
      <Button type="submit" form="public-appearance-form" disabled={busy || preparing || !enabled || !dirty && !pending || changedElsewhere && !pending}>{busy ? "Guardando…" : pending ? "Reintentar" : "Guardar"}</Button>
    </header>
    {(changedElsewhere || error) && <div className="appearance-feedback">
      {changedElsewhere && <div className="appearance-notice"><p role="status">Hay una versión guardada más reciente.</p><Button type="button" variant="outline" disabled={busy || !!pending} onClick={reload}>Cargar versión guardada</Button></div>}
      {error && <p ref={alert} tabIndex={-1} id="appearance-error" role="alert" className="appearance-error">{error}</p>}
    </div>}
    <Tabs.Root value={mobileTab} onValueChange={setMobileTab} className="appearance-tabs" activationMode="manual">
      <Tabs.List aria-label="Editor y vista previa" className="appearance-mobile-tabs"><Tabs.Trigger value="edit">Editar</Tabs.Trigger><Tabs.Trigger value="preview">Vista previa</Tabs.Trigger></Tabs.List>
      <div className="appearance-columns" data-mobile-tab={mobileTab}>
        <Tabs.Content forceMount value="edit" asChild><div className="appearance-settings" aria-label="Ajustes de la vista pública">
          <form ref={form} id="public-appearance-form" onSubmit={submit} noValidate aria-busy={busy}>
            <fieldset disabled={frozen} className="appearance-fieldset"><legend className="sr-only">Personalización</legend>
              <details open className="appearance-section"><summary>Presentación<ChevronDown aria-hidden="true" /></summary><div className="appearance-fields">
                <div className="appearance-field-pair"><EditorField label="Nombre público" name="publicName" max={100} value={settings.publicName} placeholder={businessName} invalid={invalid} onChange={value => update("publicName", value)} />
                <EditorField label="Nombre de la persona" name="professionalName" max={100} value={settings.professionalName} invalid={invalid} onChange={value => update("professionalName", value)} /></div>
                <div className="grid gap-2"><Label htmlFor="appearance-welcome">Bienvenida</Label><textarea id="appearance-welcome" name="welcome" rows={3} maxLength={500} className="form-control appearance-textarea" value={settings.welcome} onChange={event => update("welcome", event.target.value)} aria-invalid={invalid === "welcome"} aria-describedby={invalid === "welcome" ? "appearance-error" : undefined} /></div>
                <EditorField label="Dirección" name="address" max={200} value={settings.address} invalid={invalid} onChange={value => update("address", value)} />
              </div></details>
              <details className="appearance-section"><summary>Contacto y foto<ChevronDown aria-hidden="true" /></summary><div className="appearance-fields">
                <EditorField label="Teléfono del negocio" name="phone" max={40} type="tel" value={settings.phone} invalid={invalid} onChange={value => update("phone", value)} />
                <label className="appearance-check"><input type="checkbox" checked={settings.showPhone} onChange={event => update("showPhone", event.target.checked)} />Mostrar teléfono</label>
                <div className="appearance-photo"><div className="appearance-photo-space">{photoUrl ?
                  // eslint-disable-next-line @next/next/no-img-element -- Local file draft or owned Convex storage URL.
                  <img src={photoUrl} alt="Foto elegida" width={56} height={56} /> : <span>Sin foto</span>}</div><div className="min-w-0 flex flex-wrap gap-2">
                  <Button type="button" name="photo" variant="outline" onClick={() => fileInput.current?.click()} aria-invalid={invalid === "photo"} aria-describedby={invalid === "photo" ? "appearance-error" : undefined}>{preparing ? "Preparando…" : "Subir foto"}</Button>
                  <input ref={fileInput} id="appearance-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} />
                  {photoUrl && <Button type="button" variant="ghost" onClick={() => { photoRequest.current++; setPhoto(null); setRemovePhoto(true); update("showPhoto", false); }}>Quitar</Button>}
                </div></div>
                <label className="appearance-check"><input type="checkbox" checked={settings.showPhoto} onChange={event => update("showPhoto", event.target.checked)} />Mostrar foto</label>
              </div></details>
              <details className="appearance-section"><summary>Reservas y estilo<ChevronDown aria-hidden="true" /></summary><div className="appearance-fields">
                <fieldset><legend className="mb-2 text-sm font-medium">Color</legend><div className="appearance-colors">{Object.entries(publicThemes).map(([key, color]) => <label key={key} title={color.label}><input type="radio" name="theme" value={key} checked={settings.theme === key} onChange={() => update("theme", key as PublicAppearanceSettings["theme"])} /><span style={{ background: color.accent }} /><span className="sr-only">{color.label}</span></label>)}</div></fieldset>
                <div className="grid gap-2"><Label htmlFor="appearance-date-picker">Selector de fecha</Label><NativeSelect id="appearance-date-picker" name="datePicker" value={settings.datePicker} onChange={event => update("datePicker", event.target.value as PublicAppearanceSettings["datePicker"])}><option value="calendar">Calendario visible</option><option value="native">Campo de fecha</option></NativeSelect></div>
              </div></details>
            </fieldset>
          </form>
        </div></Tabs.Content>
        <Tabs.Content forceMount value="preview" asChild><div className="appearance-preview" aria-label="Vista previa de reservas"><div className="appearance-preview-label">Vista previa <span>Los cambios se publican al guardar</span></div>
          <div className="appearance-preview-page"><Preview businessName={businessName} timeZone={timeZone} settings={settings} photoUrl={photoUrl} enabled={enabled} /></div>
        </div></Tabs.Content>
      </div>
    </Tabs.Root>
  </section>;
}
function EditorField({ label, name, value, onChange, max, type = "text", placeholder, invalid }: { label: string; name: string; value: string; onChange: (value: string) => void; max: number; type?: string; placeholder?: string; invalid: string | null }) {
  return <div className="grid gap-2"><Label htmlFor={`appearance-${name}`}>{label}</Label><Input id={`appearance-${name}`} name={name} type={type} maxLength={max} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-invalid={invalid === name} aria-describedby={invalid === name ? "appearance-error" : undefined} /></div>;
}
function Preview({ businessName, timeZone, settings, photoUrl, enabled }: { businessName: string; timeZone: string; settings: PublicAppearanceSettings; photoUrl: string | null; enabled: boolean }) {
  const services = usePaginatedQuery(api.publicAppearance.listPreviewServices, enabled ? {} : "skip", { initialNumItems: 30 });
  const [fields, setFields] = useState<ReservationFields>({ serviceId: "", date: "", start: "", clientName: "", email: "" });
  const [options, setOptions] = useState<{ key: string; slots: { start: number; startTime: string; endTime: string }[]; error: string }>({ key: "", slots: [], error: "" });
  const availability = useAction(api.availability.getMyAvailability), calendar = useAction(api.availability.getMyAvailableDates), canQuery = !!fields.serviceId && isLocalDate(fields.date), key = `${fields.serviceId}:${fields.date}`;
  const loadDays = useCallback((month: string) => calendar({ serviceId: fields.serviceId as Id<"services">, month }), [calendar, fields.serviceId]);
  useEffect(() => {
    if (!enabled || !canQuery) return;
    let current = true;
    availability({ serviceId: fields.serviceId as Id<"services">, date: fields.date }).then(result => { if (current) setOptions({ key, slots: result.slots, error: "" }); }, () => { if (current) setOptions({ key, slots: [], error: "No pudimos cargar los horarios. Elige otra fecha para reintentar." }); });
    return () => { current = false; };
  }, [enabled, canQuery, fields.serviceId, fields.date, key, availability]);
  const ready = canQuery && key === options.key;
  return <PublicBookingSurface businessName={businessName} timeZone={timeZone} appearance={{ settings, photoUrl }}>
    <form className="mt-8" aria-label="Reserva de vista previa" onSubmit={event => event.preventDefault()}><h2 className="mb-6 text-xl font-semibold tracking-tight">Reservar cita</h2><fieldset className="grid gap-5"><legend className="sr-only">Datos de la reserva</legend>
      <PublicReservationFields prefix="preview" fields={fields} change={(field, value) => setFields(old => ({ ...old, [field]: value, ...(field === "date" || field === "serviceId" ? { start: "" } : {}), ...(field === "serviceId" ? { date: "" } : {}) }))} loadDays={enabled && fields.serviceId ? loadDays : undefined}
        services={services.results} servicesLoading={services.status === "LoadingFirstPage"}
        serviceHelp={<>{services.status === "CanLoadMore" && <Button type="button" variant="outline" onClick={() => services.loadMore(30)}>Ver más servicios</Button>}{services.status === "Exhausted" && !services.results.length && <p role="status" className="text-sm text-muted">No hay servicios disponibles.</p>}</>}
        starts={ready ? options.slots.map(slot => ({ value: String(slot.start), label: `${slot.startTime} – ${slot.endTime}` })) : []} startDisabled={!ready} startPlaceholder={canQuery && !ready ? "Cargando horarios…" : "Elige un horario"}
        startHelp={ready && (options.error || !options.slots.length) ? <p role="status" className="text-sm text-muted">{options.error || "No hay horarios disponibles para esta fecha."}</p> : null} timeZone={timeZone} datePicker={settings.datePicker} />
    </fieldset><Button type="button" disabled className="mt-6 w-full sm:w-auto">Confirmar cita</Button><p className="mt-3 text-xs text-muted">La vista previa no crea reservas.</p></form>
  </PublicBookingSurface>;
}
