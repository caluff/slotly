"use client";

import { useAction, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import PhoneInput, { getCountryCallingCode, isPossiblePhoneNumber, parsePhoneNumber, type FlagProps } from "react-phone-number-input";
import phoneLabels from "react-phone-number-input/locale/es";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ChevronLeft, ChevronDown, ImagePlus, Trash2 } from "@/components/ui/icons";
import { navigateWorkspace } from "@/components/dashboard-workspace";
import { openWorkspaceSection } from "@/components/workspace-panel";
import { useDraftWarning } from "@/components/use-draft-warning";
import { useLastDefined } from "@/components/use-last-defined";
import { PublicBookingSurface, PublicReservationFields, PublicReservationIntro, type ReservationFields } from "@/components/public-booking-presentation";
import { FormSkeleton } from "@/components/loading-screens";
import { dashboardHref } from "@/lib/dashboard-navigation";
import { isLocalDate } from "@/lib/local-date";
import { MAX_PUBLIC_PHOTO_BYTES, publicAppearanceDraft, publicAppearanceForSave, publicAppearanceSchema, publicBookingActions, publicThemes, type PrivatePublicAppearance, type PublicAppearanceSettings } from "@/lib/public-appearance";
import "react-phone-number-input/style.css";
import "@/components/public-appearance-editor.css";

type Command = { settings: PublicAppearanceSettings; expectedVersion: number; operationId: string; removePhoto: boolean; imageBytes?: ArrayBuffer };
type Photo = { bytes: ArrayBuffer; url: string };

export function PublicAppearanceEditor({ businessName, timeZone, enabled }: { businessName: string; timeZone: string; enabled: boolean }) {
  const profile = useLastDefined(useQuery(api.publicAppearance.getMy, enabled ? {} : "skip"));
  return profile ? <Editor initial={profile} latest={profile} businessName={businessName} timeZone={timeZone} enabled={enabled} /> : <div className="p-6"><FormSkeleton label="Cargando personalización" /></div>;
}

