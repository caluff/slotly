import { z } from "zod";

const name = z.string().min(1).max(100).regex(/^[^\p{Cc}]+$/u);
const id = z.string().min(1).max(80);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(`${value}T12:00:00Z`); return Number.isFinite(+parsed) && parsed.toISOString().startsWith(value); });
const minute = z.number().int().min(0).max(1440);
const serviceSchema = z.object({ id, name, duration: z.number().int().min(15).max(480).multipleOf(5), archived: z.boolean(), version: z.number().int().nonnegative().default(0) });
const clientSchema = z.object({ id, name, email: z.email().max(254) });
const appointmentSchema = z.object({ id, clientId: id, clientName: name, serviceId: id, serviceName: name, duration: z.number().int().min(15).max(480), date, start: minute, status: z.enum(["confirmed", "completed", "cancelled", "no_show"]), version: z.number().int().nonnegative().default(0), calendarArchivedAt: z.number().optional() });
const blockSchema = z.object({ id, date, start: minute, end: minute, reason: z.string().max(240), version: z.number().int().nonnegative(), active: z.boolean() });
const daySchema = z.object({ open: z.boolean(), start: minute, end: minute });
const receiptSchema = z.object({ operationId: id, kind: z.enum(["appointment", "client"]), payload: z.string().max(1600), id });
const stateSchema = z.object({ version: z.literal(1), anchor: date, clients: z.array(clientSchema).max(200), services: z.array(serviceSchema).max(40), appointments: z.array(appointmentSchema).max(200), week: z.array(daySchema).length(7), blocks: z.array(blockSchema).max(100).default([]), receipts: z.array(receiptSchema).max(400).default([]) });
export type DemoState = z.infer<typeof stateSchema>;
export type DemoAppointment = z.infer<typeof appointmentSchema>;
export type DemoClient = z.infer<typeof clientSchema>;
export type DemoService = z.infer<typeof serviceSchema>;
export type DemoWeek = DemoState["week"];
export type DemoBlock = z.infer<typeof blockSchema>;
export const demoStatusLabels = { confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" } as const;
export const demoWeekDays = [{ day: 1, name: "Lunes" }, { day: 2, name: "Martes" }, { day: 3, name: "Miércoles" }, { day: 4, name: "Jueves" }, { day: 5, name: "Viernes" }, { day: 6, name: "Sábado" }, { day: 0, name: "Domingo" }];
const storageKey = "slotly-interactive-demo-v1";
const normalizedName = (value: string) => value.normalize("NFC").trim().replace(/\s+/gu, " ");
export const demoTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export const demoMinutes = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
export function demoDateOffset(value: string, days: number) { const result = new Date(`${value}T12:00:00Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10); }

export function makeDemoState(): DemoState {
  const anchor = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const weekDay = new Date(`${anchor}T12:00Z`).getUTCDay();
  const firstDay = demoDateOffset(anchor, weekDay === 0 ? 1 : weekDay === 6 ? 2 : 0);
  function businessDate(offset: number) { let day = firstDay; for (let index = 0; index < offset; index++) { day = demoDateOffset(day, 1); while ([0, 6].includes(new Date(`${day}T12:00Z`).getUTCDay())) day = demoDateOffset(day, 1); } return day; }
  const clients = ["Lucía Fernández", "Martín Silva", "Vera Costa", "Diego Méndez", "Ana Pereira", "Nicolás Ruiz"].map((name, index) => ({ id: `demo-client-${index}`, name, email: `cliente${index + 1}@example.test` }));
  const services = [{ id: "demo-initial", name: "Consulta inicial", duration: 45, archived: false, version: 0 }, { id: "demo-followup", name: "Seguimiento", duration: 30, archived: false, version: 0 }, { id: "demo-session", name: "Sesión personalizada", duration: 60, archived: false, version: 0 }];
  const appointments = [
    { client: 0, service: 0, day: 0, start: 540, status: "confirmed" },
    { client: 1, service: 1, day: 0, start: 630, status: "completed" },
    { client: 2, service: 2, day: 1, start: 600, status: "confirmed" },
    { client: 3, service: 1, day: 2, start: 660, status: "cancelled" },
    { client: 4, service: 0, day: 3, start: 840, status: "confirmed" },
    { client: 5, service: 1, day: 4, start: 555, status: "confirmed" },
  ].map((row, index) => ({ id: `demo-appointment-${index}`, clientId: clients[row.client].id, clientName: clients[row.client].name, serviceId: services[row.service].id, serviceName: services[row.service].name, duration: services[row.service].duration, date: businessDate(row.day), start: row.start, status: row.status as DemoAppointment["status"], version: 0 }));
  return { version: 1, anchor: firstDay, clients, services, appointments, blocks: [], receipts: [], week: Array.from({ length: 7 }, (_, day) => ({ open: day > 0 && day < 6, start: 540, end: 1080 })) };
}

export function demoPlacementError(state: DemoState, day: string, start: number, duration: number, exclude?: string): string | null {
  if (!date.safeParse(day).success || !Number.isInteger(start) || start % 15 !== 0) return "Elige una fecha válida y un inicio en intervalos de 15 minutos.";
  const schedule = state.week[new Date(`${day}T12:00Z`).getUTCDay()];
  if (!schedule.open) return "Ese día está cerrado. Elige otro o cambia el horario de la demo.";
  if (start < schedule.start || start + duration > schedule.end) return "La cita debe caber completa en el horario de atención.";
  if (state.appointments.some(row => row.id !== exclude && row.date === day && (row.status === "confirmed" || row.status === "completed") && start < row.start + row.duration && row.start < start + duration)) return "Ese horario está ocupado. Prueba otra franja.";
  if (state.blocks.some(row => row.active && row.date === day && start < row.end && row.start < start + duration)) return "Ese horario tiene un bloqueo. Prueba otra franja.";
  return null;
}

// This store never imports a backend client. Only fictional data reaches this tab's sessionStorage.
export function createDemoStore() {
  let current: DemoState | null = null;
  const listeners = new Set<() => void>();
  const snapshot = () => {
    if (!current) {
      try { current = stateSchema.parse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null")); } catch { current = makeDemoState(); }
    }
    return current;
  };
  const commit = (next: DemoState) => {
    current = stateSchema.parse(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(current)); } catch { /* The demo still works in memory when browser storage is disabled. */ }
    listeners.forEach(listener => listener());
  };
  return {
    snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    reset() { commit(makeDemoState()); },
    saveClient(rawName: string, rawEmail: string, operationId?: string) {
      const state = snapshot();
      const payload = JSON.stringify([rawName, rawEmail]);
      const receipt = state.receipts.find(row => row.kind === "client" && row.operationId === operationId);
      if (receipt && receipt.payload !== payload) throw new Error("El intento pertenece a otros datos. Reinicia el formulario.");
      if (receipt) return state.clients.find(row => row.id === receipt.id)!;
      const input = clientSchema.omit({ id: true }).safeParse({ name: normalizedName(rawName), email: rawEmail.trim().toLowerCase() });
      if (!input.success) throw new Error("Escribe un nombre de hasta 100 caracteres y un correo válido.");
      const existing = state.clients.find(row => row.email === input.data.email);
      if (!existing && state.clients.length >= 200) throw new Error("La demo está llena. Reiníciala para seguir probando.");
      const client = existing ?? { ...input.data, id: crypto.randomUUID() };
      commit({ ...state, clients: existing ? state.clients : [...state.clients, client], receipts: operationId ? [...state.receipts.slice(-399), { operationId, kind: "client", payload, id: client.id }] : state.receipts }); return client;
    },
    book(input: { name: string; email: string; clientId: string; serviceId: string; date: string; start: number; operationId: string }) {
      const state = snapshot(), service = state.services.find(row => row.id === input.serviceId && !row.archived);
      const payload = JSON.stringify(input);
      const receipt = state.receipts.find(row => row.kind === "appointment" && row.operationId === input.operationId);
      if (receipt && receipt.payload !== payload) throw new Error("El intento pertenece a otros datos. Reinicia el formulario.");
      if (receipt) return state.appointments.find(row => row.id === receipt.id)!;
      if (!service) throw new Error("Elige un servicio activo.");
      const problem = demoPlacementError(state, input.date, input.start, service.duration);
      if (problem) throw new Error(problem);
      if (state.appointments.length >= 200) throw new Error("La demo está llena. Reiníciala para seguir probando.");
      let client = state.clients.find(row => row.id === input.clientId);
      if (!client) {
        const result = clientSchema.omit({ id: true }).safeParse({ name: normalizedName(input.name), email: input.email.trim().toLowerCase() });
        if (!result.success) throw new Error("Escribe un nombre de hasta 100 caracteres y un correo válido.");
        client = state.clients.find(row => row.email === result.data.email) ?? { ...result.data, id: crypto.randomUUID() };
      }
      if (!state.clients.some(row => row.id === client.id) && state.clients.length >= 200) throw new Error("La demo está llena. Reiníciala para seguir probando.");
      const appointment: DemoAppointment = { id: crypto.randomUUID(), clientId: client.id, clientName: client.name, serviceId: service.id, serviceName: service.name, duration: service.duration, date: input.date, start: input.start, status: "confirmed", version: 0 };
      commit({ ...state, clients: state.clients.some(row => row.id === client.id) ? state.clients : [...state.clients, client], appointments: [...state.appointments, appointment], receipts: [...state.receipts.slice(-399), { operationId: input.operationId, kind: "appointment", payload, id: appointment.id }] }); return appointment;
    },
    move(id: string, date: string, start: number) {
      const state = snapshot(), target = state.appointments.find(row => row.id === id);
      if (!target || target.status !== "confirmed") throw new Error("Solo puedes mover una cita confirmada.");
      const problem = demoPlacementError(state, date, start, target.duration, id);
      if (problem) throw new Error(problem);
      commit({ ...state, appointments: state.appointments.map(row => row.id === id ? { ...row, date, start, version: row.version + 1 } : row) });
    },
    status(id: string, status: DemoAppointment["status"]) {
      const state = snapshot();
      commit({ ...state, appointments: state.appointments.map(row => row.id === id && row.status === "confirmed" ? { ...row, status, version: row.version + 1 } : row) });
    },
    saveService(service: DemoService) {
      const state = snapshot(), result = serviceSchema.safeParse({ ...service, name: normalizedName(service.name) });
      if (!result.success) throw new Error("Escribe un nombre y una duración entre 15 y 480 minutos, en múltiplos de 5.");
      if (!state.services.some(row => row.id === service.id) && state.services.length >= 40) throw new Error("La demo admite hasta 40 servicios.");
      commit({ ...state, services: state.services.some(row => row.id === service.id) ? state.services.map(row => row.id === service.id ? { ...result.data, version: row.version + 1 } : row) : [...state.services, result.data] });
    },
    saveWeek(week: DemoWeek) {
      if (week.some(day => day.open && (!Number.isInteger(day.start) || !Number.isInteger(day.end) || day.start % 15 || day.end % 15 || day.start >= day.end))) throw new Error("Cada día abierto necesita un inicio anterior al cierre, en pasos de 15 minutos.");
      commit({ ...snapshot(), week });
    },
    restoreAppointment(appointment: DemoAppointment) {
      const state = snapshot(), current = state.appointments.find(row => row.id === appointment.id);
      const problem = demoPlacementError(state, appointment.date, appointment.start, appointment.duration, appointment.id);
      if (appointment.status === "confirmed" && problem) throw new Error(problem);
      commit({ ...state, appointments: state.appointments.map(row => row.id === appointment.id ? { ...appointment, version: (current?.version ?? row.version) + 1 } : row) });
    },
    archive(id: string, archived: boolean) {
      const state = snapshot();
      commit({ ...state, appointments: state.appointments.map(row => row.id === id && row.status === "cancelled" ? { ...row, calendarArchivedAt: archived ? Date.now() : undefined } : row) });
    },
    saveBlock(block: DemoBlock) {
      const state = snapshot();
      if (block.active && (block.start >= block.end || block.start % 15 || block.end % 15)) throw new Error("Revisa el intervalo del bloqueo.");
      if (block.active && (state.appointments.some(row => row.date === block.date && ["confirmed", "completed"].includes(row.status) && block.start < row.start + row.duration && row.start < block.end) || state.blocks.some(row => row.id !== block.id && row.active && row.date === block.date && block.start < row.end && row.start < block.end))) throw new Error("Ese intervalo está ocupado.");
      if (!state.blocks.some(row => row.id === block.id) && state.blocks.length >= 100) throw new Error("Reinicia la demo para seguir creando bloqueos.");
      commit({ ...state, blocks: state.blocks.some(row => row.id === block.id) ? state.blocks.map(row => row.id === block.id ? block : row) : [...state.blocks, block] });
    },
  };
}
export type DemoStore = ReturnType<typeof createDemoStore>;
