// These functions exist ONLY in the existing harness's owned temporary backend.
export const confirmationFixtureSource = `
import { enqueueConfirmation } from "./lib/emailConfirmation";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
async function ownMail(ctx: MutationCtx, eventId: Id<"emailConfirmations">) {
 const b=await requireMyBusiness(ctx),e=await ctx.db.get("emailConfirmations",eventId);
 if(!e||e.businessId!==b._id)throw Error("Synthetic event ownership");return e;
}
export const mailRaw=internalQuery({args:{},returns:v.any(),handler:async ctx=>{
 const b=await requireMyBusiness(ctx);const rows=await ctx.db.query("appointments").withIndex("by_businessId_and_date",q=>q.eq("businessId",b._id)).take(10001);
 if(rows.length>10000)throw Error("Synthetic bound");const events=[];for(const a of rows){const e=await ctx.db.query("emailConfirmations").withIndex("by_appointmentId",q=>q.eq("appointmentId",a._id)).unique();if(e)events.push(e);}return events;
}});
async function deferredMail(ctx:MutationCtx,args:{serviceId:Id<"services">;date:string;start:number;email?:string;name?:string}){
 const b=await requireMyBusiness(ctx),s=await ctx.db.get("services",args.serviceId);if(!s||s.businessId!==b._id)throw Error("Synthetic ownership");
 const appointmentId=await ctx.db.insert("appointments",{businessId:b._id,serviceId:s._id,serviceName:s.name,clientName:args.name??"Synthetic snapshot",date:args.date,start:args.start,end:args.start+s.durationMinutes*60000,status:"confirmed"});
 const eventId=await enqueueConfirmation(ctx,b,(await ctx.db.get("appointments",appointmentId))!,args.email);
 // Cancel only the initial job just created by this fixture, in its transaction.
 // Worker phases are then exercised through the actual internal HTTP API.
 const jobs=await ctx.db.system.query("_scheduled_functions").order("desc").take(1000);
 for(const job of jobs)if(job.name.startsWith("emailConfirmations")&&job.args.some(arg=>arg&&typeof arg==="object"&&"eventId"in arg&&arg.eventId===eventId)&&job.state.kind==="pending")await ctx.scheduler.cancel(job._id);
 return {appointmentId,eventId};
}
const seedArgs={serviceId:v.id("services"),date:v.string(),start:v.number(),email:v.optional(v.string()),name:v.optional(v.string())};
export const mailDeferred=internalMutation({args:seedArgs,returns:v.any(),handler:deferredMail});
export const mailRollback=internalMutation({args:seedArgs,returns:v.null(),handler:async(ctx,args)=>{await deferredMail(ctx,args);throw Error("Synthetic transaction rollback");}});
export const mailDue=internalMutation({args:{eventId:v.id("emailConfirmations")},returns:v.null(),handler:async(ctx,args)=>{
 const e=await ownMail(ctx,args.eventId);if(e.state!=="queued")throw Error("Expected queued event");await ctx.db.patch("emailConfirmations",e._id,{nextAttemptAt:Date.now()-1});return null;
}});
export const mailPhase=internalMutation({args:{eventId:v.id("emailConfirmations"),phase:v.union(v.literal("claimed"),v.literal("expired-lease"),v.literal("expired-window"))},returns:v.null(),handler:async(ctx,args)=>{
 const e=await ownMail(ctx,args.eventId),now=Date.now();
 if(args.phase==="claimed")await ctx.db.patch("emailConfirmations",e._id,{state:"sending",attempts:1,generation:1,firstAttemptAt:now,leaseUntil:now+90000,nextAttemptAt:undefined,dispatchedAt:undefined});
 else if(args.phase==="expired-lease")await ctx.db.patch("emailConfirmations",e._id,{leaseUntil:now-1});
 else await ctx.db.patch("emailConfirmations",e._id,{firstAttemptAt:now-86400000,nextAttemptAt:now-1});return null;
}});
export const mailLegacyFlag=internalMutation({args:{enabled:v.boolean()},returns:v.null(),handler:async(ctx,args)=>{const b=await requireMyBusiness(ctx);await ctx.db.patch("businesses",b._id,{emailConfirmationsEnabled:args.enabled});return null;}});
export const mailRenameBusiness=internalMutation({args:{name:v.string()},returns:v.null(),handler:async(ctx,args)=>{const b=await requireMyBusiness(ctx);await ctx.db.patch("businesses",b._id,{name:args.name});return null;}});
`;
