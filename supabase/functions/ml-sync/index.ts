import { createClient } from 'npm:@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type,x-ml-sync-token','Content-Type':'application/json'};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return out({error:'Method not allowed'},405);
 try{
  const expected=Deno.env.get('ML_SYNC_TOKEN'); const supplied=req.headers.get('x-ml-sync-token'); if(!expected||supplied!==expected)return out({error:'Unauthorized'},401);
  const url=Deno.env.get('SUPABASE_URL')!; const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; const s=createClient(url,service,{auth:{persistSession:false}});
  const payload=await req.json(); if(!payload.model?.model_name||!payload.model?.version)throw new Error('Model metadata is required.');
  const {data:model,error:modelError}=await s.from('ml_models').upsert(payload.model,{onConflict:'model_name,version'}).select().single(); if(modelError)throw modelError;
  if(payload.metrics?.length){await s.from('ml_metrics').delete().eq('model_id',model.id);const{error}=await s.from('ml_metrics').insert(payload.metrics.map((x:any)=>({...x,model_id:model.id})));if(error)throw error}
  if(payload.demand_forecasts?.length){await s.from('demand_forecasts').delete().eq('model_id',model.id);const{error}=await s.from('demand_forecasts').insert(payload.demand_forecasts.map((x:any)=>({...x,model_id:model.id})));if(error)throw error}
  if(payload.recommendations?.length){await s.from('product_recommendations').delete().eq('model_id',model.id);const{error}=await s.from('product_recommendations').insert(payload.recommendations.map((x:any)=>({...x,model_id:model.id})));if(error)throw error}
  if(payload.inventory_forecasts?.length){await s.from('inventory_forecasts').delete().eq('model_id',model.id);const{error}=await s.from('inventory_forecasts').insert(payload.inventory_forecasts.map((x:any)=>({...x,model_id:model.id})));if(error)throw error}
  if(payload.activate===true){await s.from('ml_models').update({status:'ARCHIVED'}).eq('model_name',model.model_name).neq('id',model.id).eq('status','ACTIVE');await s.from('ml_models').update({status:'ACTIVE'}).eq('id',model.id)}
  return out({ok:true,model_id:model.id});
 }catch(e){console.error(e);return out({error:e instanceof Error?e.message:String(e)},400)}
});
