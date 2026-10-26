type Snapshot = { businessName: string; serviceName: string; clientName: string; date: string;
  start: number; end: number; timeZone: string };
const clean = (value: string) => value.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/gu, " ").trim();
const escape = (value: string) => clean(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export function confirmationEmail(snapshot: Snapshot, from: string, to: string) {
  const date = new Intl.DateTimeFormat("es-UY", { dateStyle: "full", timeZone: snapshot.timeZone }).format(snapshot.start);
  const time = new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: snapshot.timeZone });
  const interval = `${time.format(snapshot.start)}–${time.format(snapshot.end)}`;
  const subject = `Cita confirmada · ${clean(snapshot.businessName)}`.slice(0, 150);
  const text = `Slotly\n\nCita confirmada\n\nHola, ${clean(snapshot.clientName)}.\nTu cita con ${clean(snapshot.businessName)} está confirmada.\n\nServicio: ${clean(snapshot.serviceName)}\nFecha: ${date}\nHorario: ${interval}\nZona horaria: ${snapshot.timeZone}\n\nEsta confirmación corresponde a los datos de la reserva al crearla.`;
  const html = `<!doctype html><html lang="es-UY" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:#f4f7f5;color:#172720;font-family:Arial,sans-serif"><div lang="es-UY" dir="ltr" style="max-width:560px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #d5dfd9;border-radius:6px;padding:28px;overflow-wrap:anywhere;word-break:break-word"><p style="margin:0 0 24px;color:#24583e;font-size:18px;font-weight:bold">Slotly</p><h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">Cita confirmada</h1><p style="font-size:16px;line-height:1.6">Hola, ${escape(snapshot.clientName)}.<br>Tu cita con ${escape(snapshot.businessName)} está confirmada.</p><dl style="font-size:16px;line-height:1.6"><dt style="font-weight:bold">Servicio</dt><dd style="margin:0 0 16px">${escape(snapshot.serviceName)}</dd><dt style="font-weight:bold">Fecha</dt><dd style="margin:0 0 16px">${escape(date)}</dd><dt style="font-weight:bold">Horario</dt><dd style="margin:0 0 16px">${escape(interval)}</dd><dt style="font-weight:bold">Zona horaria</dt><dd style="margin:0">${escape(snapshot.timeZone)}</dd></dl><p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#46584b">Esta confirmación corresponde a los datos de la reserva al crearla.</p></div></div></body></html>`;
  return { from, to: [to], subject, html, text };
}
