import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export const archiveFixtureSource = `
export const archiveDense = internalMutation({
  args: { date: v.string(), serviceId: v.id("services"), secondServiceId: v.id("services"), count: v.number(), archived: v.number(), clientId: v.optional(v.id("clients")) }, returns: v.array(v.id("appointments")),
  handler: async (ctx,args) => {
    const business=await requireMyBusiness(ctx), service=await ctx.db.get("services",args.serviceId), second=await ctx.db.get("services",args.secondServiceId);
    if(!service||!second||service.businessId!==business._id||second.businessId!==business._id||args.count>300)throw Error("Synthetic archive fixture bound");
    if(args.clientId&&(await ctx.db.get("clients",args.clientId))?.businessId!==business._id)throw Error("Synthetic archive client ownership");
    const ids=[];
    for(let index=0;index<args.count;index++) {
      const selected=index%2?second:service, start=Date.parse(args.date+"T08:00:00-03:00")+index*60000;
      ids.push(await ctx.db.insert("appointments",{businessId:business._id,serviceId:selected._id,serviceName:selected.name,clientName:"Archive dense "+index,date:args.date,start,end:start+selected.durationMinutes*60000,status:"cancelled",cancelledAt:start-1000,
        ...(args.clientId?{clientId:args.clientId}:{}),...(index<args.archived?{calendarArchived:true as const,calendarArchivedAt:start-500,calendarArchiveVersion:1}:{})}));
    }
    return ids;
  }
});
export const archiveSnapshot = internalQuery({ args:{},returns:v.any(),handler:async ctx=>{
  const business=await requireMyBusiness(ctx), tables:Record<string,unknown>={};
  for(const table of ["appointments","clients","services","weeklySchedules","specialDates","timeBlocks","publicBookingReceipts","privateBookingReceipts","emailConfirmations","publicBookingAccesses","publicRescheduleReceipts","appointmentNotices","publicBookingProfiles"] as const)tables[table]=(await ctx.db.query(table).take(1500)).filter(row=>!("businessId"in row)||row.businessId===business._id);
  return {business,tables,jobs:await ctx.db.system.query("_scheduled_functions").take(1500)};
}});
`;

