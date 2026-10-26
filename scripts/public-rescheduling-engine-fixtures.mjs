// Appended ONLY to the existing harness's owned temporary real backend.
export const publicReschedulingFixtureSource = `
export const moveRaw=internalQuery({args:{},returns:v.any(),handler:async ctx=>{
 const b=await requireMyBusiness(ctx),appointments=await ctx.db.query("appointments").withIndex("by_businessId_and_date",q=>q.eq("businessId",b._id)).take(2001);
 if(appointments.length>2000)throw Error("Synthetic move appointments bound");const receipts=[];
 for(const a of appointments){const access=await ctx.db.query("publicBookingAccesses").withIndex("by_appointmentId",q=>q.eq("appointmentId",a._id)).unique();if(!access)continue;
 const rows=await ctx.db.query("publicRescheduleReceipts").withIndex("by_accessId_and_operationId",q=>q.eq("accessId",access._id)).take(2001);if(rows.length>2000)throw Error("Synthetic move receipts bound");receipts.push(...rows);}
 return receipts;
}});
`;
