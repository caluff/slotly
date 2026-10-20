import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = {
  "../convex/businesses.ts": () => import("../convex/businesses"),
  "../convex/_generated/server.js": () => import("../convex/_generated/server.js"),
};
const profile = { name: "Estudio de prueba", timeZone: "America/Montevideo" };
const alice = { subject: "user_alice", issuer: "https://clerk.test" };
const bob = { subject: "user_bob", issuer: "https://clerk.test" };

describe("perfil del negocio", () => {
  test("rechaza lecturas y escrituras sin autenticación", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.businesses.getMyBusiness, {})).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.mutation(api.businesses.createMyBusiness, profile)).rejects.toThrow("UNAUTHENTICATED");
  });

  test("distingue ausencia y perfil persistido, con nombre normalizado", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(alice);
    expect(await owner.query(api.businesses.getMyBusiness, {})).toBeNull();
    const id = await owner.mutation(api.businesses.createMyBusiness, { ...profile, name: "  Mi estudio  " });
    const saved = await t.withIdentity(alice).query(api.businesses.getMyBusiness, {});
    expect(saved).toMatchObject({ _id: id, name: "Mi estudio", timeZone: profile.timeZone });
    expect(saved).not.toHaveProperty("ownerId");
    expect(saved?._creationTime).toEqual(expect.any(Number));
  });

  test.each(["", "   ", "\n\t", "a".repeat(101)])("rechaza un nombre inválido: %j", async (name) => {
    const t = convexTest(schema, modules);
    await expect(t.withIdentity(alice).mutation(api.businesses.createMyBusiness, { ...profile, name })).rejects.toThrow("INVALID_NAME");
    expect(await t.withIdentity(alice).query(api.businesses.getMyBusiness, {})).toBeNull();
  });

  test.each(["", "   ", "America/Inventada", "Montevideo", "+03:00", "-0300"])("rechaza zona horaria inválida: %j", async (timeZone) => {
    const t = convexTest(schema, modules);
    await expect(t.withIdentity(alice).mutation(api.businesses.createMyBusiness, { ...profile, timeZone })).rejects.toThrow("INVALID_TIME_ZONE");
    expect(await t.withIdentity(alice).query(api.businesses.getMyBusiness, {})).toBeNull();
  });

  test.each(["UTC", "Europe/Madrid", "America/Argentina/Buenos_Aires"])("acepta zona IANA: %s", async (timeZone) => {
    const t = convexTest(schema, modules);
    await t.withIdentity(alice).mutation(api.businesses.createMyBusiness, { ...profile, timeZone });
    expect(await t.withIdentity(alice).query(api.businesses.getMyBusiness, {})).toMatchObject({ timeZone });
  });

  test("un envío repetido no duplica ni sobrescribe", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(alice);
    await owner.mutation(api.businesses.createMyBusiness, profile);
    await expect(owner.mutation(api.businesses.createMyBusiness, { ...profile, name: "Otro" })).rejects.toThrow("BUSINESS_ALREADY_EXISTS");
    expect(await owner.query(api.businesses.getMyBusiness, {})).toMatchObject(profile);
    expect(await t.run((ctx) => ctx.db.query("businesses").take(3))).toHaveLength(1);
  });

  test("dos identidades con el mismo correo mantienen negocios separados", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity({ ...alice, email: "shared@example.test" });
    const asBob = t.withIdentity({ ...bob, email: "shared@example.test" });
    await asAlice.mutation(api.businesses.createMyBusiness, profile);
    expect(await asBob.query(api.businesses.getMyBusiness, {})).toBeNull();
    await asBob.mutation(api.businesses.createMyBusiness, { ...profile, name: "Negocio B" });
    expect(await asAlice.query(api.businesses.getMyBusiness, {})).toMatchObject(profile);
    expect(await asBob.query(api.businesses.getMyBusiness, {})).toMatchObject({ name: "Negocio B" });
    const owners = await t.run(async (ctx) => (await ctx.db.query("businesses").take(3)).map((row) => row.ownerId));
    expect(owners.sort()).toEqual([alice.subject, bob.subject]);
  });

  test("rechaza argumentos de propietario y estructuras manipuladas", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(alice);
    // @ts-expect-error Exercise runtime validation against a forged request.
    await expect(owner.mutation(api.businesses.createMyBusiness, { ...profile, ownerId: bob.subject })).rejects.toThrow();
    // @ts-expect-error There is no public API to select someone else's business.
    await expect(owner.query(api.businesses.getMyBusiness, { ownerId: bob.subject })).rejects.toThrow();
    // @ts-expect-error Exercise runtime argument types, independent of the form.
    await expect(owner.mutation(api.businesses.createMyBusiness, { ...profile, name: 42 })).rejects.toThrow();
    expect(await owner.query(api.businesses.getMyBusiness, {})).toBeNull();
  });
});