export async function archiveScenarios({ setup, makeClient, race, report, date, start, restart }) {
  const anon = makeClient(), serial = [], api = "appointmentArchive:setMyCalendarArchive";
  const snapshot = who => who.client.query("engineFixtures:archiveSnapshot", {});
  const row = async (who,id) => (await snapshot(who)).tables.appointments.find(item=>item._id===id);
  const withoutArchive = value => Object.fromEntries(Object.entries(value).filter(([key])=>!key.startsWith("calendarArchiv")));
  const command = (id,extra={}) => ({appointmentId:id,expectedVersion:1,expectedArchiveVersion:0,operationId:randomUUID(),archived:true,...extra});
  const set = (who,args) => who.client.mutation(api,args,{skipQueue:true});
  const code = async (promise, expected) => assert.rejects(promise, error=>error.data?.code===expected);
  async function cancelled(who, offset=0) {
    const made=await who.client.mutation("appointments:createMyAppointment",{serviceId:who.serviceId,date,start:start+offset,clientName:"Synthetic archive",email:"archive@example.test",operationId:randomUUID()});
    await who.client.mutation("appointments:cancelMyAppointment",{appointmentId:made.appointmentId,expectedVersion:0});
    return made.appointmentId;
  }
  const who=await setup("Archive serial"), other=await setup("Archive other owner"), id=await cancelled(who), before=await snapshot(who), initial=await row(who,id), cmd=command(id);
  await code(anon.mutation(api,cmd),"UNAUTHENTICATED");
  await code(set(other,cmd),"APPOINTMENT_NOT_FOUND");
  await code(set(who,{...cmd,operationId:"bad"}),"INVALID_OPERATION");
  await code(set(who,{...cmd,expectedArchiveVersion:-1}),"INVALID_VERSION");
  await code(set(who,{...cmd,expectedVersion:0}),"APPOINTMENT_CONFLICT");
  const confirmed=await who.client.mutation("appointments:createMyAppointment",{serviceId:who.serviceId,date,start:start+60*60000,clientName:"Confirmed stays",email:"confirmed@example.test",operationId:randomUUID()});
  await code(set(who,command(confirmed.appointmentId,{expectedVersion:0})),"APPOINTMENT_NOT_CANCELLED");
  for(const result of ["completed","no_show"]) {
    const past=await who.client.mutation("engineFixtures:pastAppointment",{serviceId:who.serviceId});
    const marked=await who.client.mutation("appointments:markMyAppointmentResult",{appointmentId:past,expectedVersion:0,operationId:randomUUID(),result});
    const frozen=await row(who,past);
    await code(set(who,command(past,{expectedVersion:frozen.version})),"APPOINTMENT_NOT_CANCELLED");
    assert.deepEqual(await row(who,past),frozen);
    await who.client.mutation("appointments:undoMyAppointmentResult",{appointmentId:past,expectedVersion:marked.undo.version,targetOperationId:marked.undo.operationId,operationId:randomUUID()});
    assert.equal((await row(who,past)).status,"confirmed");
  }
  serial.push({group:"auth-owner-invalid-command-version-and-three-noncancelled-states-results-undo",passed:true});
  const beforeArchive=await snapshot(who), applied=await set(who,cmd), archived=await row(who,id);
  assert.equal(applied.outcome,"changed"); assert.equal(applied.archiveVersion,1); assert.equal(archived.calendarArchived,true); assert.equal(archived.version,1);
  assert.deepEqual(withoutArchive(archived),initial);
  const afterArchive=await snapshot(who);
  assert.deepEqual({...afterArchive,tables:{...afterArchive.tables,appointments:afterArchive.tables.appointments.map(withoutArchive)}},{...beforeArchive,tables:{...beforeArchive.tables,appointments:beforeArchive.tables.appointments.map(withoutArchive)}});
  assert.equal((await set(who,cmd)).outcome,"already_applied"); assert.deepEqual(await row(who,id),archived);
  await code(set(who,{...cmd,archived:false}),"COMMAND_CONFLICT");
  await code(set(who,command(id)),"APPOINTMENT_ARCHIVE_CONFLICT");
  const undo=command(id,{archived:false,expectedArchiveVersion:1});
  assert.equal((await set(who,undo)).archiveVersion,2); const restored=await row(who,id);
  assert.equal(restored.calendarArchived,undefined); assert.equal(restored.calendarArchivedAt,undefined); assert.deepEqual(withoutArchive(restored),initial);
  assert.equal((await set(who,undo)).outcome,"already_applied"); assert.deepEqual(await row(who,id),restored);
  const again=command(id,{expectedArchiveVersion:2}); await set(who,again); const aba=await row(who,id);
  await code(set(who,cmd),"APPOINTMENT_ARCHIVE_CONFLICT"); await code(set(who,undo),"APPOINTMENT_ARCHIVE_CONFLICT"); assert.deepEqual(await row(who,id),aba);
  serial.push({group:"archive-replay-payload-conflict-undo-exact-replay-ABA-and-full-documents-jobs-unchanged",passed:true});
  const query={client:"",period:"todas",status:"cancelled",from:date,until:date,paginationOpts:{numItems:20,cursor:null}};
  assert.equal((await who.client.query("appointments:searchMyAppointments",{...query,calendarOnly:true})).page.some(item=>item._id===id),false);
  assert.equal((await who.client.query("appointments:searchMyAppointments",query)).page.some(item=>item._id===id),true);
  const clientId=initial.clientId;
  assert.equal((await who.client.query("clients:listMyClientAppointments",{clientId,paginationOpts:{numItems:20,cursor:null}})).page.some(item=>item._id===id),true);
  serial.push({group:"calendar-hidden-history-and-client-history-retained",passed:true});
  const pub=await setup("Archive public receipt"), link=await pub.client.mutation("bookingLinks:setMyBookingLink",{enabled:true});
  const booking={slug:link.slug,serviceId:pub.serviceId,date,start,clientName:"Synthetic public archive",email:"public-archive@example.test",attemptKey:randomUUID()};
  const originalReceipt=await anon.mutation("publicBooking:confirm",booking), pubId=(await snapshot(pub)).tables.appointments[0]._id;
  await pub.client.mutation("appointments:cancelMyAppointment",{appointmentId:pubId,expectedVersion:0});
  const originalPublic=await snapshot(pub); await set(pub,command(pubId));
  assert.deepEqual(await anon.mutation("publicBooking:confirm",booking),originalReceipt);
  const afterPublic=await snapshot(pub); assert.deepEqual(afterPublic.tables.publicBookingReceipts,originalPublic.tables.publicBookingReceipts); assert.deepEqual(afterPublic.tables.publicBookingAccesses,originalPublic.tables.publicBookingAccesses); assert.deepEqual(afterPublic.jobs,originalPublic.jobs);
  const available=await anon.action("publicBooking:getAvailability",{slug:link.slug,serviceId:pub.serviceId,date}); assert(available.slots.some(slot=>slot.start===start));
  serial.push({group:"public-original-receipt-recovery-relations-and-released-occupation-preserved",passed:true});
  const dense=await setup("Archive dense"), denseId=await cancelled(dense), denseClient=(await row(dense,denseId)).clientId;
  await dense.client.mutation("engineFixtures:archiveDense",{date,serviceId:dense.serviceId,secondServiceId:dense.secondServiceId,count:220,archived:200,clientId:denseClient});
  async function pages(args) { let cursor=null, found=[], count=0; do { const result=await dense.client.query("appointments:searchMyAppointments",{...query,...args,paginationOpts:{numItems:7,cursor}}); found.push(...result.page); cursor=result.isDone?null:result.continueCursor; assert(++count<100); }while(cursor); return {found,count}; }
  const visible=await pages({calendarOnly:true}), full=await pages({}); assert.equal(visible.found.length,21); assert.equal(full.found.length,221); assert.equal(new Set(full.found.map(item=>item._id)).size,221);
  assert.equal((await pages({calendarOnly:true,serviceId:dense.secondServiceId})).found.length,10);
  assert.equal((await pages({calendarOnly:true,client:"dense 1"})).found.length,0);
  const searched=await pages({client:"dense 1"}); assert(searched.found.length>0); assert(searched.found.every(item=>item.calendarArchivedAt!==undefined));
  serial.push({group:"dense-221-records-visible-index-history-service-name-empty-pages-stable-cursors",passed:true,visiblePages:visible.count,historyPages:full.count});
  let dropped=false, requests=0, surfaced;
  const lost=makeClient(who.identity,async(...args)=>{requests++;const response=await fetch(...args);if(!dropped){dropped=true;await response.arrayBuffer();throw Error("Synthetic response discarded after server commit");}return response;});
  const recover=command(id,{archived:false,expectedArchiveVersion:3});
  try { await lost.mutation(api,recover,{skipQueue:true}); surfaced="resolved"; }catch{surfaced="rejected";}
  assert(dropped); const committed=await row(who,id); assert.equal(committed.calendarArchiveVersion,4); assert.equal((await set(who,recover)).outcome,"already_applied"); assert.deepEqual(await row(who,id),committed);
  const durable=await snapshot(who); await restart(); assert.deepEqual(await snapshot(who),durable); assert.equal((await set(who,JSON.parse(JSON.stringify(recover)))).outcome,"already_applied"); assert.deepEqual(await snapshot(who),durable);
  serial.push({group:"discarded-real-http-reply-exact-recovery-and-SQLite-restart",passed:true,transportRequests:requests,discardedResponses:1,callerOutcome:surfaced});
  for(let round=1;round<=3;round++)for(const scenario of ["duplicate-command","different-commands","archive-vs-restore-noop","restore-vs-archive-noop"]) {
    const actor=await setup(`Archive ${scenario} ${round}`), target=await cancelled(actor), base=await row(actor,target), restoring=scenario==="restore-vs-archive-noop";
    if(restoring)await set(actor,command(target));
    const a=command(target,{archived:!restoring,expectedArchiveVersion:restoring?1:0});
    const b=scenario==="duplicate-command"?a:command(target,{archived:scenario==="different-commands"?true:restoring,expectedArchiveVersion:restoring?1:0});
    const ops=[a,b]; if(round===2)ops.reverse();
    const {results,maxInFlight}=await race(ops.map(args=>({who:actor,name:api,args})));
    assert.equal(results.filter(result=>result.status==="fulfilled"&&result.value.outcome==="changed").length,1);
    if(scenario==="duplicate-command")assert.equal(results.filter(result=>result.status==="fulfilled").length,2);
    if(scenario==="different-commands")assert.equal(results.filter(result=>result.status==="rejected").length,1);
    for(const result of results)if(result.status==="rejected")assert.equal(result.reason.data?.code,"APPOINTMENT_ARCHIVE_CONFLICT");
    const final=await row(actor,target); assert.equal(final.calendarArchived===true,!restoring); assert.equal(final.calendarArchiveVersion,restoring?2:1); assert.deepEqual(withoutArchive(final),base);
    report.scenarios.push({feature:"appointment-archive",round,scenario,requests:2,maxInFlight,outcomesByRequest:results.map(result=>result.status==="fulfilled"?result.value.outcome:result.reason.data.code),finalDocument:final,originalLogicalDocumentIdentical:true});
  }
  assert.deepEqual(before.tables.publicBookingReceipts,[]);
  report.appointmentArchive={serial,races:12,participatingRequests:24,rounds:3,realEngine:true,synthetic:true,cloudWrites:0};
  report.limits="Synthetic independent HTTP clients on real local Convex/SQLite. One owned HTTP reply was discarded after commit and recovered exactly; no external network failure, cloud races, Clerk or load certification. Outcomes are per request, not inferred internal commit order.";
}
