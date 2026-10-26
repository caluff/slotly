import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile, readdir } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir, homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { publicBookingScenarios } from "./public-booking-engine-scenarios.mjs";
import { specialDateScenarios } from "./special-dates-engine-scenarios.mjs";
import { timeBlockScenarios } from "./time-block-engine-scenarios.mjs";
import { serviceScenarios } from "./service-engine-scenarios.mjs";
import { serviceUndoScenarios } from "./service-undo-engine-scenarios.mjs";
import { appointmentResultScenarios } from "./appointment-result-engine-scenarios.mjs";
import { attentionFixtureSource } from "./appointment-attention-engine-fixtures.mjs";
import { appointmentAttentionScenarios } from "./appointment-attention-engine-scenarios.mjs";
import { notificationCenterScenarios } from "./notification-center-engine-scenarios.mjs";
import { clientsFixtureSource } from "./clients-engine-fixtures.mjs";
import { emailClientsScenarios } from "./email-clients-engine-scenarios.mjs";
import { emailClientsFixtureSource } from "./email-clients-engine-fixtures.mjs";
import { confirmationFixtureSource } from "./email-confirmations-engine-fixtures.mjs";
import { confirmationEmailScenarios, startControlledEmailProvider } from "./email-confirmations-engine-scenarios.mjs";
import { publicManagementFixtureSource } from "./public-management-engine-fixtures.mjs";
import { publicManagementScenarios, redactManagementEvidence } from "./public-management-engine-scenarios.mjs";
import { publicReschedulingFixtureSource } from "./public-rescheduling-engine-fixtures.mjs";
import { publicReschedulingScenarios, redactReschedulingEvidence } from "./public-rescheduling-engine-scenarios.mjs";
import { appearanceFixtureSource, appearanceScenarios } from "./public-appearance-engine-scenarios.mjs";

// REAL engine integration, entirely synthetic. Never reads .env.local or .convex.
// Requires the Convex backend binary cached by the CLI, or SLOTLY_CONVEX_BACKEND.
// Run: pnpm test:appointments:engine [--report <absolute JSON output path>]
const repo = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = await realpath(tmpdir());
const workspace = await mkdtemp(path.join(temporaryRoot, "slotly-appointments-engine-"));
const marker = randomUUID();
await writeFile(path.join(workspace, "owned-test-workspace"), marker);
let backend;
let mailProvider;
const report = { environment: "isolated real Convex engine / SQLite", synthetic: true, scenarios: [] };
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(CONVEX_|NEXT_PUBLIC_CONVEX_|CLERK_|NEXT_PUBLIC_CLERK_|SLOTLY_EMAIL_|RESEND_)/.test(key)));

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function stopBackend() {
  if (backend && backend.exitCode === null) {
    const exited = new Promise((resolve) => backend.once("exit", resolve));
    backend.kill();
    await exited;
  }
}
async function cachedBinary() {
  if (process.env.SLOTLY_CONVEX_BACKEND) return path.resolve(process.env.SLOTLY_CONVEX_BACKEND);
  const cache = process.platform === "win32" ? path.join(process.env.LOCALAPPDATA, "convex", "binaries") : path.join(homedir(), ".cache", "convex", "binaries");
  const versions = (await readdir(cache)).sort().reverse();
  assert.ok(versions.length, "Instala el backend local mediante el CLI de Convex antes de esta prueba.");
  return path.join(cache, versions[0], `convex-local-backend${process.platform === "win32" ? ".exe" : ""}`);
}

