"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { DropdownMenu } from "radix-ui";
import { toast } from "sonner";
import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { WorkspacePanels } from "@/components/workspace-panel";
import { AgendaCalendar, CalendarSurface, AppointmentDetail, type CalendarAppointment } from "@/components/agenda-calendar";
import { AvailabilityPanel } from "@/components/business-availability";
import { AppointmentAttention } from "@/components/appointment-attention";
import { AppointmentResultsWorkspace } from "@/components/appointment-results";
import { AppointmentArchiveProvider } from "@/components/appointment-archive";
import { AppointmentCancelDialog } from "@/components/appointment-cancel-dialog";
import { AppointmentRescheduleDialog } from "@/components/appointment-reschedule-dialog";
import { AppointmentLocateResults, type AppointmentActionProps } from "@/components/appointment-search";
import { ServicesPanel } from "@/components/business-services";
import { WeeklySchedulePanel } from "@/components/business-weekly-schedule";
import { ClientsPanel, ClientDetailPanel } from "@/components/business-clients";
import { ClientRows, ClientRowsProvider } from "@/components/client-picker";
import { TimeBlockEditor, type BlockEditorProps } from "@/components/time-block-editor";
import { Button } from "@/components/ui/button";
import { ArchiveRestore } from "@/components/ui/icons";
import { calendarHref, calendarRange, calendarSearchHref, civilInstant, readCalendarState } from "@/lib/agenda-calendar";
import { normalizeClientSearch } from "@/lib/appointment-search";
import { selectedAppointmentStatuses } from "@/lib/appointment-status";
import { currentWorkspaceHref } from "@/lib/dashboard-navigation";
import { createDemoStore, demoDateOffset, demoMinutes, demoPlacementError, demoTime, demoWeekDays, type DemoAppointment, type DemoBlock, type DemoClient, type DemoService, type DemoState, type DemoStore } from "@/lib/demo-store";
import type { Id } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import "@/components/demo-dashboard.css";

const zone = "America/Montevideo";
const businessId = "slotly-local-demo" as Id<"businesses">;
const serverSnapshot = () => null;
const instant = (date: string, minute: number) => civilInstant(date, demoTime(minute), zone)!;
const localMinute = (start: number) => { const text = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start); return demoMinutes(text); };
const clientDTO = (client: DemoClient) => ({ _id: client.id as Id<"clients">, name: client.name, email: client.email, createdAt: 0 });
const serviceDTO = (service: DemoService) => ({ _id: service.id as Id<"services">, _creationTime: 0, businessId, name: service.name, durationMinutes: service.duration, archived: service.archived, version: service.version });
const appointmentDTO = (row: DemoAppointment): CalendarAppointment => ({ _id: row.id as Id<"appointments">, clientId: row.clientId as Id<"clients">, serviceId: row.serviceId as Id<"services">, clientName: row.clientName, serviceName: row.serviceName, date: row.date, start: instant(row.date, row.start), end: instant(row.date, row.start + row.duration), status: row.status, version: row.version, calendarArchivedAt: row.calendarArchivedAt });
const blockDTO = (row: DemoBlock) => ({ _id: row.id as Id<"timeBlocks">, date: row.date, start: instant(row.date, row.start), end: instant(row.date, row.end), startTime: demoTime(row.start), endTime: demoTime(row.end), timeZone: zone, updatedAt: 0, reason: row.reason, version: row.version, active: row.active });

