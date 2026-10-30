import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
assert.equal(path.resolve(process.cwd()), path.resolve(root), "Ejecuta pnpm verify:build desde la raíz de Slotly.");
assert.equal(process.versions.node.split(".")[0], "24", "La verificación de publicación requiere Node24 LTS.");
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === "--output" && path.isAbsolute(args[1])),
  "Uso: pnpm verify:build [--output <directorio absoluto de evidencia>]");
const require = createRequire(import.meta.url);
assert.equal(require("next/package.json").version, "16.4.2", "Revisa el transporte de configuración antes de actualizar Next.");
const marker = randomUUID();
const distDir = "node_modules/.cache/slotly-verify-build-" + marker;
const buildPath = path.resolve(root, distDir);
const configPath = buildPath + ".tsconfig.json";
const markerPath = buildPath + ".owned";
const destination = args[1] ?? path.join(root, "node_modules/.cache/slotly-verification");
assert(buildPath.startsWith(path.join(root, "node_modules", ".cache") + path.sep));
await fs.mkdir(path.dirname(buildPath), { recursive: true });
await fs.mkdir(destination, { recursive: true });
await fs.writeFile(markerPath, marker, { flag: "wx" });
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
async function declarationOrNull() {
  try { return await fs.readFile(path.join(root, "next-env.d.ts")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
const protectedNames = ["next.config.ts", "tsconfig.json", "next-env.d.ts"];
const before = new Map(await Promise.all(protectedNames.map(async name =>
  [name, name === "next-env.d.ts" ? await declarationOrNull() : await fs.readFile(path.join(root, name))])));
const absolute = name => path.join(root, name).replaceAll("\\", "/");

// This process receives synthetic build-only values. Existing env files are
// neither edited nor copied; no deploy, codegen or application mutation runs.
for (const key of Object.keys(process.env)) {
  if (/^(CONVEX_|NEXT_PUBLIC_CONVEX_|CLERK_|NEXT_PUBLIC_CLERK_|SLOTLY_EMAIL_|RESEND_)/.test(key)) delete process.env[key];
}
Object.assign(process.env, {
  SLOTLY_APP_ENV: "development", VERCEL: "0", VERCEL_ENV: "development",
  NEXT_PUBLIC_CONVEX_URL: "http://127.0.0.1:59998",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_" + Buffer.from("clerk.synthetic.invalid$").toString("base64"),
  CLERK_SECRET_KEY: "",
  CLERK_JWT_ISSUER_DOMAIN: "https://clerk.synthetic.invalid",
  SLOTLY_EMAIL_READY: "false", SLOTLY_EMAIL_FROM: "", SLOTLY_EMAIL_RESEND_API_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
});
const { default: projectConfig } = await import(pathToFileURL(path.join(root, "next.config.ts")).href);
const loadConfig = require("next/dist/server/config").default;
const { PHASE_PRODUCTION_BUILD } = require("next/constants");
let buildExit = null;
let childNode = "";
try {
  await fs.writeFile(configPath, JSON.stringify({
    extends: "../../tsconfig.json",
    compilerOptions: { incremental: false },
    include: ["next-env.d.ts", "app/**/*.ts", "app/**/*.tsx", "components/**/*.ts", "components/**/*.tsx",
      "convex/**/*.ts", "lib/**/*.ts", "proxy.ts", distDir + "/types/**/*.ts"].map(absolute),
    exclude: [absolute("node_modules")],
  }, null, 2), { flag: "wx" });
  // Public distDir/tsconfigPath options, delivered through the installed Next
  // 16.4.2 serialized-config transport in this verification child only.
  const effective = await loadConfig(PHASE_PRODUCTION_BUILD, root, {
    customConfig: { ...projectConfig, distDir,
      typescript: { ...projectConfig.typescript, tsconfigPath: distDir + ".tsconfig.json" } },
    silent: true,
  });
  assert.equal(path.resolve(root, effective.distDir), buildPath);
  assert.equal(effective.distDirRoot, distDir);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"));
  env.PATH = path.dirname(process.execPath) + path.delimiter + process.env.PATH;
  env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(effective);
  env.NEXT_PRIVATE_UPGRADE_BUILD_CHILD = "1";
  async function pnpm(command, capture = false) {
    const child = process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", "pnpm " + command.join(" ")], {
        cwd: root, env, windowsHide: true, stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      })
      : spawn("pnpm", command, { cwd: root, env, stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit" });
    let output = "";
    if (capture) child.stdout.on("data", chunk => { output += chunk; });
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject); child.once("exit", resolve);
    });
    return { code, output: output.trim() };
  }
  const runtime = await pnpm(["exec", "node", "--version"], true);
  assert.equal(runtime.code, 0);
  assert.match(runtime.output, /^v24\./, "El proceso hijo de pnpm debe usar Node24.");
  childNode = runtime.output;
  console.log("Build aislado: " + childNode + ", Next16.4.2, salida " + marker);
  const result = await pnpm(["exec", "next", "build"]);
  buildExit = result.code;
  assert.equal(buildExit, 0, "El build no terminó correctamente.");
  const buildId = (await fs.readFile(path.join(buildPath, "BUILD_ID"), "utf8")).trim();
  await fs.writeFile(path.join(destination, "build-result-" + marker + ".json"), JSON.stringify({
    at: new Date().toISOString(), marker, buildExit, node: process.version, childNode,
    next: "16.4.2", buildId, distDir, syntheticBuildValues: true,
    sharedNextUsedAsBuildOutput: false, applicationRoot: root,
    privateConfigTransportPinnedToInstalledNext: true,
  }, null, 2), { flag: "wx" });
} finally {
  const declaration = await declarationOrNull();
  const originalDeclaration = before.get("next-env.d.ts");
  if (declaration && !declaration.equals(originalDeclaration ?? Buffer.alloc(0))) {
    assert(declaration.toString().includes(distDir), "Cambio concurrente inesperado de next-env.d.ts; se conserva para revisión.");
    if (originalDeclaration) await fs.writeFile(path.join(root, "next-env.d.ts"), originalDeclaration);
    else await fs.unlink(path.join(root, "next-env.d.ts"));
  }
  for (const [name, bytes] of before) {
    const current = name === "next-env.d.ts" ? await declarationOrNull() : await fs.readFile(path.join(root, name));
    assert.equal(current === null ? null : hash(current), bytes === null ? null : hash(bytes), "Cambió la configuración compartida: " + name);
  }
  assert.equal(await fs.readFile(markerPath, "utf8"), marker);
  let archived = false;
  try { await fs.rename(buildPath, path.join(destination, "compiled-build-" + marker)); archived = true; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  try { await fs.rename(configPath, path.join(destination, "build-tsconfig-" + marker + ".json")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  await fs.rename(markerPath, path.join(destination, "build-ownership-" + marker + ".txt"));
  await fs.writeFile(path.join(destination, "build-preservation-" + marker + ".json"), JSON.stringify({
    at: new Date().toISOString(), marker, buildExit, childNode, archived,
    sharedConfigurationPreserved: Object.fromEntries([...before].map(([name, bytes]) => [name, bytes === null ? null : hash(bytes)])),
    noSharedBuildOutput: true, noDeploymentOrDataCommands: true,
  }, null, 2), { flag: "wx" });
}