try {
  const binary = await cachedBinary();
  report.backend = execFileSync(binary, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
  report.binaryRelease = path.basename(path.dirname(binary));
  const port = await freePort();
  let sitePort = await freePort();
  while (sitePort === port) sitePort = await freePort();
  const url = `http://127.0.0.1:${port}`;
  assert.equal(new URL(url).hostname, "127.0.0.1");
  const instance = `synthetic-${randomUUID()}`;
  const secret = randomBytes(32).toString("hex");
  const adminKey = execFileSync(binary, ["keygen", "admin-key", "--instance-name", instance, "--instance-secret", secret], { encoding: "utf8", windowsHide: true }).trim();
  const backendArgs = ["--interface", "127.0.0.1", "--port", String(port), "--site-proxy-port", String(sitePort),
    "--instance-name", instance, "--instance-secret", secret, "--disable-beacon", "--local-storage", path.join(workspace, "storage"), path.join(workspace, "data.sqlite3")];
  async function startBackend() {
    backend = spawn(binary, backendArgs, { cwd: workspace, env: cleanEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    backend.stdout.resume();
    backend.stderr.resume();
    const limit = Date.now() + 30_000;
    while (Date.now() < limit) {
      assert.equal(backend.exitCode, null, "El backend aislado se detuvo.");
      try { if (await (await fetch(`${url}/instance_name`)).text() === instance) return; } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error("El backend aislado no inició en 30 segundos.");
  }
  await startBackend();
  await cp(path.join(repo, "convex"), path.join(workspace, "convex"), { recursive: true });
  await cp(path.join(repo, "lib"), path.join(workspace, "lib"), { recursive: true });
  await cp(path.join(repo, "package.json"), path.join(workspace, "package.json"));
  if (process.argv.includes("--confirmations-only") || process.argv.includes("--public-management-only") || process.argv.includes("--public-rescheduling-only")) {
    mailProvider = await startControlledEmailProvider();
    const target = path.join(workspace, "convex", "emailDispatch.ts"), source = await readFile(target, "utf8");
    const literal = '"https://api.resend.com/emails"';
    assert.equal(source.split(literal).length, 2, "One fixed provider URL, replaced only in the owned temporary workspace");
    await writeFile(target, source.replace(literal, JSON.stringify(mailProvider.url)));
  }
  await writeFile(path.join(workspace, "convex", "auth.config.ts"), "export default { providers: [] };\n");
  // Test-only seed, generated ONLY in the owned temporary deployment. It is
  // never added to app functions or synchronized with a cloud deployment.
  await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), `
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireMyBusiness } from "./lib/appointmentData";
import { applyAppointmentResult } from "./appointments";
import { todayInZone } from "../lib/agenda-date";
export const pastAppointment = internalMutation({
  args: { serviceId: v.id("services"), end: v.optional(v.number()), receiptKey: v.optional(v.string()), status: v.optional(v.union(v.literal("confirmed"), v.literal("cancelled"))) }, returns: v.id("appointments"),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), service = await ctx.db.get("services", args.serviceId);
    if (!service || service.businessId !== business._id) throw new Error("Synthetic fixture ownership");
    const end = args.end ?? Date.now() - 60000, start = end - service.durationMinutes * 60000, date = todayInZone(business.timeZone, start);
    const status = args.status ?? "confirmed";
    const row = { businessId: business._id, serviceId: service._id, serviceName: service.name, clientName: "Synthetic past result", date, start, end, status,
      rescheduledAt: start - 2000, rescheduledFromVersion: 2, ...(status === "cancelled" ? { cancelledAt: start - 1000 } : {}) };
    const id = await ctx.db.insert("appointments", row);
    if (args.receiptKey) await ctx.db.insert("publicBookingReceipts", { businessId: business._id, attemptKey: args.receiptKey, appointmentId: id,
      serviceId: service._id, serviceName: row.serviceName, clientName: row.clientName, date, start, end, timeZone: business.timeZone });
    return id;
  }
});
export const allAppointments = internalQuery({
  args: {}, returns: v.any(), handler: async ctx => {
    const business = await requireMyBusiness(ctx);
    const appointments = await ctx.db.query("appointments").withIndex("by_businessId_and_date", q => q.eq("businessId", business._id)).take(5001);
    const receipts = await ctx.db.query("publicBookingReceipts").withIndex("by_businessId_and_attemptKey", q => q.eq("businessId", business._id)).take(5001);
    if (appointments.length > 5000 || receipts.length > 5000) throw new Error("Synthetic snapshot bound exceeded");
    return { appointments, receipts };
  }
});
export const historicalBlock = internalMutation({
  args: { appointmentId: v.id("appointments") }, returns: v.null(), handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), row = await ctx.db.get("appointments", args.appointmentId);
    if (!row || row.businessId !== business._id) throw new Error("Synthetic fixture ownership");
    const time = (at:number) => new Intl.DateTimeFormat("en-GB", {timeZone:business.timeZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(at);
    await ctx.db.insert("timeBlocks", {businessId:business._id,date:row.date,start:row.start,end:row.end,startTime:time(row.start),endTime:time(row.end),timeZone:business.timeZone,
      reason:"Synthetic historical context",active:true,version:1,updatedAt:Date.now(),creationKey:"synthetic-historical-block",creationValue:"synthetic",lastOperationId:"synthetic",lastExpectedVersion:null});
    return null;
  }
});
// Real-engine serial boundary control: Date.now is constant within a Convex
// transaction. Invoke the actual registered production handler after arranging
// end=now+delta, without exposing a clock parameter in any app endpoint.
export const resultBoundary = internalMutation({
  args: { appointmentId: v.id("appointments"), delta: v.number(), operationId: v.string() }, returns: v.any(),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), old = await ctx.db.get("appointments", args.appointmentId);
    if (!old || old.businessId !== business._id) throw new Error("Synthetic fixture ownership");
    const now = Date.now(); await ctx.db.patch("appointments", old._id, { end: now + args.delta });
    const before = await ctx.db.get("appointments", old._id);
    try {
      const response = await applyAppointmentResult(ctx, { appointmentId: old._id, expectedVersion: old.version ?? 0, operationId: args.operationId, result: "completed" });
      return { now, before, after: await ctx.db.get("appointments", old._id), response };
    } catch (error) { return { now, before, after: await ctx.db.get("appointments", old._id), code: error instanceof Error && "data" in error ? (error.data as {code:string}).code : "UNKNOWN" }; }
  }
});
export const denseResults = internalMutation({
  args: { serviceId: v.id("services") }, returns: v.string(), handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), service = await ctx.db.get("services", args.serviceId);
    if (!service || service.businessId !== business._id) throw new Error("Synthetic fixture ownership");
    const end = Date.now() - 3600000, start = end - 1800000, date = todayInZone(business.timeZone, start);
    for (let i = 0; i < 1605; i++) {
      const status = i % 3 === 0 ? "completed" : i % 3 === 1 ? "no_show" : "cancelled";
      await ctx.db.insert("appointments", { businessId: business._id, serviceId: args.serviceId, serviceName: service.name,
        clientName: "Synthetic dense results", date, start, end, status, ...(status === "cancelled" ? {cancelledAt:end} : {resultAt:end}) });
    }
    await ctx.db.insert("appointments", { businessId: business._id, serviceId: args.serviceId, serviceName: service.name, clientName:"Synthetic last confirmed", date, start:end, end:end+900000, status:"confirmed" });
    return date;
  }
});
export const timeZone = internalMutation({
  args: { timeZone: v.string() }, returns: v.null(),
  handler: async (ctx, { timeZone }) => { const business = await requireMyBusiness(ctx); await ctx.db.patch("businesses", business._id, { timeZone }); return null; }
});
export const legacyService = internalMutation({
  args: {}, returns: v.id("services"), handler: async ctx => { const business = await requireMyBusiness(ctx); return await ctx.db.insert("services", { businessId: business._id, name: "Synthetic 46", durationMinutes: 46 }); }
});
export const cancelledHistory = internalMutation({
  args: { serviceId: v.id("services"), date: v.string(), start: v.number() }, returns: v.number(),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    const service = await ctx.db.get("services", args.serviceId);
    if (!service || service.businessId !== business._id) throw new Error("Synthetic fixture ownership");
    for (let i = 0; i < 1600; i++) await ctx.db.insert("appointments", { ...args, businessId: business._id, serviceName: service.name, clientName: "Synthetic cancelled history", end: args.start + 30 * 60000, status: "cancelled", cancelledAt: Date.now() });
    return 1600;
  }
});
export const snapshot = internalQuery({
  args: { date: v.string() }, returns: v.any(),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    return { business,
      services: await ctx.db.query("services").withIndex("by_businessId", q => q.eq("businessId", business._id)).take(500),
      timeBlocks: await ctx.db.query("timeBlocks").withIndex("by_businessId_and_active_and_date", q => q.eq("businessId", business._id)).take(5000),
      specialDates: await ctx.db.query("specialDates").withIndex("by_businessId_and_date", q => q.eq("businessId", business._id)).take(100),
      weeklySchedules: await ctx.db.query("weeklySchedules").withIndex("by_businessId", q => q.eq("businessId", business._id)).take(2),
      appointments: await ctx.db.query("appointments").withIndex("by_businessId_and_date", q => q.eq("businessId", business._id).eq("date", date)).take(1500),
      receipts: await ctx.db.query("publicBookingReceipts").withIndex("by_businessId_and_attemptKey", q => q.eq("businessId", business._id)).take(100),
    };
  }
});\n`);
  await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), (await readFile(path.join(workspace, "convex", "engineFixtures.ts"), "utf8")) + attentionFixtureSource);
  if (process.argv.includes("--clients-only") || process.argv.includes("--clients-preview")) await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), (await readFile(path.join(workspace, "convex", "engineFixtures.ts"), "utf8")) + clientsFixtureSource);
  if (process.argv.includes("--auto-email-only") || process.argv.includes("--clients-only") || process.argv.includes("--confirmations-only") || process.argv.includes("--public-management-only") || process.argv.includes("--public-rescheduling-only")) await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), (await readFile(path.join(workspace, "convex", "engineFixtures.ts"), "utf8")) + emailClientsFixtureSource);
  if (process.argv.includes("--confirmations-only") || process.argv.includes("--public-management-only") || process.argv.includes("--public-rescheduling-only")) await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), (await readFile(path.join(workspace, "convex", "engineFixtures.ts"), "utf8")) + confirmationFixtureSource);
  if (process.argv.includes("--public-management-only") || process.argv.includes("--public-rescheduling-only")) await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), (await readFile(path.join(workspace, "convex", "engineFixtures.ts"), "utf8")) + publicManagementFixtureSource);
  if (process.argv.includes("--public-rescheduling-only")) await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), (await readFile(path.join(workspace, "convex", "engineFixtures.ts"), "utf8")) + publicReschedulingFixtureSource);
  if (process.argv.includes("--public-appearance-only")) await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), (await readFile(path.join(workspace, "convex", "engineFixtures.ts"), "utf8")) + appearanceFixtureSource);
  await writeFile(path.join(workspace, "convex.json"), '{"functions":"convex/"}\n');
  await symlink(path.join(repo, "node_modules"), path.join(workspace, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  const envFile = path.join(workspace, "isolated.env");
  await writeFile(envFile, `CONVEX_SELF_HOSTED_URL=${url}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${adminKey}\n`);
  const deploy = spawn(process.execPath, [path.join(repo, "node_modules/convex/bin/main.js"), "dev", "--once", "--env-file", envFile, "--typecheck", "enable"],
    { cwd: workspace, env: cleanEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let deployOutput = "";
  deploy.stdout.on("data", (data) => { deployOutput += data; });
  deploy.stderr.on("data", (data) => { deployOutput += data; });
  const deployed = await new Promise((resolve) => deploy.once("exit", resolve));
  if (deployed !== 0) throw new Error(deployOutput.replaceAll(adminKey, "[redacted]").replaceAll(secret, "[redacted]"));
  console.log("Esquema y funciones desplegados solo en backend temporal loopback.");
  let emailEnvironmentInitialized = false;
  async function setEmailEnvironment(enabled) {
    const values = emailEnvironmentInitialized ? [] : [["SLOTLY_EMAIL_FROM", "Slotly <fixture@sender.synthetic>"], ["SLOTLY_EMAIL_RESEND_API_KEY", "re_synthetic_confirmation_only"]];
    values.push(["SLOTLY_EMAIL_READY", String(enabled)]);
    for (const [name, value] of values) {
      const command = spawn(process.execPath, [path.join(repo, "node_modules/convex/bin/main.js"), "env", "set", name, value, "--env-file", envFile], { cwd: workspace, env: cleanEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      let output = ""; command.stdout.on("data", d => { output += d; }); command.stderr.on("data", d => { output += d; });
      const status = await new Promise(resolve => command.once("exit", resolve));
      if (status !== 0) throw Error(output.replaceAll(adminKey, "[redacted]").replaceAll(secret, "[redacted]"));
    }
    emailEnvironmentInitialized = true;
  }
  const dateObject = new Date(Date.now() + 14 * 86_400_000);
  dateObject.setUTCDate(dateObject.getUTCDate() + (8 - dateObject.getUTCDay()) % 7);
  const date = dateObject.toISOString().slice(0, 10);
  const start = Date.parse(`${date}T09:30:00-03:00`);
  const days = Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isOpen: i === 0, start: i === 0 ? "09:00" : null, end: i === 0 ? "12:00" : null }));
  // Prior scenarios capture catalogue context at setup, never re-read it at
  // submission. New service scenarios send explicit frozen contexts, including
  // stale ones. This adapter only updates the older stable-catalogue callers.
  const viewedServices = new Map();
  const makeClient = (identity, customFetch, includeViewed = true) => {
    const client = new ConvexHttpClient(url, { logger: false, fetch: customFetch });
    if (identity) client.setAdminAuth(adminKey, identity);
    if (includeViewed) {
      const mutation = client.mutation.bind(client);
      client.mutation = async (name, args, options) => {
        const booking = name === "appointments:createMyAppointment" || name === "publicBooking:confirm";
        let command = booking && !args.expectedService && viewedServices.has(args.serviceId)
          ? { ...args, expectedService: viewedServices.get(args.serviceId) } : args;
        // Existing service/result scenarios are independent of contact identity.
        // Add explicit synthetic contact/command fields at their HTTP boundary.
        // New email scenarios provide these themselves and receive raw results.
        const oldPrivate = name === "appointments:createMyAppointment" && args.operationId === undefined;
        if (oldPrivate) command = { ...command, operationId: randomUUID(), ...(args.clientId ? {} : { email: "regression@example.test" }) };
        if (name === "publicBooking:confirm" && args.email === undefined) command = { ...command, email: "regression@example.test" };
        const result = await mutation(name, command, options);
        return oldPrivate ? result.appointmentId : result;
      };
    }
    return client;
  };
  async function setup(name = "Synthetic engine test") {
    const identity = { subject: `synthetic_${randomUUID()}`, issuer: "https://synthetic.test" };
    const client = makeClient(identity);
    const businessId = await client.mutation("businesses:createMyBusiness", { name, timeZone: "America/Montevideo" });
    const serviceId = await client.mutation("services:createMyService", { name: "Synthetic 30", durationMinutes: 30, operationId: randomUUID() });
    const secondServiceId = await client.mutation("engineFixtures:legacyService", {});
    viewedServices.set(serviceId, { name: "Synthetic 30", durationMinutes: 30, version: 0 });
    viewedServices.set(secondServiceId, { name: "Synthetic 46", durationMinutes: 46, version: 0 });
    await client.mutation("weeklySchedule:saveMyWeeklySchedule", { days });
    return { identity, client, serviceId, secondServiceId, businessId };
  }
  let restartCheck;
  // Independent HTTP clients + transport barrier, also for cancellation races.
  async function race(operations) {
    let entered = 0, active = 0, maxInFlight = 0, release;
    const gate = new Promise((resolve) => { release = resolve; });
    const concurrentFetch = async (...args) => {
      if (++entered === operations.length) release();
      await gate;
      maxInFlight = Math.max(maxInFlight, ++active);
      try { return await fetch(...args); } finally { active--; }
    };
    const results = await Promise.allSettled(operations.map(({ who, name, args, kind }) => kind === "query"
      ? makeClient(who.identity, concurrentFetch).query(name, args)
      : kind === "action" ? makeClient(who.identity, concurrentFetch).action(name, args)
        : makeClient(who.identity, concurrentFetch).mutation(name, args, { skipQueue: true })));
    assert.equal(maxInFlight, operations.length);
    return { results, maxInFlight };
  }
  if (process.argv.includes("--clients-preview")) {
    const preview = await setup("Consulta sintética"), first = await preview.client.mutation("clients:createMyClient", {name:"Ana Pérez",operationId:randomUUID()}),
      twin = await preview.client.mutation("clients:createMyClient", {name:"Ana Pérez",operationId:randomUUID()});
    await preview.client.mutation("clients:createMyClient", {name:"Bruno sin citas",operationId:randomUUID()});
    await preview.client.mutation("engineFixtures:clientsDense", {count:205});
    await preview.client.mutation("engineFixtures:clientHistorySeed", {clientId:first.client._id,serviceId:preview.secondServiceId,count:47});
    await preview.client.mutation("engineFixtures:clientHistorySeed", {clientId:twin.client._id,serviceId:preview.serviceId,count:23});
    const index = process.argv.indexOf("--preview-connection"), destination = process.argv[index+1];
    assert.ok(index !== -1 && path.isAbsolute(destination));
    const connection = {synthetic:true,url,adminKey,identity:preview.identity,businessId:preview.businessId,date,start,serviceId:preview.serviceId};
    await mkdir(path.dirname(destination),{recursive:true});
    await writeFile(destination,JSON.stringify(connection));
    console.log("Preview sintética lista en backend propio loopback. Esperando marcador de cierre propio.");
    for (;;) {
      try { if(await readFile(destination+".stop","utf8")==="stop-owned-preview")break; } catch { /* own stop marker not written yet */ }
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    await rm(destination,{force:true});await rm(destination+".stop",{force:true});
    report.previewOnly=true;
  } else if (process.argv.includes("--public-appearance-only")) {
    await appearanceScenarios({ setup, makeClient, race, report, date, start, restart: async () => { await stopBackend(); await startBackend(); } });
  } else if (process.argv.includes("--public-rescheduling-only")) {
    report.providerStages = [];
    await publicReschedulingScenarios({setup,date,start,makeClient,race,report,workspace,provider:mailProvider,setEmailEnvironment,restart:async()=>{await stopBackend();await startBackend();}});
    report.providerStages.push({stage:"R17",before:0,after:mailProvider.requests.length,requests:mailProvider.requests.length});
    if (process.argv.includes("--with-rescheduling-regressions")) {
      const beforeProvider = mailProvider.requests.length;
      await publicManagementScenarios({setup,date,start,makeClient,race,report,workspace,provider:mailProvider,setEmailEnvironment,restart:async()=>{await stopBackend();await startBackend();}});
      report.providerStages.push({stage:"R16-regression",before:beforeProvider,after:mailProvider.requests.length,requests:mailProvider.requests.length-beforeProvider});
      await serviceScenarios({setup,date,start,makeClient,race,report});
    }
  } else if (process.argv.includes("--public-management-only")) {
    await publicManagementScenarios({setup,date,start,makeClient,race,report,workspace,provider:mailProvider,setEmailEnvironment,restart:async()=>{await stopBackend();await startBackend();}});
    if (process.argv.includes("--with-management-regressions")) {
      await emailClientsScenarios({setup,date,start,makeClient,race,report,restart:async()=>{await stopBackend();await startBackend();}});
      await serviceScenarios({setup,date,start,makeClient,race,report});
      await serviceUndoScenarios({setup,date,start,makeClient,race,report});
    }
  } else if (process.argv.includes("--confirmations-only")) {
    await confirmationEmailScenarios({setup,date,start,makeClient,race,report,provider:mailProvider,setEmailEnvironment,restart:async()=>{await stopBackend();await startBackend();}});
    if (process.argv.includes("--with-email-regressions")) {
      await emailClientsScenarios({setup,date,start,makeClient,race,report,restart:async()=>{await stopBackend();await startBackend();}});
      await serviceScenarios({ setup,date,start,makeClient,race,report });
      await serviceUndoScenarios({ setup,date,start,makeClient,race,report });
    }
  } else if (process.argv.includes("--clients-only") || process.argv.includes("--auto-email-only")) {
    await emailClientsScenarios({setup,date,start,makeClient,race,report,restart:async()=>{await stopBackend();await startBackend();}});
    if (process.argv.includes("--with-service-regressions")) {
      await serviceScenarios({ setup,date,start,makeClient,race,report });
      await serviceUndoScenarios({ setup,date,start,makeClient,race,report });
    }
  } else if (process.argv.includes("--notification-center-only")) {
    await notificationCenterScenarios({setup,date,start,makeClient,race,report,restart:async()=>{await stopBackend();await startBackend();}});
  } else if (process.argv.includes("--appointment-attention-only")) {
    await appointmentAttentionScenarios({setup,date,start,makeClient,race,report,restart:async()=>{await stopBackend();await startBackend();}});
  } else if (process.argv.includes("--service-undo-only")) {
    await serviceUndoScenarios({ setup, date, start, makeClient, race, report });
  } else if (process.argv.includes("--appointment-results-only")) {
    await appointmentResultScenarios({ setup, date, start, makeClient, race, report, restart: async () => { await stopBackend(); await startBackend(); } });
  } else {
  const createOperation = (who, serviceId = who.serviceId, offset = 0) => ({ who, name: "appointments:createMyAppointment", args: { date, start: start + offset, serviceId, clientName: "Synthetic race" } });
  const cancelOperation = (who, appointmentId) => ({ who, name: "appointments:cancelMyAppointment", args: { appointmentId, expectedVersion: 0 } });
  async function history(who) {
    const result = await who.client.query("appointments:searchMyAppointments", { client: "", period: "todas", from: date, until: date, paginationOpts: { cursor: null, numItems: 100 } });
    assert.equal(result.isDone, true);
    return result.page;
  }
  for (let round = 1; round <= 3; round++) {
    for (const scenario of ["same-interval", "partial-overlap", "different-services", "adjacent", "non-overlapping", "different-businesses"]) {
      const a = await setup();
      const b = scenario === "different-businesses" ? await setup() : a;
      const count = scenario === "same-interval" ? 10 : 2;
      let entered = 0, active = 0, maxInFlight = 0;
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      const concurrentFetch = async (...args) => {
        entered++;
        if (entered === count) release();
        await gate; // barrier RELEASES all requests together; no serialization.
        active++;
        maxInFlight = Math.max(maxInFlight, active);
        try { return await fetch(...args); } finally { active--; }
      };
      const results = await Promise.allSettled(Array.from({ length: count }, (_, i) => {
        const who = i === 0 ? a : b;
        return makeClient(who.identity, concurrentFetch).mutation("appointments:createMyAppointment", {
          date, start: start + (i && scenario === "partial-overlap" ? 15 * 60_000 : i && scenario === "adjacent" ? 30 * 60_000 : i && scenario === "non-overlapping" ? 90 * 60_000 : 0),
          serviceId: i && scenario === "different-services" ? a.secondServiceId : who.serviceId,
          clientName: "Synthetic client",
        }, { skipQueue: true });
      }));
      assert.equal(maxInFlight, count, "El harness serializó las solicitudes HTTP.");
      const compatible = scenario === "adjacent" || scenario === "non-overlapping" || scenario === "different-businesses";
      const successes = results.filter((r) => r.status === "fulfilled").length;
      assert.equal(successes, compatible ? 2 : 1);
      for (const r of results) if (r.status === "rejected") assert.match(String(r.reason), /SLOT_TAKEN/);
      const rowsA = await a.client.query("appointments:listMyConfirmedAppointments", { date });
      const rows = scenario === "different-businesses" ? [...rowsA, ...await b.client.query("appointments:listMyConfirmedAppointments", { date })] : rowsA;
      assert.equal(rows.length, successes, "Documentos finales no coinciden con commits exitosos.");
      assert.deepEqual(rows.map((r) => r._id).sort(), results.filter((r) => r.status === "fulfilled").map((r) => r.value).sort());
      assert.ok(rows.every((r) => r.status === "confirmed" && r.end > r.start));
      const preview = await a.client.action("availability:getMyAvailability", { serviceId: a.secondServiceId, date });
      assert.ok(preview.slots.every((s) => rowsA.every((r) => !(s.start < r.end && r.start < s.end))));
      report.scenarios.push({ round, scenario, requests: count, maxInFlight, successes, rejected: count - successes, finalDocuments: rows.length });
      restartCheck = { client: a.client, rows: rowsA };
    }
  }
  for (let round = 1; round <= 3; round++) {
    for (const scenario of ["double-cancel", "cancel-vs-create", "freed-two-creations", "freed-different-services", "freed-adjacent", "freed-different-businesses"]) {
      const a = await setup();
      const original = await a.client.mutation("appointments:createMyAppointment", createOperation(a).args);
      const before = (await history(a))[0];
      const cancelArgs = { appointmentId: original, expectedVersion: 0 };
      const began = Date.now();
      const b = scenario === "freed-different-businesses" ? await setup() : a;
      let operations;
      let firstCancel;
      if (scenario === "double-cancel") operations = [cancelOperation(a, original), cancelOperation(a, original)];
      else if (scenario === "cancel-vs-create") operations = [cancelOperation(a, original), createOperation(a)];
      else {
        firstCancel = await a.client.mutation("appointments:cancelMyAppointment", cancelArgs);
        assert.equal(firstCancel.outcome, "cancelled");
        const free = await a.client.action("availability:getMyAvailability", { serviceId: a.secondServiceId, date });
        assert.ok(free.slots.some((slot) => slot.start === start), "La cancelación no liberó otro servicio.");
        operations = [createOperation(a), createOperation(b, scenario === "freed-different-services" ? a.secondServiceId : b.serviceId, scenario === "freed-adjacent" ? 30 * 60_000 : 0)];
      }
      const { results, maxInFlight } = await race(operations);
      const ended = Date.now();
      const rowsA = await history(a);
      const originalAfter = rowsA.find((row) => row._id === original);
      assert.ok(originalAfter);
      assert.deepEqual(originalAfter, { ...before, status: "cancelled", cancelledAt: originalAfter.cancelledAt, version: 1 });
      assert.ok(originalAfter.cancelledAt >= began && originalAfter.cancelledAt <= ended);
      if (firstCancel) assert.equal(originalAfter.cancelledAt, firstCancel.cancelledAt);
      const repeated = await a.client.mutation("appointments:cancelMyAppointment", cancelArgs);
      assert.deepEqual(repeated, { outcome: "already_cancelled", cancelledAt: originalAfter.cancelledAt });
      assert.deepEqual(await history(a), rowsA, "La repetición modificó la historia.");
      const activeA = rowsA.filter((row) => row.status === "confirmed");
      const rowsB = b === a ? [] : await history(b);
      const active = [...activeA, ...rowsB.filter((row) => row.status === "confirmed")];
      const successes = results.filter((r) => r.status === "fulfilled").length;
      for (const r of results) if (r.status === "rejected") assert.match(String(r.reason), /SLOT_TAKEN/);
      if (scenario === "double-cancel") {
        assert.equal(successes, 2);
        assert.deepEqual(results.map((r) => r.value.outcome).sort(), ["already_cancelled", "cancelled"]);
        assert.ok(results.every((r) => r.value.cancelledAt === originalAfter.cancelledAt));
        assert.equal(active.length, 0);
      } else if (scenario === "cancel-vs-create") {
        assert.equal(results[0].status, "fulfilled");
        assert.equal(results[0].value.outcome, "cancelled");
        assert.equal(active.length, results[1].status === "fulfilled" ? 1 : 0);
      } else {
        const compatible = scenario === "freed-adjacent" || scenario === "freed-different-businesses";
        assert.equal(successes, compatible ? 2 : 1);
        assert.equal(active.length, successes);
      }
      const committedIds = operations.flatMap((op, i) => op.name === "appointments:createMyAppointment" && results[i].status === "fulfilled" ? [results[i].value] : []);
      assert.deepEqual(active.map((r) => r._id).sort(), committedIds.sort());
      for (const row of active) {
        const expected = operations.find((op) => op.name === "appointments:createMyAppointment" && op.args.serviceId === row.serviceId && op.args.start === row.start);
        assert.ok(expected);
        assert.equal(row.end, row.start + (row.serviceId === a.secondServiceId ? 46 : 30) * 60_000);
        assert.equal(row.cancelledAt, undefined);
      }
      assert.deepEqual((await a.client.query("appointments:listMyConfirmedAppointments", { date })).map((r) => r._id).sort(), activeA.map((r) => r._id).sort());
      const preview = await a.client.action("availability:getMyAvailability", { serviceId: a.serviceId, date });
      assert.equal(preview.slots.some((s) => s.start === start), !activeA.some((r) => r.start < start + 30 * 60_000 && start < r.end));
      report.scenarios.push({ round, scenario, requests: operations.length, maxInFlight, successes, rejected: operations.length - successes, finalDocuments: rowsA.length + rowsB.length, confirmed: active.length, cancelled: 1, timestampStable: true });
    }
  }
  const moveOperation = (who, appointmentId, offset = 90 * 60_000, expectedVersion = 0) => ({ who, name: "appointments:rescheduleMyAppointment", args: { appointmentId, expectedVersion, date, start: start + offset } });
  for (let round = 1; round <= 3; round++) {
    for (const scenario of ["same-version-distinct-targets", "same-version-same-target", "two-moves-same-target", "create-vs-move", "cancel-vs-move", "move-vs-old-reservation", "partial-targets", "adjacent-targets", "moves-different-businesses"]) {
      const a = await setup();
      const firstId = await a.client.mutation("appointments:createMyAppointment", createOperation(a).args);
      const beforeA = await history(a);
      const b = scenario === "moves-different-businesses" ? await setup() : a;
      let secondId;
      if (["two-moves-same-target", "partial-targets", "adjacent-targets", "moves-different-businesses"].includes(scenario)) {
        secondId = await b.client.mutation("appointments:createMyAppointment", createOperation(b, b.serviceId, b === a ? 30 * 60_000 : 0).args);
      }
      const originalsA = await history(a), originalsB = b === a ? [] : await history(b);
      let operations;
      if (scenario.startsWith("same-version")) operations = [moveOperation(a, firstId), moveOperation(a, firstId, scenario === "same-version-same-target" ? 90 * 60_000 : 60 * 60_000)];
      else if (scenario === "create-vs-move") operations = [createOperation(a, a.secondServiceId, 90 * 60_000), moveOperation(a, firstId)];
      else if (scenario === "cancel-vs-move") operations = [cancelOperation(a, firstId), moveOperation(a, firstId)];
      else if (scenario === "move-vs-old-reservation") operations = [moveOperation(a, firstId), createOperation(a)];
      else operations = [moveOperation(a, firstId), moveOperation(b, secondId, scenario === "partial-targets" ? 105 * 60_000 : scenario === "adjacent-targets" ? 120 * 60_000 : 90 * 60_000)];
      if (round === 2 && ["create-vs-move", "cancel-vs-move"].includes(scenario)) operations.reverse();
      const began = Date.now();
      const { results, maxInFlight } = await race(operations);
      const ended = Date.now();
      const rowsA = await history(a), rowsB = b === a ? [] : await history(b);
      const successes = results.filter((r) => r.status === "fulfilled").length;
      const compatible = ["same-version-same-target", "adjacent-targets", "moves-different-businesses"].includes(scenario);
      if (scenario === "move-vs-old-reservation") assert.equal(results[0].status, "fulfilled");
      else assert.equal(successes, compatible ? 2 : 1);
      for (const [i, result] of results.entries()) {
        const operation = operations[i];
        if (result.status === "rejected") {
          assert.match(String(result.reason), /APPOINTMENT_CONFLICT|APPOINTMENT_CANCELLED|SLOT_TAKEN/);
          continue;
        }
        if (operation.name !== "appointments:rescheduleMyAppointment") continue;
        const row = (operation.who === a ? rowsA : rowsB).find((r) => r._id === operation.args.appointmentId);
        assert.equal(row.start, operation.args.start); assert.equal(row.end, row.start + 30 * 60_000);
        assert.equal(row.version, 1); assert.equal(row.status, "confirmed");
        assert.ok(row.rescheduledAt >= began && row.rescheduledAt <= ended);
        const repeated = await operation.who.client.mutation(operation.name, operation.args);
        assert.deepEqual(repeated, { ...result.value, outcome: "already_rescheduled" });
      }
      // Verify every original ID and immutable field, and byte-equivalent public
      // state for losing originals. A rejection must not free their old slot.
      for (const [who, originals, rows] of (b === a ? [[a, originalsA, rowsA]] : [[a, originalsA, rowsA], [b, originalsB, rowsB]])) {
        for (const original of originals) {
          const row = rows.find((r) => r._id === original._id); assert.ok(row);
          for (const field of ["_id", "clientName", "serviceId", "serviceName"]) assert.equal(row[field], original[field]);
          if (row.version === original.version) assert.deepEqual(row, original);
          else if (row.status === "cancelled") {
            assert.deepEqual(row, { ...original, version: 1, status: "cancelled", cancelledAt: row.cancelledAt });
            assert.ok(row.cancelledAt >= began && row.cancelledAt <= ended);
          }
        }
        const active = rows.filter((r) => r.status === "confirmed").sort((x, y) => x.start - y.start);
        for (let i = 1; i < active.length; i++) assert.ok(active[i - 1].end <= active[i].start, "Solape confirmado tras carrera");
        const preview = await who.client.action("availability:getMyAvailability", { serviceId: who.serviceId, date });
        for (const candidate of [start, start + 90 * 60_000]) {
          assert.equal(preview.slots.some((s) => s.start === candidate), !active.some((r) => candidate < r.end && r.start < candidate + 30 * 60_000));
        }
      }
      if (scenario === "same-version-distinct-targets") {
        assert.equal(rowsA.length, beforeA.length); assert.equal(rowsA[0].version, 1);
      }
      if (scenario === "cancel-vs-move") {
        if (rowsA[0].status === "confirmed") await assert.rejects(a.client.mutation("appointments:cancelMyAppointment", { appointmentId: firstId, expectedVersion: 0 }), /APPOINTMENT_CONFLICT/);
        else assert.equal((await a.client.mutation("appointments:cancelMyAppointment", { appointmentId: firstId, expectedVersion: 0 })).outcome, "already_cancelled");
      }
      assert.deepEqual(await history(a), rowsA); if (b !== a) assert.deepEqual(await history(b), rowsB);
      const created = operations.filter((op, i) => op.name === "appointments:createMyAppointment" && results[i].status === "fulfilled").length;
      assert.equal(rowsA.length + rowsB.length, originalsA.length + originalsB.length + created);
      report.scenarios.push({ round, scenario, requests: operations.length, maxInFlight, successes,
        operationOrder: operations.map((op) => op.name.split(":")[1]),
        observedResults: results.map((r) => r.status === "fulfilled" ? (typeof r.value === "string" ? "created" : r.value.outcome) : String(r.reason).match(/APPOINTMENT_CONFLICT|APPOINTMENT_CANCELLED|SLOT_TAKEN/)?.[0]),
        finalDocuments: rowsA.length + rowsB.length, unchangedLosers: true, noOverlaps: true, stableRetries: true });
    }
  }
  const stale = await setup();
  const staleId = await stale.client.mutation("appointments:createMyAppointment", createOperation(stale).args);
  const firstMove = moveOperation(stale, staleId);
  await stale.client.mutation(firstMove.name, firstMove.args);
  const afterFirst = await history(stale);
  await assert.rejects(stale.client.mutation("appointments:cancelMyAppointment", { appointmentId: staleId, expectedVersion: 0 }), /APPOINTMENT_CONFLICT/);
  assert.deepEqual(await history(stale), afterFirst);
  report.staleCancellationCannotCancelMovedAppointment = true;
  await stale.client.mutation(firstMove.name, moveOperation(stale, staleId, 60 * 60_000, 1).args);
  const afterSecond = await history(stale);
  await assert.rejects(stale.client.mutation(firstMove.name, firstMove.args), /APPOINTMENT_CONFLICT/);
  assert.deepEqual(await history(stale), afterSecond);
  report.oldRetryCannotRevertLaterMove = true;
  const oldReplacement = await stale.client.mutation("appointments:createMyAppointment", createOperation(stale).args);
  assert.notEqual(oldReplacement, staleId);
  assert.equal((await history(stale)).length, 2);
  report.oldIntervalCanBeReservedAfterMove = true;
  await publicBookingScenarios({ setup, date, start, makeClient, race, history, report });
  await specialDateScenarios({ setup, date, start, makeClient, race, report });
  await timeBlockScenarios({ setup, date, start, makeClient, race, report });
  await serviceScenarios({ setup, date, start, makeClient, race, report });
  await appointmentResultScenarios({ setup, date, start, makeClient, race, report, restart: async () => { await stopBackend(); await startBackend(); } });
  const owner = await setup();
  const dense = await setup();
  assert.equal(await dense.client.mutation("engineFixtures:cancelledHistory", { serviceId: dense.serviceId, date, start }), 1600);
  const freeDense = await dense.client.action("availability:getMyAvailability", { serviceId: dense.secondServiceId, date });
  assert.ok(freeDense.slots.some((s) => s.start === start));
  const denseId = await dense.client.mutation("appointments:createMyAppointment", createOperation(dense).args);
  await assert.rejects(dense.client.mutation("appointments:createMyAppointment", createOperation(dense).args), /SLOT_TAKEN/);
  assert.deepEqual((await dense.client.query("appointments:listMyConfirmedAppointments", { date })).map((r) => r._id), [denseId]);
  assert.ok(!(await dense.client.action("availability:getMyAvailability", { serviceId: dense.secondServiceId, date })).slots.some((s) => s.start === start));
  let denseCursor = null, denseDone = false, densePages = 0, denseCount = 0, denseConfirmed = 0;
  const denseIds = new Set();
  while (!denseDone) {
    const page = await dense.client.query("appointments:searchMyAppointments", { client: "", period: "todas", from: date, until: date, paginationOpts: { cursor: denseCursor, numItems: 73 } });
    for (const row of page.page) {
      assert.ok(!denseIds.has(row._id)); denseIds.add(row._id); denseCount++;
      if (row.status === "confirmed") denseConfirmed++;
      else assert.equal(typeof row.cancelledAt, "number");
    }
    densePages++; denseCursor = page.continueCursor; denseDone = page.isDone;
    assert.ok(densePages < 30);
  }
  assert.equal(denseCount, 1601); assert.equal(denseConfirmed, 1);
  report.denseCancelledHistory = { cancelled: 1600, confirmed: 1, paginatedDocuments: denseCount, pages: densePages, duplicateIds: 0, freeBeforeCreation: true, conflictDetectedAfterCreation: true };
  const args = { serviceId: owner.serviceId, date, start, clientName: "  Synthetic   normalized  " };
  await assert.rejects(makeClient().mutation("appointments:createMyAppointment", args), /UNAUTHENTICATED/);
  await assert.rejects(makeClient().query("appointments:listMyConfirmedAppointments", { date }), /UNAUTHENTICATED/);
  await owner.client.mutation("appointments:createMyAppointment", args);
  const saved = await owner.client.query("appointments:listMyConfirmedAppointments", { date });
  assert.equal(saved[0].clientName, "Synthetic normalized");
  await owner.client.mutation("weeklySchedule:saveMyWeeklySchedule", { days: days.map((d) => ({ ...d, isOpen: false, start: null, end: null })) });
  assert.deepEqual(await owner.client.query("appointments:listMyConfirmedAppointments", { date }), saved);
  await assert.rejects(owner.client.mutation("appointments:createMyAppointment", { ...args, start: start + 60 * 60_000 }), /SLOT_UNAVAILABLE/);
  await stopBackend();
  await startBackend();
  assert.deepEqual(await restartCheck.client.query("appointments:listMyConfirmedAppointments", { date }), restartCheck.rows);
  assert.deepEqual(await owner.client.query("appointments:listMyConfirmedAppointments", { date }), saved);
  report.persistenceAfterRestart = true;
  report.weekChangePreservesInstants = true;
  report.anonymousRejected = true;
  }
  report.limits = "Synthetic independent HTTP clients against real isolated local Convex/SQLite; not cloud races, Clerk, network fault injection, or load certification.";
  report.totalRequestsInRaces = report.scenarios.reduce((sum, s) => sum + s.requests, 0);
  report.success = true;
  console.log(redactReschedulingEvidence(redactManagementEvidence(JSON.stringify(report, null, 2))));
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex !== -1) {
    const reportPath = process.argv[reportIndex + 1];
    assert.ok(path.isAbsolute(reportPath), "El destino del informe debe ser absoluto.");
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, redactReschedulingEvidence(redactManagementEvidence(JSON.stringify(report, null, 2))) + "\n");
  }
} catch (cause) {
  // Do not emit raw backend logs or generated administrative credentials.
  console.error(redactReschedulingEvidence(redactManagementEvidence(cause.message)));
  process.exitCode = 1;
} finally {
  await stopBackend();
  if (mailProvider) await mailProvider.close();
  const resolved = await realpath(workspace);
  assert.equal(path.dirname(resolved), temporaryRoot);
  assert.ok(path.basename(resolved).startsWith("slotly-appointments-engine-"));
  assert.equal(await readFile(path.join(resolved, "owned-test-workspace"), "utf8"), marker);
  await rm(resolved, { recursive: true, force: true });
  console.log("Backend detenido; únicamente su directorio temporal propio fue eliminado.");
}