function createAdapters(store: DemoStore) {
  const serviceUndo = new Map<string, DemoService>(), resultUndo = new Map<string, DemoAppointment>();
  const getAppointment = (id: string) => { const row = store.snapshot().appointments.find(row => row.id === id); if (!row) throw new Error("Cita de ejemplo no encontrada."); return row; };
  const getService = (id: string) => { const row = store.snapshot().services.find(row => row.id === id); if (!row) throw new Error("Servicio de ejemplo no encontrado."); return row; };
  type Availability = FunctionReturnType<typeof api.availability.getMyAvailability>;
  function availability(serviceId: string, date: string, appointmentId?: string): Availability {
    const state = store.snapshot(), service = getService(serviceId), moving = appointmentId ? getAppointment(appointmentId) : undefined;
    const duration = moving?.duration ?? service.duration;
    const now = Date.now();
    const slots = Array.from({ length: 96 }, (_, i) => i * 15).filter(start => !demoPlacementError(state, date, start, duration, appointmentId)).map(start => ({ start: instant(date, start), end: instant(date, start + duration), startTime: demoTime(start), endTime: demoTime(start + duration) })).filter(slot => slot.start > now);
    const day = state.week[new Date(`${date}T12:00Z`).getUTCDay()];
    return { status: !day.open ? "day_closed" : slots.length ? "available" : "empty", slots, generatedAt: now, omittedForTimeChange: false, date, timeZone: zone, service: { id: service.id as Id<"services">, name: moving?.serviceName ?? service.name, durationMinutes: duration, version: service.version } };
  }
  return {
    availability,
    consult: async ({ serviceId, date }: { serviceId: Id<"services">; date: string }) => availability(serviceId, date),
    create: async (command: Parameters<Parameters<typeof AvailabilityPanel>[0]["onCreate"]>[0]) => {
      const old = store.snapshot().receipts.some(row => row.kind === "appointment" && row.operationId === command.operationId);
      const row = store.book({ serviceId: command.serviceId, date: command.date, start: localMinute(command.start), clientId: command.clientId ?? "", name: command.clientName, email: command.email ?? "", operationId: command.operationId });
      return { outcome: old ? "already_applied" as const : "created" as const, appointmentId: row.id as Id<"appointments"> };
    },
    checkCreation: async (command: { operationId: string }) => store.snapshot().receipts.some(row => row.kind === "appointment" && row.operationId === command.operationId) ? "found" as const : "absent" as const,
    createClient: async (command: { name: string; email?: string; operationId: string }) => ({ outcome: "created" as const, client: clientDTO(store.saveClient(command.name, command.email ?? "", command.operationId)) }),
    checkClient: async (command: { operationId: string }) => { const state = store.snapshot(), receipt = state.receipts.find(row => row.kind === "client" && row.operationId === command.operationId), client = state.clients.find(row => row.id === receipt?.id); return client ? clientDTO(client) : null; },
    createService: async (value: { name: string; durationMinutes: number; operationId: string }) => { const id = crypto.randomUUID(); store.saveService({ id, name: value.name, duration: value.durationMinutes, archived: false, version: 0 }); serviceUndo.set(value.operationId, { ...getService(id), archived: true }); return { id: id as Id<"services">, undo: { id: id as Id<"services">, version: 0, operationId: value.operationId } }; },
    changeService: async (command: Parameters<Parameters<typeof ServicesPanel>[0]["onChange"]>[0]) => { const old = getService(command.id); if (old.version !== command.expectedVersion) throw new Error("El servicio cambió."); serviceUndo.set(command.operationId, { ...old }); const change = command.change; store.saveService(change.kind === "edit" ? { ...old, name: change.name, duration: (change.durationMinutes ?? old.duration) } : { ...old, archived: change.kind === "archive" }); const service = serviceDTO(getService(command.id)); return { outcome: "changed" as const, service, undo: { id: command.id, version: service.version, operationId: command.operationId } }; },
    undoService: async (command: Parameters<Parameters<typeof ServicesPanel>[0]["onUndo"]>[0]) => { const old = serviceUndo.get(command.targetOperationId); if (!old || getService(command.id).version !== command.expectedVersion) throw new Error("Este cambio ya no se puede deshacer."); store.saveService(old); serviceUndo.delete(command.targetOperationId); return { outcome: "changed" as const, service: serviceDTO(getService(command.id)) }; },
    mark: async (command: Parameters<Parameters<typeof AppointmentResultsWorkspace>[0]["onMark"]>[0]) => { const row = getAppointment(command.appointmentId); if (row.version !== command.expectedVersion) throw new Error("La cita cambió."); resultUndo.set(command.operationId, { ...row }); store.status(row.id, command.result); const appointment = appointmentDTO(getAppointment(row.id)); return { outcome: "changed" as const, appointment, undo: { appointmentId: appointment._id, version: appointment.version, operationId: command.operationId } }; },
    undo: async (command: Parameters<Parameters<typeof AppointmentResultsWorkspace>[0]["onUndo"]>[0]) => { const old = resultUndo.get(command.targetOperationId); if (!old || getAppointment(command.appointmentId).version !== command.expectedVersion) throw new Error("La cita cambió."); store.restoreAppointment(old); resultUndo.delete(command.targetOperationId); return { outcome: "changed" as const, appointment: appointmentDTO(getAppointment(old.id)) }; },
    cancel: async ({ appointmentId }: { appointmentId: Id<"appointments">; expectedVersion: number }) => { store.status(appointmentId, "cancelled"); return { outcome: "cancelled" as const, cancelledAt: Date.now() }; },
    consultMove: async ({ appointmentId, date }: { appointmentId: Id<"appointments">; date: string }) => { const row = getAppointment(appointmentId); return { ...availability(row.serviceId, date, appointmentId), version: row.version }; },
    move: async ({ appointmentId, date, start }: { appointmentId: Id<"appointments">; expectedVersion: number; date: string; start: number }) => { store.move(appointmentId, date, localMinute(start)); const row = appointmentDTO(getAppointment(appointmentId)); return { outcome: "rescheduled" as const, version: row.version, date, start: row.start, end: row.end, rescheduledAt: Date.now() }; },
  };
}
const DemoContext = createContext<{ state: DemoState; store: DemoStore; adapters: ReturnType<typeof createAdapters> } | null>(null);
function useDemo() { const value = useContext(DemoContext); if (!value) throw new Error("Falta el contexto de la demo."); return value; }

