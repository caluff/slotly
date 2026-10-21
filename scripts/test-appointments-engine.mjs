import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile, readdir } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir, homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";

// REAL engine integration, entirely synthetic. Never reads .env.local or .convex.
// Requires the Convex backend binary cached by the CLI, or SLOTLY_CONVEX_BACKEND.
// Run: pnpm test:appointments:engine [--report <absolute JSON output path>]
const repo = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = await realpath(tmpdir());
const workspace = await mkdtemp(path.join(temporaryRoot, "slotly-appointments-engine-"));
const marker = randomUUID();
await writeFile(path.join(workspace, "owned-test-workspace"), marker);
let backend;
const report = { environment: "isolated real Convex engine / SQLite", synthetic: true, scenarios: [] };
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(CONVEX_|NEXT_PUBLIC_CONVEX_|CLERK_|NEXT_PUBLIC_CLERK_)/.test(key)));

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
  await writeFile(path.join(workspace, "convex", "auth.config.ts"), "export default { providers: [] };\n");
  // Test-only seed, generated ONLY in the owned temporary deployment. It is
  // never added to app functions or synchronized with a cloud deployment.
  await writeFile(path.join(workspace, "convex", "engineFixtures.ts"), `
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireMyBusiness } from "./lib/appointmentData";
export const cancelledHistory = internalMutation({
  args: { serviceId: v.id("services"), date: v.string(), start: v.number() }, returns: v.number(),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    const service = await ctx.db.get("services", args.serviceId);
    if (!service || service.businessId !== business._id) throw new Error("Synthetic fixture ownership");
    for (let i = 0; i < 1600; i++) await ctx.db.insert("appointments", { ...args, businessId: business._id, serviceName: service.name, clientName: "Synthetic cancelled history", end: args.start + 30 * 60000, status: "cancelled", cancelledAt: Date.now() });
    return 1600;
  }
});\n`);
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
  const dateObject = new Date(Date.now() + 14 * 86_400_000);
  dateObject.setUTCDate(dateObject.getUTCDate() + (8 - dateObject.getUTCDay()) % 7);
  const date = dateObject.toISOString().slice(0, 10);
  const start = Date.parse(`${date}T09:30:00-03:00`);
  const days = Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isOpen: i === 0, start: i === 0 ? "09:00" : null, end: i === 0 ? "12:00" : null }));
  const makeClient = (identity, customFetch) => {
    const client = new ConvexHttpClient(url, { logger: false, fetch: customFetch });
    if (identity) client.setAdminAuth(adminKey, identity);
    return client;
  };
  async function setup() {
    const identity = { subject: `synthetic_${randomUUID()}`, issuer: "https://synthetic.test" };
    const client = makeClient(identity);
    await client.mutation("businesses:createMyBusiness", { name: "Synthetic engine test", timeZone: "America/Montevideo" });
    const serviceId = await client.mutation("services:createMyService", { name: "Synthetic 30", durationMinutes: 30 });
    const secondServiceId = await client.mutation("services:createMyService", { name: "Synthetic 46", durationMinutes: 46 });
    await client.mutation("weeklySchedule:saveMyWeeklySchedule", { days });
    return { identity, client, serviceId, secondServiceId };
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
    const results = await Promise.allSettled(operations.map(({ who, name, args }) => makeClient(who.identity, concurrentFetch).mutation(name, args, { skipQueue: true })));
    assert.equal(maxInFlight, operations.length);
    return { results, maxInFlight };
  }
  const createOperation = (who, serviceId = who.serviceId, offset = 0) => ({ who, name: "appointments:createMyAppointment", args: { date, start: start + offset, serviceId, clientName: "Synthetic race" } });
  const cancelOperation = (who, appointmentId) => ({ who, name: "appointments:cancelMyAppointment", args: { appointmentId } });
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
      const cancelArgs = { appointmentId: original };
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
      assert.deepEqual(originalAfter, { ...before, status: "cancelled", cancelledAt: originalAfter.cancelledAt });
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
  report.limits = "Synthetic independent HTTP clients against real isolated local Convex/SQLite; not cloud races, Clerk, network fault injection, or load certification.";
  report.totalRequestsInRaces = report.scenarios.reduce((sum, s) => sum + s.requests, 0);
  report.success = true;
  console.log(JSON.stringify(report, null, 2));
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex !== -1) {
    const reportPath = process.argv[reportIndex + 1];
    assert.ok(path.isAbsolute(reportPath), "El destino del informe debe ser absoluto.");
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  }
} catch (cause) {
  // Do not emit raw backend logs or generated administrative credentials.
  console.error(cause.message);
  process.exitCode = 1;
} finally {
  await stopBackend();
  const resolved = await realpath(workspace);
  assert.equal(path.dirname(resolved), temporaryRoot);
  assert.ok(path.basename(resolved).startsWith("slotly-appointments-engine-"));
  assert.equal(await readFile(path.join(resolved, "owned-test-workspace"), "utf8"), marker);
  await rm(resolved, { recursive: true, force: true });
  console.log("Backend detenido; únicamente su directorio temporal propio fue eliminado.");
}
