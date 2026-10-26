export const emailClientsFixtureSource = `
export const emailRaw = internalQuery({args:{},returns:v.any(),handler:async ctx=>{
 const b=await requireMyBusiness(ctx);
 const bounded=async<T>(query:{take:(count:number)=>Promise<T[]>})=>{const rows=await query.take(10001);if(rows.length>10000)throw Error("Synthetic bound");return rows;};
 return {business:b,
  clients:await bounded(ctx.db.query("clients").withIndex("by_businessId_and_normalizedName",q=>q.eq("businessId",b._id))),
  appointments:await bounded(ctx.db.query("appointments").withIndex("by_businessId_and_date",q=>q.eq("businessId",b._id))),
  receipts:await bounded(ctx.db.query("publicBookingReceipts").withIndex("by_businessId_and_attemptKey",q=>q.eq("businessId",b._id))),
  clientReceipts:await bounded(ctx.db.query("clientCreationReceipts").withIndex("by_businessId_and_operationId",q=>q.eq("businessId",b._id))),
  privateReceipts:await bounded(ctx.db.query("privateBookingReceipts").withIndex("by_businessId_and_operationId",q=>q.eq("businessId",b._id))),
  notices:await bounded(ctx.db.query("appointmentNotices").withIndex("by_businessId_and_updatedAt",q=>q.eq("businessId",b._id))),
  services:await bounded(ctx.db.query("services").withIndex("by_businessId",q=>q.eq("businessId",b._id))),
  weeklySchedules:await bounded(ctx.db.query("weeklySchedules").withIndex("by_businessId",q=>q.eq("businessId",b._id))),
  specialDates:await bounded(ctx.db.query("specialDates").withIndex("by_businessId_and_date",q=>q.eq("businessId",b._id))),
  timeBlocks:await bounded(ctx.db.query("timeBlocks").withIndex("by_businessId_and_creationKey",q=>q.eq("businessId",b._id)))};
}});
export const emailLegacyClient = internalMutation({args:{name:v.string(),operationId:v.string()},returns:v.id("clients"),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx);return await ctx.db.insert("clients",{businessId:b._id,name:args.name,normalizedName:args.name.toLowerCase(),createdAt:Date.now(),creationKey:args.operationId});
}});
export const emailLegacyBooking = internalMutation({args:{serviceId:v.id("services"),date:v.string(),start:v.number(),attemptKey:v.string()},returns:v.id("appointments"),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx),s=await ctx.db.get("services",args.serviceId);if(!s||s.businessId!==b._id)throw Error("Synthetic ownership");
 const row={businessId:b._id,serviceId:s._id,serviceName:s.name,clientName:"Legacy email-free",date:args.date,start:args.start,end:args.start+s.durationMinutes*60000,status:"confirmed" as const};
 const id=await ctx.db.insert("appointments",row);await ctx.db.insert("publicBookingReceipts",{businessId:b._id,serviceId:s._id,serviceName:s.name,clientName:row.clientName,date:row.date,start:row.start,end:row.end,appointmentId:id,attemptKey:args.attemptKey,timeZone:b.timeZone});return id;
}});
export const emailDenseClients = internalMutation({args:{},returns:v.null(),handler:async ctx=>{
 const b=await requireMyBusiness(ctx);for(let i=0;i<205;i++)await ctx.db.insert("clients",{businessId:b._id,name:i<145?"Érica Álvarez":"Zeta "+i,
  normalizedName:i<145?"erica alvarez":"zeta "+i,email:"dense"+i+"@example.test",createdAt:Date.now()});return null;
}});
export const emailDenseCapacity = internalMutation({args:{serviceId:v.id("services"),date:v.string(),start:v.number()},returns:v.null(),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx),s=await ctx.db.get("services",args.serviceId);if(!s||s.businessId!==b._id)throw Error("Synthetic ownership");
 for(let i=0;i<1441;i++)await ctx.db.insert("appointments",{businessId:b._id,serviceId:s._id,serviceName:s.name,clientName:"Synthetic capacity",date:args.date,start:args.start,end:args.start+1800000,status:"confirmed"});return null;
}});
export const emailLaterClientName = internalMutation({args:{clientId:v.id("clients"),name:v.string()},returns:v.null(),handler:async(ctx,args)=>{
 const b=await requireMyBusiness(ctx),row=await ctx.db.get("clients",args.clientId);if(!row||row.businessId!==b._id)throw Error("Synthetic ownership");
 await ctx.db.patch("clients",row._id,{name:args.name,normalizedName:args.name.toLowerCase()});return null;
}});
`;
