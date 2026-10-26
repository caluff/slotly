// Appended only to the owned temporary Convex deployment by the existing engine runner.
export const clientsFixtureSource = `
export const clientsRaw = internalQuery({args:{},returns:v.any(),handler:async ctx=>{
 const business=await requireMyBusiness(ctx);
 const clients=await ctx.db.query("clients").withIndex("by_businessId_and_normalizedName",q=>q.eq("businessId",business._id)).take(10001);
 const appointments=await ctx.db.query("appointments").withIndex("by_businessId_and_date",q=>q.eq("businessId",business._id)).take(10001);
 const receipts=await ctx.db.query("publicBookingReceipts").withIndex("by_businessId_and_attemptKey",q=>q.eq("businessId",business._id)).take(10001);
 const notices=await ctx.db.query("appointmentNotices").withIndex("by_businessId_and_updatedAt",q=>q.eq("businessId",business._id)).take(10001);
 if([clients,appointments,receipts,notices].some(rows=>rows.length>10000))throw Error("Synthetic snapshot bound");
 return {clients,appointments,receipts,notices};
}});
export const clientsDense = internalMutation({args:{count:v.number()},returns:v.null(),handler:async ctx=>{
 const business=await requireMyBusiness(ctx);
 for(let i=0;i<145;i++)await ctx.db.insert("clients",{businessId:business._id,name:i%2?"Érica Álvarez":"Erica Alvarez",normalizedName:"erica alvarez",createdAt:Date.now(),creationKey:"synthetic-dense-"+i});
 for(let i=0;i<60;i++)await ctx.db.insert("clients",{businessId:business._id,name:"Zeta "+i,normalizedName:"zeta "+String(i).padStart(3,"0"),createdAt:Date.now(),creationKey:"synthetic-other-"+i});
 return null;
}});
export const clientHistorySeed = internalMutation({args:{clientId:v.id("clients"),serviceId:v.id("services"),count:v.number()},returns:v.array(v.id("appointments")),handler:async(ctx,args)=>{
 const business=await requireMyBusiness(ctx),client=await ctx.db.get("clients",args.clientId),service=await ctx.db.get("services",args.serviceId);
 if(!client||client.businessId!==business._id||!service||service.businessId!==business._id)throw Error("Synthetic ownership");
 const statuses=["confirmed","completed","cancelled","no_show"] as const,ids=[];
 for(let i=0;i<args.count;i++){const start=Date.now()-86400000-Math.floor(i/3)*3600000,end=start+service.durationMinutes*60000;
 ids.push(await ctx.db.insert("appointments",{businessId:business._id,clientId:client._id,clientName:"Nombre histórico "+i,serviceId:service._id,serviceName:"Servicio histórico "+i,date:todayInZone(business.timeZone,start),start,end,status:statuses[i%4],version:i%3}));}
 return ids;
}});
export const clientAttachFixture = internalMutation({args:{appointmentId:v.id("appointments"),clientId:v.id("clients")},returns:v.null(),handler:async(ctx,args)=>{
 const business=await requireMyBusiness(ctx),row=await ctx.db.get("appointments",args.appointmentId),client=await ctx.db.get("clients",args.clientId);
 if(!row||!client||row.businessId!==business._id||client.businessId!==business._id)throw Error("Synthetic ownership");
 await ctx.db.patch("appointments",row._id,{clientId:client._id});return null;
}});
`;