function Editor({ initial, latest, businessName, timeZone, enabled }: { initial: PrivatePublicAppearance; latest: PrivatePublicAppearance; businessName: string; timeZone: string; enabled: boolean }) {
  const [accepted, setAccepted] = useState(initial);
  const [settings, setSettings] = useState(() => publicAppearanceDraft(initial.settings));
  const [photo, setPhoto] = useState<Photo | null>(null), [removePhoto, setRemovePhoto] = useState(false);
  const [draggingPhoto, setDraggingPhoto] = useState(false);
  const savedPublicPhoto = accepted.settings.showPhoto ? accepted.photoUrl : null;
  const photoUrl = photo?.url ?? (removePhoto ? null : savedPublicPhoto);
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [pending, setPending] = useState<Command | null>(null);
  const [error, setError] = useState(""), [invalid, setInvalid] = useState<string | null>(null), [mobileTab, setMobileTab] = useState("edit");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const form = useRef<HTMLFormElement>(null), heading = useRef<HTMLHeadingElement>(null), alert = useRef<HTMLParagraphElement>(null), lock = useRef(false), fileInput = useRef<HTMLInputElement>(null);
  const photoAction = useRef<HTMLButtonElement>(null);
  const photoRequest = useRef(0), save = useAction(api.publicAppearance.save), params = useSearchParams();
  const dirty = JSON.stringify(settings) !== JSON.stringify(publicAppearanceDraft(accepted.settings)) || !!photo || removePhoto;
  const changedElsewhere = latest.version > accepted.version;
  useDraftWarning(dirty || !!pending);
  useEffect(() => { if (enabled) heading.current?.focus(); }, [enabled]);
  useEffect(() => { if (error) { const target = invalid ? form.current?.querySelector<HTMLElement>(`[name="${invalid}"]`) : alert.current; const section = target?.closest("details"); if (section) section.open = true; target?.focus(); } }, [error, invalid]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => () => { photoRequest.current++; }, []);
  function update<K extends keyof PublicAppearanceSettings>(field: K, value: PublicAppearanceSettings[K]) { setSettings(old => ({ ...old, [field]: value })); setError(""); setInvalid(null); }
  function reload() {
    if (busy || preparing) return;
    setAccepted(latest); setSettings(publicAppearanceDraft(latest.settings)); setPhoto(null); setRemovePhoto(false); setPending(null); setError(""); setInvalid(null);
  }
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (file) void preparePhoto(file);
  }
  function dropPhoto(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDraggingPhoto(false);
    if (frozen) return;
    const files = event.dataTransfer.files;
    if (files.length > 1) {
      setInvalid("photo"); setError("Elegí una sola foto.");
    } else if (files[0]) void preparePhoto(files[0]);
  }
  async function preparePhoto(file: File) {
    const request = ++photoRequest.current; setPreparing(true); setError(""); setInvalid(null);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw Error("Elige una imagen JPG, PNG o WebP de hasta 5 MB.");
      const image = await createImageBitmap(file).catch(() => { throw Error("No pudimos leer la imagen. Elegí otro archivo."); });
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
        setPhoto({ bytes, url: URL.createObjectURL(blob) }); setRemovePhoto(false);
      } finally { image.close(); }
    } catch (cause) { if (request === photoRequest.current) { setInvalid("photo"); setError(cause instanceof Error ? cause.message : "No pudimos leer la foto."); } }
    finally { if (request === photoRequest.current) setPreparing(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || preparing || !enabled) return;
    let command = pending;
    if (!command) {
      const parsed = publicAppearanceSchema.safeParse({ ...publicAppearanceForSave(settings, accepted.settings), showPhoto: !!photoUrl });
      if (!parsed.success) { const issue = parsed.error.issues[0]; setInvalid(String(issue.path[0])); setError(issue.message); setMobileTab("edit"); return; }
      if (parsed.data.showPhone && (!accepted.settings.showPhone || parsed.data.phone !== accepted.settings.phone) && !isPossiblePhoneNumber(parsed.data.phone)) {
        setInvalid("phone"); setError("Escribe un teléfono completo para el país seleccionado."); setMobileTab("edit"); return;
      }
      command = { settings: parsed.data, expectedVersion: accepted.version, operationId: crypto.randomUUID(), removePhoto, ...(photo ? { imageBytes: photo.bytes } : {}) };
      setPending(command);
    }
    lock.current = true; setBusy(true); setError(""); setInvalid(null);
    try {
      const result = await save(command);
      setAccepted(result); setSettings(publicAppearanceDraft(result.settings)); setPhoto(null); setRemovePhoto(false); setPending(null);
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
  const phoneValue = settings.phone.startsWith("+") ? settings.phone.replace(/[^\d+]/g, "") : parsePhoneNumber(settings.phone, "UY")?.number;
  const showPreviewPhone = !!settings.phone && (settings.phone === accepted.settings.phone || !!phoneValue && isPossiblePhoneNumber(phoneValue));
  return <section className="appearance-editor" aria-label="Personalizar vista pública" data-panel-mutation-busy={busy || preparing} onKeyDown={event => {
    if (event.key !== "Escape" || busy || preparing || (event.target instanceof Element && event.target.closest("select"))) return;
    event.preventDefault();
    openWorkspaceSection("negocio");
  }}>
    <header className="appearance-toolbar">
      <a className="appearance-back" href={dashboardHref("negocio", params.get("fecha"), params)} onClick={navigateWorkspace} aria-label="Volver a Negocio"><ChevronLeft aria-hidden="true" /></a>
      <h1 ref={heading} id="appearance-heading" tabIndex={-1}>Personalizar vista pública</h1>
      <Button type="submit" form="public-appearance-form" disabled={busy || preparing || !enabled || !dirty && !pending || changedElsewhere && !pending}>{busy ? "Guardando…" : pending ? "Reintentar" : "Guardar"}</Button>
    </header>
    {(changedElsewhere || error) && <div className="appearance-feedback">
      {changedElsewhere && <div className="appearance-notice"><p role="status">Hay una versión guardada más reciente.</p><Button type="button" variant="outline" disabled={frozen} onClick={reload}>Cargar versión guardada</Button></div>}
      {error && <p ref={alert} tabIndex={-1} id="appearance-error" role="alert" className="appearance-error">{error}</p>}
    </div>}
    <Tabs value={mobileTab} onValueChange={value => { if (value) setMobileTab(value); }} className="appearance-tabs" activation="manual">
      <TabsList aria-label="Editor y vista previa" className="appearance-mobile-tabs"><TabsTab value="edit">Editar</TabsTab><TabsTab value="preview">Vista previa</TabsTab></TabsList>
      <div className="appearance-columns" data-mobile-tab={mobileTab}>
        <TabsPanel render={props => <div {...props} hidden={undefined} />} keepMounted value="edit" className="appearance-settings" aria-label="Ajustes de la vista pública">
          <form ref={form} id="public-appearance-form" onSubmit={submit} noValidate aria-busy={busy}>
            <fieldset disabled={frozen} className="appearance-fieldset"><legend className="sr-only">Personalización</legend>
              <details open className="appearance-section"><summary>Presentación<ChevronDown aria-hidden="true" /></summary><div className="appearance-fields">
                <div className="appearance-field-pair"><EditorField label="Nombre público" name="publicName" max={100} value={settings.publicName} placeholder={businessName} invalid={invalid} onChange={value => update("publicName", value)} />
                <EditorField label="Nombre de la persona" name="professionalName" max={100} value={settings.professionalName} invalid={invalid} onChange={value => update("professionalName", value)} /></div>
                <EditorField label="Frase bajo el nombre" name="tagline" max={100} value={settings.tagline ?? ""} invalid={invalid} onChange={value => update("tagline", value)} />
                <EditorTextarea label="Bienvenida" name="welcome" max={500} value={settings.welcome} invalid={invalid} onChange={value => update("welcome", value)} />
              </div></details>
              <details className="appearance-section"><summary>Apariencia<ChevronDown aria-hidden="true" /></summary><div className="appearance-fields">
                <fieldset><legend className="mb-2 text-sm font-medium">Color</legend><div className="appearance-colors">
                  {Object.entries(publicThemes).map(([key, color]) => <label key={key}>
                    <input type="radio" name="theme" value={key} checked={settings.theme === key} onChange={() => update("theme", key as PublicAppearanceSettings["theme"])} />
                    <span aria-hidden="true" className="appearance-color-swatch" style={{ backgroundColor: color.accent }} />{color.label}
                  </label>)}
                </div></fieldset>
                <div className="appearance-field-pair">
                  <EditorSelect label="Alineación" name="profileLayout" value={settings.profileLayout ?? "inline"} onChange={value => update("profileLayout", value as PublicAppearanceSettings["profileLayout"])}>
                    <option value="inline">En línea</option><option value="centered">Centrada</option>
                  </EditorSelect>
                  <EditorSelect label="Fondo de portada" name="headerStyle" value={settings.headerStyle ?? "plain"} onChange={value => update("headerStyle", value as PublicAppearanceSettings["headerStyle"])}>
                    <option value="plain">Neutro</option><option value="tinted">Con color</option>
                  </EditorSelect>
                </div>
                <div className="appearance-photo" data-has-photo={!!photoUrl} data-dragging={draggingPhoto && !frozen} data-invalid={invalid === "photo"}
                  onDragOver={event => {
                    if (!event.dataTransfer.types.includes("Files")) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = frozen ? "none" : "copy";
                    if (!frozen) setDraggingPhoto(true);
                  }}
                  onDragLeave={event => {
                    if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setDraggingPhoto(false);
                  }}
                  onDrop={dropPhoto}>
                  <div className="appearance-photo-info">
                    <div className="appearance-photo-thumbnail">{photoUrl ?
                      // eslint-disable-next-line @next/next/no-img-element -- Local draft or owned Convex photo.
                      <img src={photoUrl} alt="" width={56} height={56} /> : <ImagePlus aria-hidden="true" className="size-5" />}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Foto pública</p>
                      <p id="appearance-photo-help" className="mt-1 text-xs text-muted">JPG, PNG o WebP <span aria-hidden="true">·</span> Hasta 5 MB</p>
                    </div>
                  </div>
                  <div className="appearance-photo-actions">
                    <Button ref={photoAction} type="button" name="photo" variant={photoUrl ? "outline" : "secondary"} className="px-3"
                      onClick={() => fileInput.current?.click()} aria-invalid={invalid === "photo"}
                      aria-describedby={invalid === "photo" ? "appearance-error appearance-photo-help" : "appearance-photo-help"}>{preparing ? "Preparando…" : photoUrl ? "Cambiar foto" : "Subir foto"}</Button>
                    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} />
                    {photoUrl ? <Button type="button" variant="ghost" className="appearance-photo-remove" aria-label="Quitar foto" onClick={() => {
                      setPhoto(null); setRemovePhoto(!!savedPublicPhoto); setError(""); setInvalid(null);
                      photoAction.current?.focus();
                    }}><Trash2 aria-hidden="true" />Quitar</Button> : <span className="appearance-photo-drop-hint">o arrastrala acá</span>}
                  </div>
                  <span className="sr-only" role="status">{preparing ? "Preparando la foto…" : ""}</span>
                </div>
              </div></details>
              <details className="appearance-section"><summary>Contacto<ChevronDown aria-hidden="true" /></summary><div className="appearance-fields">
                <EditorField label="Dirección" name="address" max={200} value={settings.address} invalid={invalid} onChange={value => update("address", value)} />
                <EditorField label="Sitio web" name="website" max={500} type="url" value={settings.website ?? ""} placeholder="https://" invalid={invalid} onChange={value => update("website", value)} />
                <div className="grid gap-2">
                  <Label htmlFor="appearance-phone">Teléfono público (opcional)</Label>
                  <PhoneInput id="appearance-phone" name="phone" defaultCountry="UY" labels={phoneLabels} locales="es-UY" limitMaxLength
                    value={phoneValue} onChange={value => update("phone", value ?? "")} inputComponent={Input} disabled={frozen}
                    flagComponent={PhoneCountryCode} className="appearance-phone" countrySelectProps={{ "aria-label": "País del teléfono" }}
                    aria-invalid={invalid === "phone"} aria-describedby={invalid === "phone" ? "appearance-error" : undefined} />
                </div>
              </div></details>
              <details className="appearance-section"><summary>Reserva<ChevronDown aria-hidden="true" /></summary><div className="appearance-fields">
                <EditorTextarea label="Indicaciones para reservar" name="bookingNote" max={300} value={settings.bookingNote ?? ""} invalid={invalid} onChange={value => update("bookingNote", value)} />
                <EditorSelect label="Texto del botón" name="bookingAction" value={settings.bookingAction ?? "confirm"} onChange={value => update("bookingAction", value as PublicAppearanceSettings["bookingAction"])}>
                  {Object.entries(publicBookingActions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </EditorSelect>
              </div></details>
            </fieldset>
          </form>
        </TabsPanel>
        <TabsPanel render={props => <div {...props} hidden={undefined} />} keepMounted value="preview" className="appearance-preview" aria-label="Vista previa de reservas">
          <div className="appearance-preview-bar">
            <h2>Vista previa</h2>
            <span role="status" className={dirty ? "text-accent" : "text-muted"}>{dirty ? "Cambios sin guardar" : "Sin cambios"}</span>
            <SegmentedControl aria-label="Tamaño de la vista previa" value={device} onValueChange={value => { if (value) setDevice(value); }} className="appearance-preview-devices">
              <SegmentedControlIndicator />
              <SegmentedControlItem value="desktop">Escritorio</SegmentedControlItem>
              <SegmentedControlItem value="mobile">Móvil</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <div className="appearance-preview-scroll">
            <div className="appearance-preview-page" data-device={device}><Preview businessName={businessName} timeZone={timeZone} settings={{ ...settings, showPhone: showPreviewPhone, showPhoto: !!photoUrl }} photoUrl={photoUrl} enabled={enabled} /></div>
          </div>
        </TabsPanel>
      </div>
    </Tabs>
  </section>;
}
function PhoneCountryCode({ country }: FlagProps) {
  return <span aria-hidden="true">{country} +{getCountryCallingCode(country)}</span>;
}

function EditorField({ label, name, value, onChange, max, type = "text", placeholder, invalid }: { label: string; name: string; value: string; onChange: (value: string) => void; max: number; type?: string; placeholder?: string; invalid: string | null }) {
  return <div className="grid gap-2"><Label htmlFor={`appearance-${name}`}>{label}</Label><Input id={`appearance-${name}`} name={name} type={type} maxLength={max} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-invalid={invalid === name} aria-describedby={invalid === name ? "appearance-error" : undefined} /></div>;
}
function EditorTextarea({ label, name, value, onChange, max, invalid }: { label: string; name: string; value: string; onChange: (value: string) => void; max: number; invalid: string | null }) {
  return <div className="grid gap-2">
    <Label htmlFor={`appearance-${name}`}>{label}</Label>
    <textarea id={`appearance-${name}`} name={name} rows={3} maxLength={max} className="form-control appearance-textarea" value={value} onChange={event => onChange(event.target.value)} aria-invalid={invalid === name} aria-describedby={invalid === name ? "appearance-error" : undefined} />
  </div>;
}
function EditorSelect({ label, name, value, onChange, children }: { label: string; name: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <div className="grid gap-2 [&>[data-slot=native-select-wrapper]]:w-full">
    <Label htmlFor={`appearance-${name}`}>{label}</Label>
    <NativeSelect id={`appearance-${name}`} name={name} value={value} onChange={event => onChange(event.target.value)} className="w-full">{children}</NativeSelect>
  </div>;
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
  return <PublicBookingSurface businessName={businessName} appearance={{ settings, photoUrl }}>
    <form className="mt-8" aria-label="Reserva de vista previa" onSubmit={event => event.preventDefault()}><PublicReservationIntro note={settings.bookingNote} /><fieldset className="grid gap-5"><legend className="sr-only">Datos de la reserva</legend>
      <PublicReservationFields prefix="preview" fields={fields} change={(field, value) => setFields(old => ({ ...old, [field]: value, ...(field === "date" || field === "serviceId" ? { start: "" } : {}), ...(field === "serviceId" ? { date: "" } : {}) }))} loadDays={enabled && fields.serviceId ? loadDays : undefined}
        services={services.results} servicesLoading={services.status === "LoadingFirstPage"}
        serviceHelp={<>{services.status === "CanLoadMore" && <Button type="button" variant="outline" onClick={() => services.loadMore(30)}>Ver más servicios</Button>}{services.status === "Exhausted" && !services.results.length && <p role="status" className="text-sm text-muted">No hay servicios disponibles.</p>}</>}
        starts={ready ? options.slots.map(slot => ({ value: String(slot.start), label: `${slot.startTime} – ${slot.endTime}` })) : []} startDisabled={!ready} startPlaceholder={canQuery && !ready ? "Cargando horarios…" : "Elige un horario"}
        startHelp={ready && (options.error || !options.slots.length) ? <p role="status" className="text-sm text-muted">{options.error || "No hay horarios disponibles para esta fecha."}</p> : null} timeZone={timeZone} />
    </fieldset><Button type="button" disabled className="public-booking-action mt-6 disabled:opacity-100">{publicBookingActions[settings.bookingAction ?? "confirm"]}</Button><p className="mt-3 text-xs text-muted">La vista previa no crea reservas.</p></form>
  </PublicBookingSurface>;
}
