"use client";

import { Checkbox } from "radix-ui";
import { Check, Search } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Id } from "@/convex/_generated/dataModel";
import { agendaFilterError, type AgendaFilters } from "@/lib/appointment-search";
import { toggleCalendarStatus } from "@/lib/agenda-calendar";

export function AgendaFiltersForm({ filters, services, moreServices, loadingServices, onLoadServices, onSearch, onNameSearch = onSearch }: {
  filters: AgendaFilters; services: { _id: Id<"services">; name: string }[]; moreServices?: boolean; loadingServices?: boolean;
  onLoadServices?: () => void; onSearch: (values: AgendaFilters) => void; onNameSearch?: (values: AgendaFilters) => void;
}) {
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(filters.client), [applied, setApplied] = useState(filters.client);
  if (applied !== filters.client) { setApplied(filters.client); setDraft(filters.client); }
  function current() {
    const query = new URLSearchParams(window.location.search);
    return { ...filters, client: query.get('cliente') ?? '', service: query.get('servicio') ?? '', status: query.get('estado') ?? '' };
  }
  function apply(values: AgendaFilters, byName = false) {
    const invalid = agendaFilterError(values); setError(invalid); if (!invalid) (byName ? onNameSearch : onSearch)(values);
  }
  function submit(event: FormEvent) { event.preventDefault(); if (submitting.current) return; submitting.current = true; try { apply({ ...current(), client: draft.trim() }, true); } finally { queueMicrotask(() => { submitting.current = false; }); } }
  return <form aria-label="Filtrar citas" onSubmit={submit} className="mt-6 space-y-4">
    <Field className="gap-2"><FieldLabel htmlFor="search-client">Nombre del cliente</FieldLabel><div className="agenda-name-search"><Input id="search-client" name="client" type="search" maxLength={100} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Nombre o parte del nombre" aria-describedby="search-name-help" /><Button type="submit" size="icon" variant="ghost" aria-label="Buscar por nombre" aria-haspopup="dialog" aria-controls="agenda-name-results"><Search aria-hidden="true" /></Button></div>{draft !== filters.client && <p className="text-xs text-muted">{filters.client ? `Aplicado: ${filters.client}` : 'Nombre sin aplicar'}</p>}</Field>
    <Field className="gap-2"><FieldLabel htmlFor="search-service">Servicio</FieldLabel><NativeSelect id="search-service" name="service" className="w-full" value={filters.service} onChange={event => apply({ ...current(), service: event.target.value })}>
      <option value="">Todos los servicios</option>{filters.service && !services.some(s => s._id === filters.service) && <option value={filters.service}>Servicio del enlace</option>}{services.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
    </NativeSelect></Field>
    {moreServices && <Button variant="outline" type="button" disabled={loadingServices} onClick={onLoadServices}>{loadingServices ? "Cargando servicios…" : "Más servicios"}</Button>}
    <fieldset><legend className="mb-1 text-sm font-medium">Estado</legend>
      {([{ value: "confirmed", label: "Confirmadas", color: "text-accent" }, { value: "cancelled", label: "Canceladas", color: "text-destructive" }] as const).map(item => {
        const checked = !filters.status || filters.status === item.value;
        return <Checkbox.Root key={item.value} asChild checked={checked} onCheckedChange={() => { const values = current(); apply({ ...values, status: toggleCalendarStatus(values.status, item.value) }); }}>
          <Button type="button" variant="ghost" className={`w-full justify-start px-2 ${item.color}`}><span className="flex size-4 items-center justify-center rounded-sm border border-current" aria-hidden="true"><Checkbox.Indicator><Check className="size-3" /></Checkbox.Indicator></span>{item.label}</Button>
        </Checkbox.Root>;
      })}
    </fieldset>
    <p id="search-name-help" className="sr-only">Escribe un fragmento con o sin tildes y pulsa Enter o Buscar por nombre para consultar todas las fechas. Servicio y estado se aplican al cambiar; conservan el último nombre aplicado.</p>
    {(error || agendaFilterError(filters)) && <p role="alert" className="text-sm text-destructive">{error || agendaFilterError(filters)}</p>}
  </form>;
}
