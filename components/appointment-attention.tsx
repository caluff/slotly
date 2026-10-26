"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { DropdownMenu, Popover } from "radix-ui";
import {
  Bell,
  Check,
  X,
  Settings,
  ChevronLeft,
  EllipsisVertical,
} from "@/components/ui/icons";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  useAppointmentResults,
  type ResultAppointment,
} from "@/components/appointment-results";
import {
  currentNotificationState,
  enableSystemNotifications,
  showSystemReminder,
  type SystemNotificationState,
  readSystemNotificationPreference,
  writeSystemNotificationPreference,
  systemNotificationPreferenceKey,
} from "@/lib/browser-notifications";

import {
  ConnectedAppointmentAction,
  type AppointmentActionProps,
} from "@/components/appointment-search";

type Notice = FunctionReturnType<
  typeof api.appointments.listMyAppointmentNotices
>["page"][number];
const minute = 60000;
const AttentionContext = createContext<ReactNode>(null);
export function AppointmentAttentionBell() {
  return useContext(AttentionContext);
}
export function ConnectedAppointmentAttention({
  businessId,
  timeZone,
  enabled,
  children,
}: {
  businessId: string;
  timeZone: string;
  enabled: boolean;
  children: ReactNode;
}) {
  const getClock = useAction(api.appointments.getMyAttentionClock);
  const [clock, setClock] = useState<{ at: number; sent: number } | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [system, setSystem] = useState<SystemNotificationState>("off");
  const delivered = useRef(new Set<string>()),
    preference = useRef(true);
  const [systemEnabled, setSystemEnabled] = useState<boolean | null>(null);
  const candidates = useQuery(
    api.appointments.getMyAttentionCandidates,
    enabled && clock ? { anchor: Math.floor(clock.at) } : "skip",
  );
  const notices = usePaginatedQuery(
    api.appointments.listMyAppointmentNotices,
    enabled ? {} : "skip",
    { initialNumItems: 5 },
  );
  const read = useMutation(api.appointments.readMyAppointmentNotice),
    claim = useMutation(api.appointments.claimMySystemReminder);
  useEffect(() => {
    if (!enabled) return;
    let live = true,
      request = 0;
    async function refresh() {
      const serial = ++request;
      try {
        const at = await getClock();
        if (live && serial === request) {
          setClock({ at, sent: performance.now() });
          setNow(at);
        }
      } catch {
        /* Fail closed once the last server clock expires. */
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 20000);
    const resume = () => void refresh();
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [enabled, getClock]);
  useEffect(() => {
    if (!clock || !enabled) return;
    const tick = () =>
      setNow(
        performance.now() - clock.sent < 60000
          ? clock.at + performance.now() - clock.sent
          : null,
      );
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [clock, enabled]);
  useEffect(() => {
    let live = true;
    async function refresh() {
      const wanted = readSystemNotificationPreference(businessId);
      preference.current = wanted;
      setSystemEnabled(wanted);
      if (!wanted) {
        setSystem("off");
        return;
      }
      try {
        const state = await currentNotificationState();
        if (live && preference.current) setSystem(state);
      } catch {
        if (live && preference.current) setSystem("unavailable");
      }
    }
    const changed = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === systemNotificationPreferenceKey(businessId)
      )
        void refresh();
    };
    void refresh();
    window.addEventListener("storage", changed);
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      window.removeEventListener("storage", changed);
      window.removeEventListener("focus", refresh);
    };
  }, [businessId]);
  async function enable(explicit = false) {
    if (!readSystemNotificationPreference(businessId)) return;
    try {
      const state = await enableSystemNotifications(explicit);
      if (preference.current) setSystem(state);
    } catch {
      if (preference.current) setSystem("unavailable");
    }
  }
  function changeSystemPreference(wanted: boolean) {
    preference.current = wanted;
    writeSystemNotificationPreference(businessId, wanted);
    setSystemEnabled(wanted);
    if (wanted) void enable(true);
    else setSystem("off");
  }
  useEffect(() => {
    if (
      !enabled ||
      systemEnabled !== true ||
      system !== "ready" ||
      now === null
    )
      return;
    let live = true;
    async function deliver() {
      for (const notice of notices.results) {
        const delta = (notice.currentAppointment?.start ?? Infinity) - now!;
        const key = notice._id + ":" + notice.stage;
        if (
          !live ||
          delivered.current.has(key) ||
          notice.kind !== "reminder" ||
          !notice.contextCurrent ||
          notice.read ||
          delta <= 0 ||
          delta > 15 * minute
        )
          continue;
        delivered.current.add(key);
        try {
          const claimed = await claim({
            noticeId: notice._id,
            stage: notice.stage,
            operationId: crypto.randomUUID(),
          });
          if (claimed && live && preference.current)
            await showSystemReminder(notice._id, () => live && preference.current);
        } catch {
          if (live) setSystem("unavailable");
        }
      }
    }
    void deliver();
    return () => {
      live = false;
    };
  }, [enabled, systemEnabled, system, now, notices.results, claim]);
  return (
    <AppointmentAttention
      timeZone={timeZone}
      now={enabled ? now : null}
      candidates={candidates ?? []}
      notices={notices.results}
      more={
        notices.status === "CanLoadMore" || notices.status === "LoadingMore"
      }
      loadingMore={notices.status === "LoadingMore"}
      onMore={() => notices.loadMore(5)}
      onRead={(notice) =>
        read({
          noticeId: notice._id,
          stage: notice.stage,
          operationId: crypto.randomUUID(),
        })
      }
      onPermissionGesture={() => {
        void enable();
      }}
      system={system}
      systemEnabled={systemEnabled ?? true}
      onSystemEnabledChange={changeSystemPreference}
    >
      {children}
    </AppointmentAttention>
  );
}

