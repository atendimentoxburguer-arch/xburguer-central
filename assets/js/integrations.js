/* Adaptadores de integrações externas permitidas no frontend atual */
(function(){
  'use strict';

  const QR_IMAGE_ENDPOINT='https://api.qrserver.com/v1/create-qr-code/';

  function tableQrImageUrl(payload,size=180){
    const safeSize=Math.max(96,Math.min(512,Math.round(Number(size)||180)));
    const data=encodeURIComponent(String(payload||'').slice(0,500));
    return QR_IMAGE_ENDPOINT+'?size='+safeSize+'x'+safeSize+'&margin=0&data='+data;
  }

  globalThis.XBIntegrations=Object.freeze({
    tableQrImageUrl
  });
})();
