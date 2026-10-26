import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { newManagementSecret, managementSecretHash } from "../lib/public-management.ts";

const secrets = new Set();
export function redactManagementEvidence(value) {
  let safe = String(value); for (const secret of secrets) safe = safe.replaceAll(secret, "[private-capability-redacted]"); return safe;
}
const token = () => { const value = newManagementSecret(); secrets.add(value); return value; };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function publicManagementScenarios({setup,date,start,makeClient,race,report,restart,workspace,provider,setEmailEnvironment}) {
  const serial = [], context = {name:"Synthetic 30",durationMinutes:30,version:0}, legacyContext={name:"Synthetic 46",durationMinutes:46,version:0};
  const plain = who => makeClient(who?.identity,undefined,false);
  const op=(who,name,args,kind)=>({who,name,args,...(kind?{kind}:{})});
  const ok=r=>r.status==="fulfilled"&&r.value?.ok!==false;
  const label=r=>r.status==="rejected"?String(r.reason).match(/"code":"([A-Z_]+)"/)?.[1]??"rejected":r.value?.outcome??r.value?.code??(r.value?.state?`view-${r.value.state}`:r.value?.ok?"booking-ack":r.value?.revoked?"revoked":r.value===null?"unavailable":"completed");
  const state=async who=>({...await plain(who).query("engineFixtures:emailRaw",{}),management:await plain(who).query("engineFixtures:managementRaw",{})});
  const read=secret=>plain().action("publicManagement:get",{secret});
  const cancel=(secret,command)=>plain().mutation("publicManagement:cancel",{secret,...command},{skipQueue:true});
  const command=view=>({operationId:randomUUID(),revision:view.revision});
  const pub=(who,secret=token(),offset=0,attemptKey=randomUUID())=>({slug:who.slug,attemptKey,managementSecret:secret,serviceId:who.serviceId,date,start:start+offset,clientName:"Public snapshot",email:"contact@example.test",expectedService:context});
  const priv=(who,offset=0)=>({operationId:randomUUID(),serviceId:who.secondServiceId,date,start:start+offset,clientName:"Private snapshot",email:"contact@example.test",expectedService:legacyContext});
  async function owner(){const who=await setup("Synthetic management business");who.slug=(await plain(who).mutation("bookingLinks:setMyBookingLink",{enabled:true})).slug;return who;}
  async function booked(who,secret=token(),offset=0){const args=pub(who,secret,offset),ack=await plain().mutation("publicBooking:confirm",args);assert.equal(ack.ok,true);assert.equal(ack.managementIssued,true);const raw=await state(who),receipt=raw.receipts.find(r=>r.attemptKey===args.attemptKey);return {secret,args,ack,appointmentId:receipt.appointmentId,view:await read(secret)};}
  function contextUnchanged(before,after){for(const key of ["business","services","weeklySchedules","specialDates","timeBlocks","clients"])assert.deepEqual(after[key],before[key]);}
  function originalReceipt(before,after){assert.deepEqual(after.receipts,before.receipts);assert.deepEqual(after.privateReceipts,before.privateReceipts);assert.deepEqual(after.clientReceipts,before.clientReceipts);}
  function minimal(view){assert(view);assert.deepEqual(Object.keys(view).sort(),["businessName","canCancel","date","end","revision","serviceName","start","state","timeZone"]);for(const secret of secrets)assert(!JSON.stringify(view).includes(secret));}
  function secretFree(raw){const serialized=JSON.stringify(raw);for(const secret of secrets)assert(!serialized.includes(secret),"No raw capability in persisted server documents");}
  async function record(name,who,details={}){const documents=await state(who);secretFree(documents);serial.push({name,...details,fullDocumentsVerified:true,documents});}
  async function until(readState,predicate,message,timeout=10000){const end=Date.now()+timeout;let value;do{value=await readState();if(predicate(value))return value;await wait(35);}while(Date.now()<end);throw Error(`${message}: ${redactManagementEvidence(JSON.stringify(value))}`);}

  const cases=["create-replay","create-secret-conflict","reuse-secret","cross-business-secret","create-versus-read","cancel-double","cancel-command-conflict","cancel-owner-move","cancel-owner-cancel","cancel-owner-arrival","cancel-owner-ended-result","cancel-new-booking","cancel-revoke","read-cancel","read-owner-move"];
  for(let round=1;round<=3;round++)for(const scenario of cases){
    const who=await owner(),secret=token();let other,initial,operations,original,metadata={};
    if(scenario.startsWith("create")||scenario==="reuse-secret"||scenario==="cross-business-secret"){
      const args=pub(who,secret);original=await state(who);
      if(scenario==="create-versus-read")operations=[op({},"publicBooking:confirm",args),op({},"publicManagement:get",{secret},"action")];
      else if(scenario==="cross-business-secret"){other=await owner();operations=[op({},"publicBooking:confirm",args),op({},"publicBooking:confirm",pub(other,secret))];}
      else operations=[op({},"publicBooking:confirm",args),op({},"publicBooking:confirm",scenario==="create-secret-conflict"?{...args,managementSecret:token()}:scenario==="reuse-secret"?pub(who,secret,60*60000):args)];
    }else{
      if(scenario==="cancel-owner-arrival"||scenario==="cancel-owner-ended-result"){
        const boundary=await plain(who).mutation("engineFixtures:managementBoundary",{serviceId:who.serviceId,secretHash:await managementSecretHash(secret),mode:scenario.endsWith("arrival")?"arrival":"ended"});
        initial={secret,appointmentId:boundary.appointmentId,view:await read(secret)};metadata.boundaryFixture=true;
      }else initial=await booked(who,secret);
      minimal(initial.view);const cmd=command(initial.view);original=await state(who);
      const first=op({},"publicManagement:cancel",{secret,...cmd});
      if(scenario==="cancel-double")operations=[first,first];
      else if(scenario==="cancel-command-conflict")operations=[first,op({},"publicManagement:cancel",{secret,...cmd,revision:"f".repeat(64)})];
      else if(scenario==="cancel-owner-move")operations=[first,op(who,"appointments:rescheduleMyAppointment",{appointmentId:initial.appointmentId,expectedVersion:0,date,start:start+60*60000})];
      else if(scenario==="cancel-owner-cancel")operations=[first,op(who,"appointments:cancelMyAppointment",{appointmentId:initial.appointmentId,expectedVersion:0})];
      else if(scenario==="cancel-owner-arrival")operations=[first,op(who,"appointments:arriveMyAppointment",{appointmentId:initial.appointmentId,expectedVersion:0,operationId:randomUUID()})];
      else if(scenario==="cancel-owner-ended-result")operations=[first,op(who,"appointments:markMyAppointmentResult",{appointmentId:initial.appointmentId,expectedVersion:0,operationId:randomUUID(),result:"completed"})];
      else if(scenario==="cancel-new-booking")operations=[first,op(who,"appointments:createMyAppointment",priv(who))];
      else if(scenario==="cancel-revoke")operations=[first,op(who,"publicManagement:revokeMyAccess",{appointmentId:initial.appointmentId})];
      else if(scenario==="read-cancel")operations=[op({},"publicManagement:get",{secret},"action"),first];
      else operations=[op({},"publicManagement:get",{secret},"action"),op(who,"appointments:rescheduleMyAppointment",{appointmentId:initial.appointmentId,expectedVersion:0,date,start:start+60*60000})];
    }
    const {results,maxInFlight}=await race(operations),after=await state(who);secretFree(after);assert.deepEqual(after.services,original.services);assert.deepEqual(after.weeklySchedules,original.weeklySchedules);assert.deepEqual(after.specialDates,original.specialDates);assert.deepEqual(after.timeBlocks,original.timeBlocks);assert.deepEqual(after.business,original.business);
    let winningEffect;
    if(scenario.startsWith("create")||scenario==="reuse-secret"||scenario==="cross-business-secret"){
      if(other){const otherState=await state(other);secretFree(otherState);assert.equal(after.appointments.length+otherState.appointments.length,1);assert.equal(after.management.accesses.length+otherState.management.accesses.length,1);metadata.otherBusinessDocuments=otherState;winningEffect=after.appointments.length?"business-1-created":"business-2-created";if(!after.appointments.length)assert.deepEqual(after,original);}
      else{assert.equal(after.appointments.length,1);assert.equal(after.clients.length,1);assert.equal(after.management.accesses.length,1);if(scenario!=="create-versus-read")assert.equal(results.filter(ok).length,scenario==="create-replay"?2:1);winningEffect=scenario==="create-replay"?"one-identical-command-created":`participant-${after.receipts[0].attemptKey===operations[0].args.attemptKey?1:2}-created`;}
      let readableSecret=secret;if(scenario==="create-secret-conflict"&&after.management.accesses[0].secretHash!==await managementSecretHash(secret)){readableSecret=operations[1].args.managementSecret;winningEffect="participant-2-secret-committed";}else if(scenario==="create-secret-conflict")winningEffect="participant-1-secret-committed";
      const view=await read(readableSecret);minimal(view);assert.equal(view.state,"confirmed");if(scenario==="create-replay")assert.deepEqual(results[0].value,results[1].value);
      if(scenario==="create-versus-read"){assert(ok(results[0]));if(results[1].value!==null)minimal(results[1].value);}
    }else{
      contextUnchanged(original,after);if(scenario!=="cancel-new-booking")originalReceipt(original,after);
      const row=after.appointments.find(a=>a._id===initial.appointmentId),access=after.management.accesses.find(a=>a.appointmentId===row._id);
      assert(row&&access);assert.equal(after.management.accesses.length,1);assert.equal(access.secretHash,await managementSecretHash(secret));
      assert.equal(access.createdAt,original.management.accesses[0].createdAt);assert.equal(access.expiresAt,original.management.accesses[0].expiresAt);assert.deepEqual(after.receipts,original.receipts);
      assert.deepEqual(after.clients,original.clients);for(const previous of original.management.emails)assert.deepEqual(after.management.emails.find(e=>e._id===previous._id),previous);
      if(scenario==="cancel-new-booking"){
        assert.equal(row.status,"cancelled");assert.equal(row.version,1);assert.equal(results[0].value.ok,true);assert.equal(after.appointments.length,ok(results[1])?2:1);winningEffect=ok(results[1])?"cancellation-committed-before-new-capacity-read":"new-booking-rejected-before-release";
      }else if(scenario==="read-owner-move"){assert.equal(row.status,"confirmed");assert.equal(row.version,1);minimal(results[0].value);assert([start,start+60*60000].includes(results[0].value.start));winningEffect=results[0].value.start===start?"read-original-context":"read-moved-context";}
      else if(scenario==="cancel-owner-move"){assert.equal(row.version,1);assert(["confirmed","cancelled"].includes(row.status));assert.equal(results.filter(ok).length,1);winningEffect=row.status==="cancelled"?"public-cancel":"owner-move";}
      else if(scenario==="cancel-owner-arrival"){assert.equal(row.version,1);assert(["completed","cancelled"].includes(row.status));assert.equal(results.filter(ok).length,1);if(row.status==="completed")assert.equal(row.holdsSlot,true);winningEffect=row.status==="cancelled"?"public-cancel":"owner-arrival";}
      else if(scenario==="cancel-owner-ended-result"){assert.equal(row.status,"completed");assert.equal(row.version,1);assert.equal(ok(results[0]),false);winningEffect="owner-result-public-already-started";}
      else if(scenario==="cancel-owner-cancel"){assert.equal(row.status,"cancelled");assert.equal(row.version,1);assert.equal(ok(results[1]),true);if(access.cancellation){assert.equal(ok(results[0]),true);winningEffect="public-before-idempotent-owner-cancel";}else{assert.equal(results[0].value.code,"CONTEXT_CHANGED");winningEffect="owner-cancel-before-public";}}
      else if(scenario==="cancel-revoke"){assert(access.revokedAt);assert.equal(await read(secret),null);assert(["confirmed","cancelled"].includes(row.status));winningEffect=access.cancellation?"cancel-before-revoke":"revoke-before-cancel";}
      else {assert.equal(row.status,"cancelled");assert.equal(row.version,1);assert(access.cancellation);if(scenario==="cancel-double")assert.deepEqual(results.map(label).sort(),["already_applied","cancelled"]);if(scenario==="cancel-command-conflict")assert.equal(results.filter(ok).length,1);winningEffect="one-public-cancellation";}
      if(scenario!=="cancel-new-booking")assert.equal(after.appointments.length,original.appointments.length);
      if(access.cancellation){assert.equal(access.cancellation.cancelledAt,row.cancelledAt);assert.equal(access.cancellation.version,row.version);assert.equal(row.resultUndo,undefined);}
      if(row.status==="cancelled")assert(after.management.jobGuards.every(g=>!g.matches));
    }
    report.scenarios.push({round,scenario:`management-${scenario}`,requests:2,maxInFlight,observedResults:results.map(label),winningEffect,serializationOrder:"not measured; effects derived from committed documents",fullDocumentsVerified:true,documents:{before:original,after},...metadata});
    if(scenario===cases.at(-1))console.log(`Gestión pública: ronda ${round}/3 completada.`);
  }

  // These are deliberately serial controls, not race observations. They cover
  // each legal order even when the transport races happen to favor one side.
  for(const scenario of ["owner-move","owner-cancel","owner-arrival","new-booking","revoke","read","read-move"])for(const order of ["public-first","other-first"]){
    const who=await owner(),secret=token();let b;
    if(scenario==="owner-arrival"){
      const seeded=await plain(who).mutation("engineFixtures:managementBoundary",{serviceId:who.serviceId,secretHash:await managementSecretHash(secret),mode:"arrival"});b={secret,appointmentId:seeded.appointmentId,view:await read(secret)};
    }else b=await booked(who,secret);
    const before=await state(who),intent=command(b.view);
    const publicStep=()=>scenario==="read-move"?read(secret):cancel(secret,intent);
    const otherStep=()=>scenario==="owner-move"||scenario==="read-move"?plain(who).mutation("appointments:rescheduleMyAppointment",{appointmentId:b.appointmentId,expectedVersion:0,date,start:start+60*60000})
      :scenario==="owner-cancel"?plain(who).mutation("appointments:cancelMyAppointment",{appointmentId:b.appointmentId,expectedVersion:0})
      :scenario==="owner-arrival"?plain(who).mutation("appointments:arriveMyAppointment",{appointmentId:b.appointmentId,expectedVersion:0,operationId:randomUUID()})
      :scenario==="new-booking"?plain(who).mutation("appointments:createMyAppointment",priv(who))
      :scenario==="revoke"?plain(who).mutation("publicManagement:revokeMyAccess",{appointmentId:b.appointmentId}):read(secret);
    const settle=async fn=>{try{return {status:"fulfilled",value:await fn()};}catch(reason){return {status:"rejected",reason};}};
    let p,o;if(order==="public-first"){p=await settle(publicStep);o=await settle(otherStep);}else{o=await settle(otherStep);p=await settle(publicStep);}
    const after=await state(who),row=after.appointments.find(r=>r._id===b.appointmentId),access=after.management.accesses[0];contextUnchanged(before,after);assert.deepEqual(after.receipts,before.receipts);
    if(scenario!=="new-booking")originalReceipt(before,after);
    if(scenario==="owner-move"||scenario==="owner-arrival"){
      assert.equal(row.version,1);assert.equal(row.status,order==="public-first"?"cancelled":scenario==="owner-move"?"confirmed":"completed");assert.equal(ok(p),order==="public-first");assert.equal(ok(o),order!=="public-first");
    }else if(scenario==="owner-cancel"){assert.equal(row.status,"cancelled");assert.equal(row.version,1);assert.equal(!!access.cancellation,order==="public-first");assert.equal(ok(o),true);assert.equal(ok(p),order==="public-first");}
    else if(scenario==="new-booking"){assert.equal(row.status,"cancelled");assert.equal(ok(p),true);assert.equal(after.appointments.length,order==="public-first"?2:1);assert.equal(ok(o),order==="public-first");}
    else if(scenario==="revoke"){assert(access.revokedAt);assert.equal(await read(secret),null);assert.equal(row.status,order==="public-first"?"cancelled":"confirmed");assert.equal(ok(p),order==="public-first");}
    else if(scenario==="read"){assert.equal(row.status,"cancelled");minimal(o.value);assert.equal(o.value.state,order==="public-first"?"cancelled":"confirmed");}
    else {assert.equal(row.version,1);assert.equal(row.status,"confirmed");minimal(p.value);assert.equal(p.value.start,order==="public-first"?start:start+60*60000);}
    await record(`explicit-serial-order-${scenario}-${order}`,who,{order,concurrent:false,observedResults:{public:label(p),other:label(o)}});
  }

  // Server-side secrets are never persisted or returned. UUIDs and contact data
  // grant no authority, with identical generic failures for invalid capabilities.
  {
    const who=await owner(),b=await booked(who),original=await state(who);minimal(b.view);
    const invalid=["", "invalid", randomUUID(), b.appointmentId, "contact@example.test", b.args.attemptKey, token(), "A".repeat(42)+"B", b.secret+"="];
    for(const value of invalid){assert.equal(await read(value),null);assert.deepEqual(await cancel(value,command(b.view)),{ok:false,code:"INVALID_ACCESS"});}
    assert.deepEqual(await state(who),original);assert.equal((await plain().mutation("publicManagement:cancel",{secret:b.secret,operationId:"bad",revision:b.view.revision})).code,"INVALID_COMMAND");
    assert.equal((await cancel(b.secret,{operationId:randomUUID(),revision:"bad"})).code,"INVALID_COMMAND");assert.deepEqual(await state(who),original);
    await assert.rejects(plain().query("publicManagement:getSource",{secretHash:await managementSecretHash(b.secret)}));
    await assert.rejects(plain().mutation("publicManagement:revokeMyAccess",{appointmentId:b.appointmentId}),/UNAUTHENTICATED/);
    const other=await owner();await assert.rejects(plain(other).mutation("publicManagement:revokeMyAccess",{appointmentId:b.appointmentId}),/APPOINTMENT_NOT_FOUND/);
    const otherBooking=await booked(other);assert.equal((await cancel(b.secret,command(otherBooking.view))).code,"CONTEXT_CHANGED");assert.equal((await cancel(otherBooking.secret,command(b.view))).code,"CONTEXT_CHANGED");assert.deepEqual(await state(who),original);
    const ack=await plain().mutation("publicBooking:confirm",b.args);assert.deepEqual(ack,b.ack);assert.deepEqual(Object.keys(ack).sort(),["managementIssued","ok","receipt"]);assert.deepEqual(Object.keys(ack.receipt).sort(),["date","end","serviceName","start","timeZone"]);
    await record("generic-invalid-capabilities-cross-revisions-noauth-owner-revocation-public-allowlists",who);
  }
  {
    const who=await owner(),b=await booked(who),original=await state(who);
    await plain(who).mutation("publicManagement:revokeMyAccess",{appointmentId:b.appointmentId});const revoked=await state(who);await plain(who).mutation("publicManagement:revokeMyAccess",{appointmentId:b.appointmentId});assert.deepEqual(await state(who),revoked);
    assert.equal(await read(b.secret),null);assert.equal((await cancel(b.secret,command(b.view))).code,"INVALID_ACCESS");assert.deepEqual((await state(who)).appointments,original.appointments);assert.deepEqual((await state(who)).receipts,original.receipts);
    assert.deepEqual(await plain().mutation("publicBooking:confirm",b.args),b.ack);assert.equal(await read(b.secret),null);await record("revocation-idempotent-no-rotation-or-remint-by-confirm-replay",who);
    const another=await owner(),expired=await booked(another);await plain(another).mutation("engineFixtures:managementExpire",{appointmentId:expired.appointmentId});const before=await state(another);assert.equal(await read(expired.secret),null);assert.equal((await cancel(expired.secret,command(expired.view))).code,"INVALID_ACCESS");assert.deepEqual(await state(another),before);await record("expiry-generic-no-cron-or-new-authority",another);
  }
  {
    const who=await owner(),b=await booked(who),cmd=command(b.view);const first=await cancel(b.secret,cmd);assert.equal(first.outcome,"cancelled");const original=await state(who);
    for(let i=0;i<3;i++){const replay=await cancel(b.secret,cmd);assert.equal(replay.outcome,"already_applied");assert.deepEqual(replay.view,first.view);assert.deepEqual(await state(who),original);}
    assert.equal((await cancel(b.secret,{...cmd,revision:first.view.revision})).code,"CONTEXT_CHANGED");assert.equal((await cancel(b.secret,{...cmd,operationId:randomUUID()})).code,"CONTEXT_CHANGED");assert.deepEqual(await state(who),original);
    await plain(who).mutation("engineFixtures:managementLaterVersion",{appointmentId:b.appointmentId});const later=await state(who);assert.equal((await cancel(b.secret,cmd)).code,"CONTEXT_CHANGED");assert.deepEqual(await state(who),later);assert.deepEqual(later.receipts,original.receipts);await record("exact-cancel-replay-and-payload-later-version-no-renewed-timestamp",who);
  }
  {
    const who=await owner(),b=await booked(who);await plain(who).mutation("appointments:rescheduleMyAppointment",{appointmentId:b.appointmentId,expectedVersion:0,date,start:start+60*60000});await plain(who).mutation("appointments:rescheduleMyAppointment",{appointmentId:b.appointmentId,expectedVersion:1,date,start});const original=await state(who);
    assert.equal((await cancel(b.secret,command(b.view))).code,"CONTEXT_CHANGED");assert.deepEqual(await state(who),original);const current=await read(b.secret);assert.notEqual(current.revision,b.view.revision);assert.equal((await cancel(b.secret,command(current))).outcome,"cancelled");await record("owner-move-and-return-ABA-needs-new-reviewed-command",who);
  }
  {
    const who=await owner(),b=await booked(who),before=await state(who);const availability=await plain().action("publicBooking:getAvailability",{slug:who.slug,serviceId:who.secondServiceId,date});assert(!availability.slots.some(s=>s.start===start));
    await cancel(b.secret,command(b.view));const available=await plain().action("publicBooking:getAvailability",{slug:who.slug,serviceId:who.secondServiceId,date});assert(available.slots.some(s=>s.start===start));await plain(who).mutation("appointments:createMyAppointment",priv(who));
    const after=await state(who);assert.equal(after.appointments.length,2);assert.equal(after.appointments.filter(a=>a.status==="cancelled").length,1);assert.equal(after.appointments.find(a=>a.status==="confirmed").end-start,46*60000);assert.deepEqual(after.receipts,before.receipts);assert.deepEqual(after.clients,before.clients);await record("release-capacity-across-services-preserve-rows-history-30-46",who);
  }
  {
    const who=await owner(),args=pub(who),before=await state(who);
    assert.equal((await plain().mutation("publicBooking:confirm",{...args,expectedService:{...context,version:999}})).code,"SERVICE_CHANGED");assert.deepEqual(await state(who),before);
    assert.equal((await plain().mutation("publicBooking:confirm",{...args,managementSecret:"bad"})).code,"INVALID_ATTEMPT");assert.deepEqual(await state(who),before);
    const legacyKey=randomUUID(),legacyId=await plain(who).mutation("engineFixtures:emailLegacyBooking",{serviceId:who.serviceId,date,start,attemptKey:legacyKey});const legacy=await state(who);
    const replay={slug:who.slug,attemptKey:legacyKey,serviceId:who.serviceId,date,start,clientName:"Legacy email-free"};assert((await plain().mutation("publicBooking:confirm",replay)).ok);assert.equal((await plain().mutation("publicBooking:confirm",{...replay,managementSecret:token()})).code,"ATTEMPT_CONFLICT");assert.deepEqual(await state(who),legacy);assert.equal(legacy.management.accesses.length,0);assert.equal((await plain(who).query("emailConfirmations:getMyAppointmentStatus",{appointmentId:legacyId})).state,"not_requested");await record("rejected-creation-no-access-and-legacy-receipt-never-upgraded",who);
  }
  {
    const who=await owner(),secret=token(),args=pub(who,secret);delete args.managementSecret;const first=await plain().mutation("publicBooking:confirm",args),before=await state(who);assert.equal(first.managementIssued,undefined);assert.equal(before.management.accesses.length,0);assert.deepEqual(await plain().mutation("publicBooking:confirm",args),first);assert.equal((await plain().mutation("publicBooking:confirm",{...args,managementSecret:secret})).code,"ATTEMPT_CONFLICT");assert.deepEqual(await state(who),before);await record("previous-email-format-pending-intent-no-access-backfill",who);
  }
  {
    const who=await owner(),args=pub(who),cmdFile=path.join(workspace,`private-client-journal-${randomUUID()}.json`);await writeFile(cmdFile,JSON.stringify(args));assert.deepEqual(JSON.parse(await readFile(cmdFile,"utf8")),args);
    let injectedDrops=0,dropNext=true,callerRequests=0;const transport=async(...input)=>{callerRequests++;const response=await fetch(...input);if(dropNext){dropNext=false;injectedDrops++;await response.text();throw Error("Synthetic committed reply dropped at caller transport");}return response;};
    try{await makeClient(undefined,transport,false).mutation("publicBooking:confirm",args,{skipQueue:true});}catch{/* The caller has no acknowledgement; server state is read separately. */}
    assert.equal(injectedDrops,1);const committed=await state(who);assert.equal(committed.appointments.length,1);assert.equal(committed.management.accesses.length,1);await restart();assert.deepEqual(await state(who),committed);
    const restored=JSON.parse(await readFile(cmdFile,"utf8")),ack=await plain().mutation("publicBooking:confirm",restored);assert.equal(ack.managementIssued,true);assert.deepEqual(await state(who),committed);const view=await read(restored.managementSecret);minimal(view);
    const intent=command(view);await writeFile(cmdFile,JSON.stringify({secret:restored.managementSecret,intent}));dropNext=true;try{await makeClient(undefined,transport,false).mutation("publicManagement:cancel",{secret:restored.managementSecret,...intent},{skipQueue:true});}catch{/* Lost acknowledgement after commit. */}
    const cancelled=await state(who);assert.equal(cancelled.appointments[0].status,"cancelled");await restart();const saved=JSON.parse(await readFile(cmdFile,"utf8"));const result=await cancel(saved.secret,saved.intent);assert.equal(result.outcome,"already_applied");assert.deepEqual(await state(who),cancelled);assert.deepEqual(cancelled.receipts,committed.receipts);assert.equal(injectedDrops,2);await record("durable-private-client-journal-lost-creation-and-cancel-replies-sqlite-restarts",who,{callerTransportDrops:injectedDrops,callerRequests,rawClientJournalOnlyInOwnedTemporaryWorkspace:true,browserStorageNotClaimed:true});
  }
  {
    const who=await owner(),secret=token(),past=await plain(who).mutation("engineFixtures:managementBoundary",{serviceId:who.serviceId,secretHash:await managementSecretHash(secret),mode:"cancelled-past"});const before=await state(who);
    await plain(who).mutation("appointments:runAppointmentAbsence",past.job);await plain(who).mutation("appointments:runAppointmentReminder",past.job);assert.deepEqual(await state(who),before);assert.equal((await read(secret)).canCancel,false);await record("past-cancelled-snapshot-old-r13-callbacks-no-resurrection",who);
    const future=await owner(),b=await booked(future);await cancel(b.secret,command(b.view));const original=await state(future);for(const job of original.management.jobs)if(job.name.startsWith("appointments"))await plain(future).mutation(job.name.replace(/\.js:/,":"),job.args[0]);assert.deepEqual(await state(future),original);assert(original.management.jobGuards.every(g=>!g.matches));await record("actual-public-cancellation-invalidates-original-r13-job-context",future,{futureCallbacksInvokedEarly:true,endTimeNotFalsified:true});
  }
  {
    const who=await owner(),b=await booked(who);const before=await state(who);for(let i=0;i<21;i++)await cancel(b.secret,{operationId:randomUUID(),revision:"0".repeat(64)});const limited=await cancel(b.secret,command(b.view));assert.equal(limited.code,"RATE_LIMITED");assert(limited.retryAfter>0);assert.deepEqual(await state(who),before);await record("per-access-cancel-quota-stable-no-side-effects",who);
  }
  // Narrow R15 regression for the new cancellation path, without re-running
  // its unchanged retry/timeout campaign. The stub exists only in this harness.
  {
    await setEmailEnvironment(true);const who=await owner();await plain(who).mutation("emailConfirmations:setMySettings",{enabled:true,expectedVersion:0});const b=await booked(who);const sent=await until(()=>state(who),s=>s.management.emails[0]?.state==="sent","Email accepted by controlled provider");
    const event=sent.management.emails[0];assert(!event.payloadJson.includes(b.secret));assert(!event.payloadJson.includes("gestionar-cita"));assert.equal(provider.requests.filter(r=>r.key===event.providerKey).length,1);
    await cancel(b.secret,command(b.view));const after=await state(who);assert.deepEqual(after.management.emails,sent.management.emails);await record("new-access-never-enters-frozen-email-and-cancellation-keeps-acceptance",who);
    const pendingOwner=await owner();await plain(pendingOwner).mutation("emailConfirmations:setMySettings",{enabled:true,expectedVersion:0});const pending=await plain(pendingOwner).mutation("engineFixtures:mailDeferred",{serviceId:pendingOwner.serviceId,date,start,email:"pending@example.test"});const pendingSecret=token();await plain(pendingOwner).mutation("engineFixtures:managementAttach",{appointmentId:pending.appointmentId,secretHash:await managementSecretHash(pendingSecret)});
    const pendingView=await read(pendingSecret),before=await state(pendingOwner);await cancel(pendingSecret,command(pendingView));await plain(pendingOwner).mutation("emailConfirmations:start",{eventId:pending.eventId});const stopped=await state(pendingOwner);assert.equal(stopped.management.emails[0].state,"suppressed");assert.equal(stopped.management.emails[0].attempts,0);assert.equal(stopped.management.emails[0].payloadJson,before.management.emails[0].payloadJson);assert.equal(provider.requests.filter(r=>r.key===stopped.management.emails[0].providerKey).length,0);await record("public-cancel-before-mail-start-suppresses-obsolete-confirmation",pendingOwner,{accessAttachedOnlyBySyntheticFixture:true});
  }
  report.publicManagement={serialGroups:serial.length,serial,rawCapabilityPersistence:'only synthetic private client journal in owned temporary workspace, never report/server DB',serverHashOnly:true,publicDtoMinimal:true,realWrites:0,realEmails:0,
    providerStubRequests:provider.requests.length,providerStubLogicalAcceptances:provider.accepted.size,limits:'Real local Convex/SQLite + HTTP, not cloud races, real browser successful cancellation, or real email. Boundary fixtures seed server-time appointments; no production clock is changed. Early old callbacks and a past cancelled fixture complement existing unchanged R13 verification.'};
}