export function DemoDashboard() {
  const [store] = useState(createDemoStore);
  const state = useSyncExternalStore(store.subscribe, store.snapshot, serverSnapshot);
  const adapters = useMemo(() => createAdapters(store), [store]);
  const [generation, setGeneration] = useState(0);
  function reset() { store.reset(); setGeneration(value => value + 1); window.history.replaceState(null, "", "/demo"); toast.success("Demo reiniciada"); }
  return state ? <DemoContext.Provider value={{ state, store, adapters }}><div className="demo-original-shell"><div className="demo-original-banner"><p><strong>Demo interactiva</strong><span>Datos de ejemplo · Solo en esta pestaña</span></p><div><Button variant="ghost" onClick={reset}><ArchiveRestore />Reiniciar demo</Button><Button asChild variant="outline"><Link href="/sign-up">Crear mi cuenta</Link></Button></div></div><DashboardWorkspace key={generation} account={<DemoAccount />}><DemoContent /></DashboardWorkspace></div></DemoContext.Provider> : <p role="status" className="workspace-width py-12">Preparando tu agenda de ejemplo…</p>;
}
function DemoAccount() { return <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button size="icon" variant="ghost" className="demo-account" aria-label="Cuenta de demo">O</Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="z-[90] min-w-48 rounded-md border border-line bg-background p-2 text-sm shadow-md" side="left"><p className="px-3 py-2 font-semibold">Estudio Oliva · Demo</p><DropdownMenu.Item asChild><Link className="block rounded-sm px-3 py-2 hover:bg-surface" href="/">Volver al inicio</Link></DropdownMenu.Item><DropdownMenu.Item asChild><Link className="block rounded-sm px-3 py-2 hover:bg-surface" href="/sign-up">Crear mi cuenta</Link></DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>; }

