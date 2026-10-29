"use client";

import { useMutation, useQuery } from "convex/react";
import { WeeklyScheduleForm } from "@/components/weekly-schedule-form";
import { api } from "@/convex/_generated/api";
import type { WeeklyScheduleValues } from "@/lib/weekly-schedule-schema";
import { useLastDefined } from "@/components/use-last-defined";
import { BusinessSpecialDates } from "@/components/business-special-dates";
import { FormSkeleton } from "@/components/loading-screens";

type WeeklySchedulePanelProps = {
  schedule: WeeklyScheduleValues | null | undefined;
  timeZone: string;
  onSave: (values: WeeklyScheduleValues) => Promise<unknown>;
};

export function BusinessWeeklySchedule({ timeZone, enabled = true }: { timeZone: string; enabled?: boolean }) {
  const schedule = useLastDefined(useQuery(api.weeklySchedule.getMyWeeklySchedule, enabled ? {} : "skip"));
  const saveSchedule = useMutation(api.weeklySchedule.saveMyWeeklySchedule);
  return <><WeeklySchedulePanel schedule={schedule} timeZone={timeZone} onSave={saveSchedule} /><BusinessSpecialDates timeZone={timeZone} enabled={enabled} /></>;
}

// The same panel/form can be exercised with local responses without a Convex
// client or synthetic writes to real accounts.
export function WeeklySchedulePanel({ schedule, timeZone, onSave }: WeeklySchedulePanelProps) {
  return (
    <div className="max-w-3xl">
      <h1 id="schedule-heading" tabIndex={-1} className="workspace-title">Horario de atención</h1>
      <p className="workspace-description">Define tu semana habitual. Los cambios se aplican cuando guardas la semana completa.</p>
      <p className="mt-3 text-sm text-muted">Hora local · <span className="wrap-anywhere">{timeZone}</span></p>
      <div className="mt-8">
        {schedule === undefined
          ? <FormSkeleton compact label="Cargando horario de atención" />
          : <WeeklyScheduleForm schedule={schedule} onSave={onSave} />}
      </div>
    </div>
  );
}
