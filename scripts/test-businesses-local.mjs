import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";

// This check uses administrative test identities, not Clerk sessions. Restrict
// it to the local backend; never print its administrative credential.
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
assert.equal(new URL(url).origin, "http://127.0.0.1:3210", "Esta prueba solo admite el backend local en el puerto 3210.");
const { adminKey } = JSON.parse(readFileSync(new URL("../.convex/local/default/config.json", import.meta.url), "utf8"));
const runId = randomUUID();
const identity = { subject: `slotly_test_${runId}`, issuer: "https://slotly.test" };
const profile = { name: "Negocio de prueba automática", timeZone: "America/Montevideo" };
const makeClient = (asIdentity) => {
  const client = new ConvexHttpClient(url, { logger: false });
  if (asIdentity) client.setAdminAuth(adminKey, asIdentity);
  return client;
};

const anonymous = makeClient();
await assert.rejects(anonymous.query("businesses:getMyBusiness", {}), /UNAUTHENTICATED/);
await assert.rejects(anonymous.mutation("businesses:createMyBusiness", profile), /UNAUTHENTICATED/);

const owner = makeClient(identity);
assert.equal(await owner.query("businesses:getMyBusiness", {}), null);
for (const name of ["", "  ", "x".repeat(101)]) {
  await assert.rejects(owner.mutation("businesses:createMyBusiness", { ...profile, name }), /INVALID_NAME/);
}
for (const timeZone of ["", "America/Inventada", "+03:00"]) {
  await assert.rejects(owner.mutation("businesses:createMyBusiness", { ...profile, timeZone }), /INVALID_TIME_ZONE/);
}
await assert.rejects(owner.mutation("businesses:createMyBusiness", { ...profile, ownerId: "someone_else" }));

// Separate HTTP clients prevent client-side serialization of the writes.
const submissions = await Promise.allSettled(Array.from({ length: 10 }, () =>
  makeClient(identity).mutation("businesses:createMyBusiness", profile),
));
assert.equal(submissions.filter((r) => r.status === "fulfilled").length, 1);
for (const result of submissions.filter((r) => r.status === "rejected")) {
  assert.match(String(result.reason), /BUSINESS_ALREADY_EXISTS/);
}
const saved = await makeClient(identity).query("businesses:getMyBusiness", {});
assert.equal(saved.name, profile.name);
assert.equal(saved.timeZone, profile.timeZone);
assert.ok(!("ownerId" in saved));
await assert.rejects(owner.mutation("businesses:createMyBusiness", { ...profile, name: "Sobrescritura" }), /BUSINESS_ALREADY_EXISTS/);
assert.equal((await owner.query("businesses:getMyBusiness", {})).name, profile.name);

const other = makeClient({ ...identity, subject: `${identity.subject}_other` });
assert.equal(await other.query("businesses:getMyBusiness", {}), null);
await other.mutation("businesses:createMyBusiness", { ...profile, name: "Segundo propietario de prueba" });
assert.notEqual((await other.query("businesses:getMyBusiness", {}))._id, saved._id);
assert.equal((await owner.query("businesses:getMyBusiness", {}))._id, saved._id);

const forged = makeClient();
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
forged.setAuth(`${encode({ alg: "none" })}.${encode({ sub: identity.subject, iss: "https://slotly.test", aud: "convex", exp: Math.floor(Date.now() / 1000) + 60 })}.`);
await assert.rejects(forged.query("businesses:getMyBusiness", {}));

console.log("Backend local: autorización, validación, aislamiento y token falso comprobados.");
console.log("Concurrencia real: 10 solicitudes HTTP, 1 creación y 9 rechazos; perfil intacto.");
console.log("Se conservaron dos perfiles sintéticos con propietario slotly_test_ en la base local.");
