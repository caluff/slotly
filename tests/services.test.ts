import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = {
  "../convex/businesses.ts": () => import("../convex/businesses"),
  "../convex/services.ts": () => import("../convex/services"),
  "../convex/_generated/server.js": () => import("../convex/_generated/server.js"),
};
const alice = { subject: "user_alice", issuer: "https://clerk.test" };
const bob = { subject: "user_bob", issuer: "https://clerk.test" };
const profile = { name: "Negocio sintético", timeZone: "America/Montevideo" };
const valid = { name: "Consulta sintética", durationMinutes: 30 };
const firstPage = { paginationOpts: { numItems: 20, cursor: null } };

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(alice);
  const businessId = await owner.mutation(api.businesses.createMyBusiness, profile);
  return { t, owner, businessId };
}

describe("servicios del negocio", () => {
  test("rechaza lecturas y escrituras sin sesión aunque ya existan servicios", async () => {
    const { t, owner } = await setup();
    await owner.mutation(api.services.createMyService, valid);
    await expect(t.query(api.services.listMyServices, firstPage)).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.mutation(api.services.createMyService, valid)).rejects.toThrow("UNAUTHENTICATED");
    expect((await owner.query(api.services.listMyServices, firstPage)).page).toHaveLength(1);
  });

  test("rechaza ambas operaciones si la cuenta no tiene negocio y no lo crea implícitamente", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(alice);
    await expect(owner.query(api.services.listMyServices, firstPage)).rejects.toThrow("BUSINESS_NOT_FOUND");
    await expect(owner.mutation(api.services.createMyService, valid)).rejects.toThrow("BUSINESS_NOT_FOUND");
    expect(await owner.query(api.businesses.getMyBusiness, {})).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("services").take(1))).toEqual([]);
  });

  test("lista vacía, varios servicios normalizados, relación y lectura desde una nueva sesión", async () => {
    const { t, owner, businessId } = await setup();
    expect(await owner.query(api.services.listMyServices, firstPage)).toMatchObject({ page: [], isDone: true });
    const id = await owner.mutation(api.services.createMyService, { ...valid, name: "  Consulta  " });
    const secondId = await owner.mutation(api.services.createMyService, { name: "Seguimiento", durationMinutes: 15 });
    const saved = await t.withIdentity(alice).query(api.services.listMyServices, firstPage);
    expect(saved.page.map((row) => row._id).sort()).toEqual([id, secondId].sort());
    const row = saved.page.find((row) => row._id === id);
    expect(row).toMatchObject({ businessId, name: "Consulta", durationMinutes: 30, _creationTime: expect.any(Number) });
    expect(Object.keys(row!).sort()).toEqual(["_id", "_creationTime", "businessId", "name", "durationMinutes"].sort());
    expect(await owner.query(api.businesses.getMyBusiness, {})).toMatchObject({ _id: businessId, ...profile });
  });

  test.each(["", "   ", "\n\t", "a".repeat(101)])("rechaza nombre inválido %j sin insertar", async (name) => {
    const { owner } = await setup();
    await expect(owner.mutation(api.services.createMyService, { ...valid, name })).rejects.toThrow("INVALID_NAME");
    expect((await owner.query(api.services.listMyServices, firstPage)).page).toEqual([]);
  });

  test.each([0, -1, 1.5, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])
    ("rechaza duración inválida %s sin insertar", async (durationMinutes) => {
      const { owner } = await setup();
      await expect(owner.mutation(api.services.createMyService, { ...valid, durationMinutes })).rejects.toThrow("INVALID_DURATION");
      expect((await owner.query(api.services.listMyServices, firstPage)).page).toEqual([]);
    });

  test.each([1, Number.MAX_SAFE_INTEGER])("acepta duración límite %s y nombre de 100 caracteres", async (durationMinutes) => {
    const { owner } = await setup();
    await owner.mutation(api.services.createMyService, { name: ` ${"a".repeat(100)} `, durationMinutes });
    expect((await owner.query(api.services.listMyServices, firstPage)).page[0]).toMatchObject({ name: "a".repeat(100), durationMinutes });
  });

  test("dos cuentas con el mismo correo mantienen sus listas y negocios separados", async () => {
    const { t, businessId } = await setup();
    const asAlice = t.withIdentity({ ...alice, email: "shared@example.test" });
    const asBob = t.withIdentity({ ...bob, email: "shared@example.test" });
    const bobBusiness = await asBob.mutation(api.businesses.createMyBusiness, { ...profile, name: "Negocio B" });
    await asAlice.mutation(api.services.createMyService, valid);
    expect((await asBob.query(api.services.listMyServices, firstPage)).page).toEqual([]);
    await asBob.mutation(api.services.createMyService, { ...valid, name: "Solo B" });
    expect((await asAlice.query(api.services.listMyServices, firstPage)).page).toMatchObject([{ businessId, ...valid }]);
    expect((await asBob.query(api.services.listMyServices, firstPage)).page).toMatchObject([{ businessId: bobBusiness, name: "Solo B" }]);
  });

  test("rechaza propietario, negocio ajeno y tipos manipulados sin escribir en ninguna cuenta", async () => {
    const { t, owner } = await setup();
    const other = t.withIdentity(bob);
    const foreignBusinessId = await other.mutation(api.businesses.createMyBusiness, profile);
    // @ts-expect-error A forged request must fail runtime argument validation.
    await expect(owner.mutation(api.services.createMyService, { ...valid, businessId: foreignBusinessId })).rejects.toThrow();
    // @ts-expect-error Clients cannot choose an owner.
    await expect(owner.mutation(api.services.createMyService, { ...valid, ownerId: bob.subject })).rejects.toThrow();
    // @ts-expect-error There is no public lookup by business ID.
    await expect(owner.query(api.services.listMyServices, { ...firstPage, businessId: foreignBusinessId })).rejects.toThrow();
    // @ts-expect-error Neither can they select an owner on reads.
    await expect(owner.query(api.services.listMyServices, { ...firstPage, ownerId: bob.subject })).rejects.toThrow();
    // @ts-expect-error Backend validation must not coerce strings into numbers.
    await expect(owner.mutation(api.services.createMyService, { ...valid, durationMinutes: "30" })).rejects.toThrow();
    // @ts-expect-error The name must be a string at the API boundary.
    await expect(owner.mutation(api.services.createMyService, { ...valid, name: 42 })).rejects.toThrow();
    expect((await owner.query(api.services.listMyServices, firstPage)).page).toEqual([]);
    expect((await other.query(api.services.listMyServices, firstPage)).page).toEqual([]);
  });

  test("pagina todos los servicios del negocio sin omisiones ni duplicados", async () => {
    const { t, owner, businessId } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 55; i++) {
        await ctx.db.insert("services", { businessId, name: `Servicio ${i}`, durationMinutes: i + 1 });
      }
    });
    const first = await owner.query(api.services.listMyServices, { paginationOpts: { numItems: 1000, cursor: null } });
    expect(first.page).toHaveLength(50);
    expect(first.isDone).toBe(false);
    const next = await owner.query(api.services.listMyServices, { paginationOpts: { numItems: 20, cursor: first.continueCursor } });
    expect(next.isDone).toBe(true);
    expect(next.page).toHaveLength(5);
    expect(new Set([...first.page, ...next.page].map((row) => row._id)).size).toBe(55);
  });

  test("un cursor de otra cuenta nunca permite leer sus servicios", async () => {
    const { t, owner, businessId } = await setup();
    const other = t.withIdentity(bob);
    await other.mutation(api.businesses.createMyBusiness, profile);
    await owner.mutation(api.services.createMyService, valid);
    await other.mutation(api.services.createMyService, { ...valid, name: "Privado B1" });
    await other.mutation(api.services.createMyService, { ...valid, name: "Privado B2" });
    const foreignPage = await other.query(api.services.listMyServices, { paginationOpts: { numItems: 1, cursor: null } });
    // The engine may reject a cursor for a different range. If it accepts it,
    // the indexed business constraint must still apply to every returned row.
    await owner.query(api.services.listMyServices, {
      paginationOpts: { numItems: 20, cursor: foreignPage.continueCursor },
    }).then((result) => {
      expect(result.page.every((row) => row.businessId === businessId)).toBe(true);
    }, () => undefined);
    expect((await other.query(api.services.listMyServices, firstPage)).page).toHaveLength(2);
  });

  test.each([0, -1, 1.5, Number.NaN, Infinity])("rechaza tamaño de página inválido %s", async (numItems) => {
    const { owner } = await setup();
    await expect(owner.query(api.services.listMyServices, { paginationOpts: { numItems, cursor: null } })).rejects.toThrow("INVALID_PAGINATION");
  });

  test("el esquema rechaza documentos incompletos, tipos incorrectos e IDs de otra tabla", async () => {
    const { t, businessId } = await setup();
    await expect(t.run(async (ctx) => {
      // @ts-expect-error Missing required relation and duration.
      await ctx.db.insert("services", { name: "Incompleto" });
    })).rejects.toThrow();
    await expect(t.run(async (ctx) => {
      // @ts-expect-error Schema types are also validated at runtime.
      await ctx.db.insert("services", { businessId, name: "Inválido", durationMinutes: "30" });
    })).rejects.toThrow();
    const serviceId = await t.withIdentity(alice).mutation(api.services.createMyService, valid);
    await expect(t.run(async (ctx) => {
      // @ts-expect-error A service ID cannot stand in for a business ID.
      await ctx.db.insert("services", { businessId: serviceId, ...valid });
    })).rejects.toThrow();
  });
});