function DemoContent() {
  const [now] = useState(Date.now);
  const { state, store, adapters } = useDemo(), params = useSearchParams();
  const { date, view, filters } = readCalendarState(params, state.anchor);
  const range = calendarRange(date, view);
  const matches = state.appointments.filter(row => normalizeClientSearch(row.clientName).includes(normalizeClientSearch(filters.client)) && (!filters.service || row.serviceId === filters.service) && (selectedAppointmentStatuses(filters.status) ?? []).includes(row.status));
  const rows = matches.filter(row => row.date >= range.from && row.date <= range.until && row.calendarArchivedAt === undefined).map(appointmentDTO);
  const schedule = Array.from({ length: Math.round((+new Date(`${range.until}T12:00Z`) - +new Date(`${range.from}T12:00Z`)) / 86400000) + 1 }, (_, index) => { const dayDate = demoDateOffset(range.from, index), day = state.week[new Date(`${dayDate}T12:00Z`).getUTCDay()]; return { date: dayDate, configured: true, special: false, isOpen: day.open, start: day.open ? demoTime(day.start) : null, end: day.open ? demoTime(day.end) : null }; });
  const services = state.services.map(serviceDTO);
  const navigate = (href: string) => window.history.pushState(null, "", currentWorkspaceHref(href));
  const dayHref = (day: string) => currentWorkspaceHref(calendarHref(params, day, "dia"));
  return <ClientRowsProvider source={DemoClientRows}><AppointmentArchiveProvider change={async (row, archived) => { store.archive(row._id, archived); toast.success(archived ? "Cita archivada" : "Cita restaurada"); return true; }}><AppointmentResultsWorkspace onMark={adapters.mark} onUndo={adapters.undo}><AppointmentAttention timeZone={zone} now={now} candidates={[]} notices={[]} onRead={async () => {}} system="unsupported" systemEnabled={false}>
    <div className="workspace-business-content"><section className="workspace-agenda" aria-label="Agenda"><AvailabilityPanel storageKey={businessId} businessName="Estudio Oliva" services={services} loading={false} timeZone={zone} initialDate={date} onConsult={adapters.consult} onCreate={adapters.create} onCheckCreation={adapters.checkCreation} onSelectDate={day => navigate(dayHref(day))} revision={JSON.stringify([state.appointments, state.services, state.week, state.blocks])}
      agenda={onNew => <AgendaCalendar date={date} today={state.anchor} view={view} timeZone={zone} filters={filters} searching={false} enabled services={services} moreServices={false} loadingServices={false} onLoadServices={() => {}} onNavigate={(day, nextView) => navigate(calendarHref(params, day, nextView))} onSearch={values => navigate(calendarSearchHref(params, values, state.anchor))} dayHref={dayHref} onNew={onNew} blockEditorComponent={DemoBlockEditor}
        searchComponent={DemoSearch} archivedDetailComponent={DemoDetail}
        calendarContent={<CalendarSurface date={date} view={view} timeZone={zone} appointments={rows} blocks={state.blocks.filter(row => row.active && row.date >= range.from && row.date <= range.until).map(blockDTO)} schedule={schedule} ready dayHref={dayHref} onNew={onNew} onSelectDate={day => navigate(dayHref(day))} actionComponent={DemoAction} detailComponent={DemoDetail} />} />}
    /></section><WorkspacePanels clients={<ClientsPanel businessId={businessId} timeZone={zone} onCreate={adapters.createClient} onCheck={adapters.checkClient} detailComponent={DemoClientDetail} />} services={<ServicesPanel results={services} status="Exhausted" onLoadMore={() => {}} onCreate={adapters.createService} onChange={adapters.changeService} onUndo={adapters.undoService} />} schedule={<WeeklySchedulePanel timeZone={zone} schedule={{ days: demoWeekDays.map(({ day }) => ({ dayOfWeek: day || 7, isOpen: state.week[day].open, start: state.week[day].open ? demoTime(state.week[day].start) : null, end: state.week[day].open ? demoTime(state.week[day].end) : null })) }} onSave={async values => { const week = state.week.map(day => ({ ...day })); for (const day of values.days) week[day.dayOfWeek % 7] = { open: day.isOpen, start: day.start ? demoMinutes(day.start) : 540, end: day.end ? demoMinutes(day.end) : 1080 }; store.saveWeek(week); }} />} business={<><h1 className="workspace-title">Negocio</h1><dl className="divide-y divide-line"><div className="py-5"><dt className="text-sm text-muted">Nombre del negocio o profesional</dt><dd className="mt-1 font-semibold">Estudio Oliva</dd></div><div className="py-5"><dt className="text-sm text-muted">Zona horaria</dt><dd className="mt-1">{zone}</dd></div></dl><p className="mt-6 text-sm text-muted">Este es un negocio de ejemplo. Crea tu cuenta para configurar tu negocio y su enlace público.</p><Button asChild className="mt-4"><Link href="/sign-up">Crear mi cuenta</Link></Button></>} /></div>
  </AppointmentAttention></AppointmentResultsWorkspace></AppointmentArchiveProvider></ClientRowsProvider>;
}

