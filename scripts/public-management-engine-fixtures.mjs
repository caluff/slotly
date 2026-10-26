// Seed/boundary/snapshot helpers ONLY in the existing harness's owned backend.
export const publicManagementFixtureSource = `
import { registerManagementAccess } from "./lib/publicManagement";
import { jobMatches } from "./lib/appointmentAttention";
import { occupyingAppointmentsForDate } from "./lib/appointmentData";
export const managementRaw=internalQuery({args:{},returns:v.any(),handler:async ctx=>{
 const b=await requireMyBusiness(ctx),rows=await ctx.db.query("appointments").withIndex("by_businessId_and_date",q=>q.eq("businessId",b._id)).take(2001);
 if(rows.length>2000)throw Error("Synthetic management bound");const accesses=[],emails=[];
 for(const row of rows){const a=await ctx.db.query("publicBookingAccesses").withIndex("by_appointmentId",q=>q.eq("appointmentId",row._id)).unique();if(a)accesses.push(a);const e=await ctx.db.query("emailConfirmations").withIndex("by_appointmentId",q=>q.eq("appointmentId",row._id)).unique();if(e)emails.push(e);}
 const scheduled=await ctx.db.system.query("_scheduled_functions").order("desc").take(5001);if(scheduled.length>5000)throw Error("Synthetic jobs bound");
 const ids=new Set(rows.map(r=>r._id));const jobs=scheduled.filter(j=>j.args.some(arg=>arg&&typeof arg==="object"&&"appointmentId"in arg&&ids.has(arg.appointmentId as typeof rows[number]["_id"])));
 const jobGuards=jobs.map(j=>{const arg=j.args[0] as {businessId:typeof b._id;appointmentId:typeof rows[number]["_id"];version:number;start:number;end:number};return {jobId:j._id,matches:jobMatches(rows.find(r=>r._id===arg.appointmentId)??null,arg)};});
 return {accesses,emails,jobs,jobGuards};
}});
export const managementAttach=internalMutation({args:{appointmentId:v.id("appointments"),secretHash:v.string()},returns:v.id("publicBookingAccesses"),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx),a=await ctx.db.get("appointments",args.appointmentId);if(!a||a.businessId!==b._id)throw Error("Synthetic management ownership");
 return await registerManagementAccess(ctx,b,a,args.secretHash);
}});
export const managementBoundary=internalMutation({args:{serviceId:v.id("services"),secretHash:v.string(),mode:v.union(v.literal("arrival"),v.literal("ended"),v.literal("started"),v.literal("cancelled-past"))},returns:v.any(),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx),s=await ctx.db.get("services",args.serviceId);if(!s||s.businessId!==b._id)throw Error("Synthetic ownership");
 const now=Date.now(),start=args.mode==="arrival"?now+120000:args.mode==="started"?now-300000:now-31*60000,end=start+30*60000;
 const row={businessId:b._id,serviceId:s._id,serviceName:s.name,clientName:"Synthetic boundary snapshot",date:todayInZone(b.timeZone,start),start,end,status:args.mode==="cancelled-past"?"cancelled" as const:"confirmed" as const,automationEnabled:true,...(args.mode==="cancelled-past"?{version:1,cancelledAt:now-40*60000}:{})};
 const appointmentId=await ctx.db.insert("appointments",row);await registerManagementAccess(ctx,b,(await ctx.db.get("appointments",appointmentId))!,args.secretHash);
 return {appointmentId,job:{businessId:b._id,appointmentId,version:0,start,end}};
}});
export const managementExpire=internalMutation({args:{appointmentId:v.id("appointments")},returns:v.null(),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx),a=await ctx.db.get("appointments",args.appointmentId);if(!a||a.businessId!==b._id)throw Error("Synthetic ownership");
 const access=await ctx.db.query("publicBookingAccesses").withIndex("by_appointmentId",q=>q.eq("appointmentId",a._id)).unique();if(!access)throw Error("Missing synthetic access");await ctx.db.patch("publicBookingAccesses",access._id,{expiresAt:Date.now()-1});return null;
}});
export const managementLaterVersion=internalMutation({args:{appointmentId:v.id("appointments")},returns:v.null(),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx),a=await ctx.db.get("appointments",args.appointmentId);if(!a||a.businessId!==b._id)throw Error("Synthetic ownership");await ctx.db.patch("appointments",a._id,{version:(a.version??0)+1});return null;
}});
export const managementOccupation=internalQuery({args:{date:v.string()},returns:v.any(),handler:async(ctx,args)=>{const b=await requireMyBusiness(ctx);return await occupyingAppointmentsForDate(ctx,b._id,args.date);}});
`;
