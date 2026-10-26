// Appended ONLY to the owned temporary deployment by the real-engine harness.
export const attentionFixtureSource = `
import { applyArrivalWindowCommand } from "./appointments";
import { applyAutomaticAbsence, publishReminder, scheduleAttention, noticeSnapshot } from "./lib/appointmentAttention";
export const attentionSeed = internalMutation({
 args:{serviceId:v.id("services"),start:v.optional(v.number()),offset:v.optional(v.number()),endOffset:v.optional(v.number()),managed:v.boolean(),schedule:v.optional(v.boolean()),receiptKey:v.optional(v.string()),historicalNotice:v.optional(v.boolean())},returns:v.id("appointments"),
 handler:async(ctx,args)=>{
  const business=await requireMyBusiness(ctx), service=await ctx.db.get("services",args.serviceId);
  if(!service || service.businessId!==business._id)throw new Error("Synthetic fixture ownership");
  const now=Date.now(),start=args.start??now+(args.offset??120000),end=args.endOffset===undefined?start+service.durationMinutes*60000:now+args.endOffset,date=todayInZone(business.timeZone,start);
  const id=await ctx.db.insert("appointments",{businessId:business._id,serviceId:service._id,serviceName:service.name,clientName:"Synthetic attention",date,start,end,status:"confirmed",...(args.managed?{automationEnabled:true}:{})});
  if(args.receiptKey)await ctx.db.insert("publicBookingReceipts",{businessId:business._id,appointmentId:id,serviceId:service._id,attemptKey:args.receiptKey,clientName:"Synthetic attention",serviceName:service.name,date,start,end,timeZone:business.timeZone});
  if(args.historicalNotice)await ctx.db.insert("appointmentNotices",{businessId:business._id,appointmentId:id,version:0,start,kind:"reminder",stage:2,active:true,updatedAt:now-600000,snapshot:noticeSnapshot((await ctx.db.get("appointments",id))!)});
  if(args.schedule)await scheduleAttention(ctx,(await ctx.db.get("appointments",id))!);
  return id;
 }});
export const attentionRaw = internalQuery({args:{},returns:v.any(),handler:async ctx=>{
 const business=await requireMyBusiness(ctx);
 return {appointments:await ctx.db.query("appointments").withIndex("by_businessId_and_date",q=>q.eq("businessId",business._id)).take(6000),
 receipts:await ctx.db.query("publicBookingReceipts").withIndex("by_businessId_and_attemptKey",q=>q.eq("businessId",business._id)).take(6000),
 notices:await ctx.db.query("appointmentNotices").withIndex("by_businessId_and_active_and_start",q=>q.eq("businessId",business._id)).take(6000)};
}});
export const attentionBoundary = internalMutation({args:{appointmentId:v.id("appointments"),delta:v.number(),kind:v.union(v.literal("arrival"),v.literal("cancel"),v.literal("absence"),v.literal("reminder")),operationId:v.string()},returns:v.any(),handler:async(ctx,args)=>{
 const business=await requireMyBusiness(ctx),old=await ctx.db.get("appointments",args.appointmentId);
 if(!old || old.businessId!==business._id)throw new Error("Synthetic fixture ownership");
 const now=Date.now();
 await ctx.db.patch("appointments",old._id,args.kind==="absence"?{end:now+args.delta}:{start:now+args.delta});
 const before=await ctx.db.get("appointments",old._id),job={businessId:business._id,appointmentId:old._id,version:old.version??0,start:before!.start,end:before!.end};
 try{
  const response=args.kind==="absence"?await applyAutomaticAbsence(ctx,job):args.kind==="reminder"?await publishReminder(ctx,job):await applyArrivalWindowCommand(ctx,{appointmentId:old._id,expectedVersion:old.version??0,operationId:args.operationId},args.kind);
  return {now,before,after:await ctx.db.get("appointments",old._id),response};
 }catch(error){return {now,before,after:await ctx.db.get("appointments",old._id),code:error instanceof Error && "data" in error?(error.data as {code:string}).code:"UNKNOWN"};}
}});
export const attentionDense = internalMutation({args:{serviceId:v.id("services"),count:v.number(),held:v.optional(v.boolean())},returns:v.string(),handler:async(ctx,args)=>{
 const business=await requireMyBusiness(ctx),service=await ctx.db.get("services",args.serviceId);
 if(!service || service.businessId!==business._id)throw new Error("Synthetic fixture ownership");
 const start=Date.now()+600000,date=todayInZone(business.timeZone,start);
 for(let i=0;i<args.count;i++){
 const id=await ctx.db.insert("appointments",{businessId:business._id,serviceId:service._id,serviceName:service.name,clientName:"Synthetic dense attention",date,start:start+i,end:start+1800000+i,status:args.held?"completed":"confirmed",...(args.held?{holdsSlot:true}:{})});
 if(!args.held)await ctx.db.insert("appointmentNotices",{businessId:business._id,appointmentId:id,version:0,start:start+i,kind:"reminder",stage:0,active:true,updatedAt:Date.now()});
 }
 return date;
}});

export const noticeHistorySeed = internalMutation({args:{serviceId:v.id("services"),count:v.number(),legacy:v.optional(v.boolean())},returns:v.array(v.id("appointments")),handler:async(ctx,args)=>{
 const business=await requireMyBusiness(ctx),service=await ctx.db.get("services",args.serviceId);if(!service||service.businessId!==business._id)throw Error("Synthetic fixture ownership");
 const now=Date.now(),ids=[];
 for(let i=0;i<args.count;i++){const start=now+600000+i*60000,date=todayInZone(business.timeZone,start);const id=await ctx.db.insert("appointments",{businessId:business._id,serviceId:service._id,serviceName:service.name,clientName:"Synthetic notice history "+i,date,start,end:start+1800000,status:"confirmed"});const row=(await ctx.db.get("appointments",id))!;
 await ctx.db.insert("appointmentNotices",{businessId:business._id,appointmentId:id,version:0,start,kind:"reminder",stage:0,active:true,updatedAt:now-i*60000,...(args.legacy?{}:{snapshot:noticeSnapshot(row)})});ids.push(id);}
 return ids;
}});
export const legacyNoticeChange = internalMutation({args:{appointmentId:v.id("appointments")},returns:v.null(),handler:async(ctx,args)=>{
 const business=await requireMyBusiness(ctx),row=await ctx.db.get("appointments",args.appointmentId);if(!row||row.businessId!==business._id)throw Error("Synthetic fixture ownership");
 await ctx.db.patch("appointments",row._id,{version:(row.version??0)+1,start:row.start+3600000,end:row.end+3600000,clientName:"Synthetic changed context"});return null;
}});
`;