function DemoClientRows(props: Pick<Parameters<typeof ClientRows>[0], "onChoose" | "timeZone"> & { search: string; enabled?: boolean }) { const { state } = useDemo(); return <ClientRows {...props} rows={state.clients.filter(row => normalizeClientSearch(row.name).startsWith(normalizeClientSearch(props.search ?? ""))).map(clientDTO)} status="Exhausted" onLoadMore={() => {}} />; }
function DemoClientDetail({ clientId }: { clientId: Id<"clients">; timeZone: string; enabled: boolean }) { const { state } = useDemo(); const client = state.clients.find(row => row.id === clientId); return <ClientDetailPanel client={client ? clientDTO(client) : null} results={state.appointments.filter(row => row.clientId === clientId).map(appointmentDTO)} status="Exhausted" onLoadMore={() => {}} timeZone={zone} />; }
function DemoAction(props: AppointmentActionProps & { timeZone: string; dayHref: (date: string) => string }) { const { adapters } = useDemo(); return props.mode === "cancel" ? <AppointmentCancelDialog {...props} onCancel={adapters.cancel} /> : <AppointmentRescheduleDialog {...props} onConsult={adapters.consultMove} onReschedule={adapters.move} />; }
function DemoBlockEditor(props: BlockEditorProps) { const { state, store } = useDemo(); const current = state.blocks.find(row => row.id === props.session.id); return <TimeBlockEditor {...props} context={props.session.context} initialValue={props.session.value} latest={current ? blockDTO(current) : undefined} existing={!!props.session.id} onChange={async command => { const old = current, value = command.value; const next: DemoBlock = value ? { id: old?.id ?? crypto.randomUUID(), date: value.date, start: demoMinutes(value.startTime), end: demoMinutes(value.endTime), reason: value.reason, version: (old?.version ?? -1) + 1, active: true } : { ...old!, version: old!.version + 1, active: false }; store.saveBlock(next); return { outcome: "changed", block: blockDTO(next) }; }} />; }



function DemoDetail(props: Parameters<typeof AppointmentDetail>[0]) { return <AppointmentDetail {...props} emailStatus={<div><dt className="text-muted">Confirmación por correo</dt><dd className="mt-1">No solicitada</dd></div>} />; }
function DemoSearch({ onLocate }: { onLocate: (row: CalendarAppointment) => void }) { const { state } = useDemo(), params = useSearchParams(); const { filters } = readCalendarState(params, state.anchor); const rows = state.appointments.filter(row => normalizeClientSearch(row.clientName).includes(normalizeClientSearch(filters.client)) && (!filters.service || row.serviceId === filters.service) && (selectedAppointmentStatuses(filters.status) ?? []).includes(row.status)).map(appointmentDTO); return <AppointmentLocateResults appointments={rows} status="Exhausted" timeZone={zone} onLoadMore={() => {}} onLocate={onLocate} />; }
