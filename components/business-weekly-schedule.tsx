"use client";

import { useMutation, useQuery } from "convex/react";
import { WeeklyScheduleForm } from "@/components/weekly-schedule-form";
import { api } from "@/convex/_generated/api";
import type { WeeklyScheduleValues } from "@/lib/weekly-schedule-schema";

type WeeklySchedulePanelProps = {
  schedule: WeeklyScheduleValues | null | undefined;
  timeZone: string;
  onSave: (values: WeeklyScheduleValues) => Promise<unknown>;
};

export function BusinessWeeklySchedule({ timeZone }: { timeZone: string }) {
  const schedule = useQuery(api.weeklySchedule.getMyWeeklySchedule, {});
  const saveSchedule = useMutation(api.weeklySchedule.saveMyWeeklySchedule);
  return <WeeklySchedulePanel schedule={schedule} timeZone={timeZone} onSave={saveSchedule} />;
}

// The same panel/form can be exercised with local responses without a Convex
// client or synthetic writes to real accounts.
export function WeeklySchedulePanel({ schedule, timeZone, onSave }: WeeklySchedulePanelProps) {
  return (
    <section aria-labelledby="schedule-heading" className="mt-10 max-w-2xl border-t border-line pt-8">
      <h2 id="schedule-heading" className="text-2xl font-semibold tracking-tight">Horario de atención</h2>
      <p className="mt-2 text-sm text-muted">Hora local: <span className="wrap-anywhere">{timeZone}</span></p>
      <div className="mt-6">
        {schedule === undefined
          ? <p role="status" className="text-sm text-muted">Cargando tu horario…</p>
          : <WeeklyScheduleForm schedule={schedule} onSave={onSave} />}
      </div>
    </section>
  );
}
