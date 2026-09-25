/* Transporte da plataforma — sessão por cookie seguro, sem credenciais no navegador */
globalThis.XBPlatform=Object.freeze({
 async request(path,{method='GET',data,headers={}}={}){
  const response=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),
   headers:{'Content-Type':'application/json','X-XBurguer-Request':'1',...headers},
   ...(data===undefined?{}:{body:JSON.stringify(data)})});
  const result=await response.json();
  if(!response.ok){const error=new Error(result.error||'Falha na conexão');error.status=response.status;throw error}
  return result;
 }
});