type ActionComponent = ComponentType<
  AppointmentActionProps & {
    timeZone: string;
    dayHref: (date: string) => string;
  }
>;
type NoticeAction = "arrival" | "cancel" | "reschedule" | "undo";
function NotificationMenu({
  notice,
  now,
  blocked,
  onAction,
}: {
  notice: Notice;
  now: number | null;
  blocked: boolean;
  onAction: (action: NoticeAction, trigger: HTMLButtonElement | null) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null),
    pending = useRef<NoticeAction | null>(null);
  const row = notice.currentAppointment;
  const live = notice.contextCurrent && !!row,
    confirmed = live && row?.status === "confirmed";
  const windowOpen = !!(
    confirmed &&
    now !== null &&
    row &&
    Math.abs(row.start - now) <= 300000 &&
    now < row.end
  );
  const canMove = !!(confirmed && now !== null && row && row.start > now);
  const common = blocked
    ? "Hay una operación pendiente."
    : !live
      ? "La cita cambió desde este aviso."
      : !confirmed
        ? "Esta cita ya no está confirmada."
        : now === null
          ? "Esperando el reloj del servidor."
          : "";
  const windowReason =
    common ||
    (!windowOpen
      ? "Disponible entre cinco minutos antes y después del inicio."
      : "");
  const moveReason =
    common || (!canMove ? "Solo se puede reprogramar antes del inicio." : "");
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          ref={trigger}
          size="icon"
          variant="ghost"
          aria-label={
            "Opciones de " +
            (notice.appointment?.clientName ?? "la notificación anterior")
          }
        >
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="appointment-notice-menu"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          onCloseAutoFocus={(event) => {
            const action = pending.current;
            pending.current = null;
            if (action) {
              event.preventDefault();
              onAction(action, trigger.current);
            }
          }}
        >
          <DropdownMenu.Item
            disabled={!windowOpen || blocked}
            aria-label={"Ya llegó" + (windowReason ? ". " + windowReason : "")}
            className="appointment-notice-menu-item"
            onSelect={() => {
              pending.current = "arrival";
            }}
          >
            Ya llegó
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={!canMove || blocked}
            aria-label={"Reprogramar" + (moveReason ? ". " + moveReason : "")}
            className="appointment-notice-menu-item"
            onSelect={() => {
              pending.current = "reschedule";
            }}
          >
            Reprogramar
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={!windowOpen || blocked}
            aria-label={
              "Cancelar Cita" + (windowReason ? ". " + windowReason : "")
            }
            className="appointment-notice-menu-item appointment-notice-destructive"
            onSelect={() => {
              pending.current = "cancel";
            }}
          >
            Cancelar Cita
          </DropdownMenu.Item>
          {notice.undo && notice.contextCurrent && (
            <>
              <DropdownMenu.Separator className="appointment-notice-menu-separator" />
              <DropdownMenu.Item
                disabled={blocked}
                className="appointment-notice-menu-item"
                onSelect={() => {
                  pending.current = "undo";
                }}
              >
                Deshacer
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
function relativePublication(at: number, now: number | null, exact: string) {
  if (now === null) return exact;
  const minutes = Math.max(0, Math.floor((now - at) / 60000));
  if (minutes === 0) return "Ahora";
  if (minutes < 60)
    return "Hace " + minutes + (minutes === 1 ? " minuto" : " minutos");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "Hace " + hours + (hours === 1 ? " hora" : " horas");
  const days = Math.floor(hours / 24);
  return "Hace " + days + (days === 1 ? " día" : " días");
}
export function AppointmentAttention({
  timeZone,
  now,
  publicationNow = now,
  candidates,
  notices,
  more = false,
  loadingMore = false,
  onMore,
  onRead,
  onPermissionGesture,
  system = "off",
  systemEnabled = true,
  onSystemEnabledChange,
  actionComponent: Action = ConnectedAppointmentAction,
  children,
}: {
  timeZone: string;
  now: number | null;
  /** Separate age clock for synthetic scenes; production uses the server clock above. */
  publicationNow?: number | null;
  candidates: ResultAppointment[];
  notices: Notice[];
  more?: boolean;
  loadingMore?: boolean;
  onMore?: () => void | Promise<unknown>;
  onRead: (notice: Notice) => Promise<unknown>;
  onPermissionGesture?: () => void;
  system?: SystemNotificationState;
  systemEnabled?: boolean;
  onSystemEnabledChange?: (enabled: boolean) => void;
  actionComponent?: ActionComponent;
  children: ReactNode;
}) {
  const results = useAppointmentResults(),
    [open, setOpen] = useState(false),
    [settings, setSettings] = useState(false),
    [dismissed, setDismissed] = useState<string[]>([]),
    [top, setTop] = useState<number | null>(null),
    [failedReads, setFailedReads] = useState<string[]>([]),
    [readRetry, setReadRetry] = useState(0),
    [groups, setGroups] = useState<Record<string, boolean>>({}),
    [loadError, setLoadError] = useState(false),
    [selected, setSelected] = useState<ResultAppointment | null>(null),
    [others, setOthers] = useState(false),
    [chosen, setChosen] = useState<string | null>(null);
  const bell = useRef<HTMLButtonElement>(null),
    body = useRef<HTMLDivElement>(null),
    gear = useRef<HTMLButtonElement>(null),
    readAttempts = useRef(new Set<string>()),
    mounted = useRef(false),
    loadLock = useRef(false),
    loadStartPage = useRef<string | null>(null),
    scrollIntent = useRef(false),
    openingDialog = useRef(false),
    touchY = useRef<number | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(5);
  const visibleNotices = notices.slice(0, visibleLimit);
  const key = (n: Notice) => n._id + ":" + n.stage;
  // Capture newly loaded phases before the read acknowledgement can regroup them.
  if (open && !settings && visibleNotices.some((n) => !(key(n) in groups))) {
    const next = { ...groups };
    for (const n of visibleNotices)
      if (!(key(n) in next)) next[key(n)] = !n.read;
    setGroups(next);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!open || settings) return;
    for (const notice of notices.slice(0, visibleLimit)) {
      const id = key(notice);
      if (notice.read || readAttempts.current.has(id)) continue;
      readAttempts.current.add(id);
      void Promise.resolve()
        .then(() => onRead(notice))
        .catch(() => {
          if (mounted.current)
            setFailedReads((keys) =>
              keys.includes(id) ? keys : [...keys, id],
            );
        });
    }
  }, [open, settings, notices, visibleLimit, onRead, readRetry]);
  function retryReads() {
    for (const id of failedReads) readAttempts.current.delete(id);
    setFailedReads([]);
    setReadRetry((n) => n + 1);
  }
  const hasReadError = visibleNotices.some(
    (n) => !n.read && failedReads.includes(key(n)),
  );
  const pageKey = notices
    .map((n) => key(n) + ":" + n.publishedAt)
    .join("|");
  useEffect(() => {
    if (loadingMore) return;
    if (loadStartPage.current !== null && pageKey === loadStartPage.current && more) return;
    loadStartPage.current = null;
    loadLock.current = false;
  }, [pageKey, loadingMore, more, visibleLimit]);
  function loadNext(retry = false) {
    if (loadingMore || loadLock.current || (loadError && !retry)) return;
    if (visibleLimit < notices.length) {
      loadLock.current = true;
      scrollIntent.current = false;
      setVisibleLimit((n) => n + 5);
      return;
    }
    if (!more || !onMore) return;
    loadLock.current = true;
    loadStartPage.current = pageKey;
    scrollIntent.current = false;
    setLoadError(false);
    setVisibleLimit((n) => n + 5);
    void Promise.resolve()
      .then(() => onMore())
      .catch(() => {
        loadLock.current = false;
        loadStartPage.current = null;
        if (mounted.current) setLoadError(true);
      });
  }
  function nearEnd() {
    const el = body.current;
    return !!el && el.scrollTop + el.clientHeight >= el.scrollHeight - 48;
  }
  useEffect(() => {
    const toolbar = document.querySelector(".agenda-toolbar"),
      update = () =>
        setTop(
          Math.max(12, (toolbar?.getBoundingClientRect().bottom ?? 56) + 8),
        );
    update();
    const observer = new ResizeObserver(update);
    if (toolbar) observer.observe(toolbar);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, []);
  function changeOpen(value: boolean) {
    if (value) {
      onPermissionGesture?.();
      retryReads();
      setGroups(Object.fromEntries(notices.slice(0, 5).map((n) => [key(n), !n.read])));
      setSettings(false);
      setVisibleLimit(5);
      setLoadError(false);
      loadLock.current = false;
      loadStartPage.current = null;
      scrollIntent.current = false;
    }
    setOpen(value);
  }
  const eligible =
    now === null
      ? []
      : candidates
          .filter(
            (r) =>
              r.status === "confirmed" &&
              Math.abs(r.start - now) <= 300000 &&
              now < r.end,
          )
          .sort((a, b) => a.start - b.start || a._id.localeCompare(b._id));
  const available = eligible.filter(
    (r) => !dismissed.includes(r._id + ":" + r.version),
  );
  const floating = available.find((r) => r._id === chosen) ?? available[0];
  const unread = notices.filter((n) => !n.read).length;
  const time = (at: number) =>
    new Intl.DateTimeFormat("es-UY", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(at);
  const dateTime = (at: number) =>
    new Intl.DateTimeFormat("es-UY", {
      timeZone,
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(at);
  const exactTime = (at: number) =>
    new Intl.DateTimeFormat("es-UY", {
      timeZone,
      dateStyle: "long",
      timeStyle: "medium",
    }).format(at);
  function dismiss(row: ResultAppointment) {
    setDismissed((values) => [...values, row._id + ":" + row.version]);
    requestAnimationFrame(() => bell.current?.focus());
  }
  function onAction(
    notice: Notice,
    action: NoticeAction,
    trigger: HTMLButtonElement | null,
  ) {
    const row = notice.currentAppointment;
    if (!notice.contextCurrent || !row) return;
    if (action === "reschedule") {
      openingDialog.current = true;
      setSelected(row);
      setOpen(false);
      return;
    }
    if (action === "undo" && notice.undo) void results?.undo(notice.undo);
    else if (action === "arrival") void results?.arrive(row);
    else if (action === "cancel") void results?.cancelWindow(row);
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus();
      else gear.current?.focus();
    });
  }
  function renderNotice(n: Notice) {
    const snapshot = n.appointment,
      exact = exactTime(n.publishedAt);
    return (
      <li
        key={key(n)}
        className="appointment-notice-row"
        data-read={n.read}
        data-current={n.contextCurrent}
      >
        <div className="appointment-notice-copy">
          <div className="appointment-notice-title">
            <p className="appointment-notice-name">
              {snapshot?.clientName ?? "Notificación anterior de cita"}
            </p>
            <span
              className="appointment-notice-state"
              role="img"
              aria-label={n.read ? "Leído" : "Sin leer"}
            >
              {n.read ? (
                <Check aria-hidden="true" />
              ) : (
                <span className="appointment-notice-dot" aria-hidden="true" />
              )}
            </span>
          </div>
          <p className="appointment-notice-meta">
            {dateTime(snapshot?.start ?? n.originalStart)}
            {snapshot ? " · " + snapshot.serviceName : ""}
          </p>
          {n.kind === "absence" && (
            <p className="appointment-notice-outcome">
              No asistió · automático
            </p>
          )}
          {!n.contextCurrent && (
            <p className="appointment-notice-context">
              {snapshot
                ? "Cita actualizada desde este aviso."
                : "Sin detalles históricos de la cita."}
            </p>
          )}
          <time
            className="appointment-notice-published"
            dateTime={new Date(n.publishedAt).toISOString()}
            title={exact}
            aria-label={"Emitida el " + exact}
          >
            {relativePublication(n.publishedAt, publicationNow, exact)}
          </time>
        </div>
        <NotificationMenu
          notice={n}
          now={now}
          blocked={!results || results.blocked}
          onAction={(action, trigger) => onAction(n, action, trigger)}
        />
      </li>
    );
  }
  const fresh = visibleNotices.filter((n) => groups[key(n)] ?? !n.read),
    read = visibleNotices.filter((n) => !(groups[key(n)] ?? !n.read));
  const bellUI = (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild>
        <Button
          ref={bell}
          size="icon"
          variant="ghost"
          aria-label={
            "Notificaciones" + (unread ? ", " + unread + " sin leer" : "")
          }
          className="appointment-notice-trigger"
        >
          <Bell aria-hidden="true" />
          {unread > 0 && (
            <span className="appointment-notice-badge">
              {unread > 99 ? "99+" : unread}
              {more && unread <= 99 ? "+" : ""}
            </span>
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="appointment-attention-list"
          sideOffset={8}
          collisionPadding={8}
          align="end"
          aria-label={
            settings ? "Ajustes de notificaciones" : "Notificaciones de citas"
          }
          onCloseAutoFocus={(event) => {
            if (openingDialog.current) {
              event.preventDefault();
              openingDialog.current = false;
            }
          }}
        >
          <div className="appointment-notice-heading">
            {settings && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Volver a notificaciones"
                onClick={() => setSettings(false)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
            )}
            <h2>{settings ? "Ajustes" : "Notificaciones"}</h2>
            {!settings && (
              <Button
                ref={gear}
                size="icon"
                variant="ghost"
                aria-label="Ajustes de notificaciones"
                onClick={() => setSettings(true)}
              >
                <Settings aria-hidden="true" />
              </Button>
            )}
          </div>
          {settings ? (
            <div className="appointment-notice-settings">
              <div className="appointment-notice-setting">
                <span>Avisos del sistema</span>
                <Button
                  size="icon"
                  variant="ghost"
                  role="switch"
                  aria-label="Avisos del sistema"
                  aria-checked={systemEnabled}
                  className="appointment-notice-switch"
                  onClick={() => onSystemEnabledChange?.(!systemEnabled)}
                >
                  <span
                    className="appointment-notice-switch-track"
                    aria-hidden="true"
                  >
                    <span />
                  </span>
                </Button>
              </div>
              <p>
                {system === "denied"
                  ? "Permiso bloqueado. Puedes cambiarlo en los ajustes del navegador."
                  : system === "unsupported"
                    ? "Este navegador no admite avisos del sistema."
                    : system === "unavailable"
                      ? "No se pudieron preparar los avisos. Desactiva y activa la opción para reintentar."
                      : systemEnabled && system === "off"
                        ? "El navegador todavía no concedió el permiso."
                        : "Disponibles mientras Slotly esté abierto."}
              </p>
            </div>
          ) : (
            <>
              {hasReadError && (
                <div role="alert" className="appointment-notice-error">
                  <p>No se pudo guardar la lectura de algunos avisos.</p>
                  <Button
                    variant="ghost"
                    className="appointment-notice-action"
                    aria-label="Reintentar lectura"
                    onClick={() => {
                      retryReads();
                      requestAnimationFrame(() => gear.current?.focus());
                    }}
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              {loadError && (
                <div role="alert" className="appointment-notice-error">
                  <p>No se pudieron cargar más notificaciones.</p>
                  <Button
                    variant="ghost"
                    className="appointment-notice-action"
                    aria-label="Reintentar carga"
                    onClick={() => loadNext(true)}
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              <div
                ref={body}
                className="appointment-notice-body"
                tabIndex={0}
                role="region"
                aria-label="Lista de notificaciones"
                onScroll={() => {
                  if (scrollIntent.current && nearEnd()) loadNext();
                }}
                onWheel={(event) => {
                  if (event.deltaY > 0) {
                    scrollIntent.current = true;
                    if (nearEnd()) loadNext();
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    ["ArrowDown", "PageDown", "End"].includes(event.key)
                  ) {
                    scrollIntent.current = true;
                    if (nearEnd()) loadNext();
                  }
                }}
                onPointerDown={() => { scrollIntent.current = true; }}
                onTouchStart={(event) => {
                  scrollIntent.current = true;
                  touchY.current = event.touches[0]?.clientY ?? null;
                }}
                onTouchMove={(event) => {
                  const next = event.touches[0]?.clientY;
                  if (
                    next !== undefined &&
                    touchY.current !== null &&
                    touchY.current - next > 8 &&
                    nearEnd()
                  )
                    loadNext();
                  touchY.current = next ?? null;
                }}
              >
                {visibleNotices.length === 0 ? (
                  <div className="appointment-notice-empty">
                    <Bell aria-hidden="true" />
                    <p>Sin notificaciones.</p>
                  </div>
                ) : (
                  <>
                    {fresh.length > 0 && (
                      <section aria-label="Nuevas en esta apertura">
                        <h3 className="appointment-notice-group">Nuevas</h3>
                        <ul className="appointment-notice-items">
                          {fresh.map(renderNotice)}
                        </ul>
                      </section>
                    )}
                    {read.length > 0 && (
                      <section aria-label="Leídas">
                        <h3 className="appointment-notice-group">Leídas</h3>
                        <ul className="appointment-notice-items">
                          {read.map(renderNotice)}
                        </ul>
                      </section>
                    )}
                  </>
                )}
                {loadingMore && (
                  <p role="status" className="appointment-notice-end">
                    Cargando notificaciones…
                  </p>
                )}
                {!more &&
                  visibleLimit >= notices.length &&
                  notices.length > 0 && (
                    <p className="appointment-notice-end">
                      No hay más notificaciones.
                    </p>
                  )}
              </div>
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
  return (
    <AttentionContext.Provider value={bellUI}>
      {children}
      {selected && (
        <Action
          appointment={selected}
          latest={selected}
          mode="reschedule"
          timeZone={timeZone}
          dayHref={(date) => {
            const params = new URLSearchParams(window.location.search);
            params.set("fecha", date);
            params.set("calendario", "dia");
            return "/dashboard?" + params;
          }}
          onClose={() => setSelected(null)}
          onReturnFocus={() => {
            requestAnimationFrame(() => bell.current?.focus());
          }}
          onMoved={() => {
            /* Existing dialog owns its completion feedback. */
          }}
        />
      )}{" "}
      {floating &&
        top !== null &&
        createPortal(
          <section
            className="appointment-arrival-float"
            aria-label="Registrar llegada"
            style={{ top }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                dismiss(floating);
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p role="status" className="font-semibold wrap-anywhere">
                  {floating.clientName}
                </p>
                <p className="text-sm wrap-anywhere">
                  {time(floating.start)} · {floating.serviceName}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Cerrar aviso de llegada"
                onClick={() => dismiss(floating)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!results || results.blocked}
                  onClick={() => void results?.arrive(floating)}
                >
                  Ya llegó
                </Button>
                <Button
                  variant="outline"
                  className="appointment-arrival-cancel"
                  disabled={!results || results.blocked}
                  onClick={() => void results?.cancelWindow(floating)}
                >
                  Cancelar Cita
                </Button>
              </div>
              {available.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setOthers((value) => !value)}
                  aria-expanded={others}
                >
                  Ver {available.length - 1} más
                </Button>
              )}
            </div>
            {others && available.length > 1 && (
              <ul className="appointment-arrival-others">
                {available
                  .filter((row) => row._id !== floating._id)
                  .map((row) => (
                    <li key={row._id}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setChosen(row._id);
                          setOthers(false);
                        }}
                      >
                        {time(row.start)} · {row.clientName}
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </section>,
          document.body,
        )}
    </AttentionContext.Provider>
  );
}
