import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const options = new Map();
assert(args.length % 2 === 0, "Uso: pnpm verify:smoke --base-url <origen> [--report <JSON absoluto>]");
for (let i = 0; i < args.length; i += 2) {
  assert(["--base-url", "--report"].includes(args[i]) && !options.has(args[i]), "Opción inválida o repetida");
  options.set(args[i], args[i + 1]);
}
const origin = new URL(options.get("--base-url"));
assert(!origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === "/", "Solo se acepta un origen sin credenciales ni parámetros");
assert(origin.protocol === "https:" || (origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)), "HTTPS o loopback local obligatorio");
const report = { at: new Date().toISOString(), origin: origin.origin, anonymous: true, writes: 0, checks: [] };
let failed = false;
for (const route of ["/", "/demo", "/sign-in", "/dashboard", "/gestionar-cita", "/api/health"]) {
  try {
    const response = await fetch(new URL(route, origin), { redirect: "manual", signal: AbortSignal.timeout(30000), headers: { "User-Agent": "Slotly-readonly-smoke/1.0" } });
    const text = await response.text();
    assert(text.length < 2_000_000, "Respuesta fuera del límite de inspección");
    const headers = response.headers;
    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.equal(headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(headers.get("referrer-policy"), "no-referrer");
    assert(headers.get("content-security-policy")?.includes("frame-ancestors 'self'"));
    if (route === "/dashboard") {
      const location = headers.get("location");
      assert((response.status >= 300 && response.status < 400 && location && new URL(location, origin).pathname.startsWith("/sign-in")) ||
        (response.status === 200 && /NEXT_REDIRECT/.test(text) && /sign-in/.test(text)), "La entrada privada anónima no mostró la redirección esperada");
    } else {
      assert.equal(response.status, 200);
      if (route === "/api/health") {
        assert.deepEqual(JSON.parse(text), { status: "ok" });
        assert(headers.get("cache-control")?.includes("no-store"));
      }
    }
    report.checks.push({ route, status: response.status, passed: true });
  } catch (error) {
    failed = true;
    // No response bodies, cookies, redirect URLs or raw network exceptions.
    report.checks.push({ route, passed: false, reason: error instanceof assert.AssertionError ? error.message.slice(0, 200) : "Petición no completada" });
  }
}
report.success = !failed;
if (options.has("--report")) {
  assert(path.isAbsolute(options.get("--report")), "El informe requiere ruta absoluta");
  await writeFile(options.get("--report"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = failed ? 1 : 0;
