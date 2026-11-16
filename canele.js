/* One themed, bilingual view for the physical companion's pairing state. */
'use strict';
window.CaneleUI=(()=>{
 const $=id=>document.getElementById(id);
 const trigger=$('connectCaneleButton'),dialog=$('caneleDialog');
 if(!trigger||!dialog)return null;
 const form=$('canelePairForm'),input=$('canelePairCode'),consent=$('caneleImportConsent');
 const disconnect=$('caneleDisconnect'),feedback=$('caneleFeedback');
 const t=text=>window.EumoI18n?.t(text)||text;
 const labels={disconnected:'Not connected',connecting:'Connecting…',pending:'Confirm on canele',connected:'Connected',offline:'Offline'};
 let view={state:'disconnected',message:'',detail:'',error:false,invalid:false};
 function render(patch={}){
  view={...view,...patch};
  const linked=['pending','connected','offline'].includes(view.state),busy=view.state==='connecting';
  const icon=view.state==='connected'?'caneleConnected':'canele';
  trigger.dataset.connection=view.state;
  const label=view.state==='disconnected'?'Connect your canele':'Your canele · '+labels[view.state];
  FocusIcons.set(trigger,icon,label);
  if($('caneleDeviceArt').dataset.icon!==icon){$('caneleDeviceArt').innerHTML=FocusIcons.svg(icon);$('caneleDeviceArt').dataset.icon=icon;}
  dialog.dataset.connection=view.state;
  $('caneleConnectionState').textContent=t(labels[view.state]);
  form.hidden=linked;input.disabled=busy;consent.disabled=busy;form.querySelector('[type=submit]').disabled=busy;
  disconnect.hidden=!linked;
  disconnect.textContent=t(view.state==='pending'?'Cancel pairing':'Disconnect canele');
  input.setAttribute('aria-invalid',String(view.invalid));
  feedback.textContent=t(view.message)+(view.detail?' '+view.detail:'');
  feedback.hidden=!view.message;feedback.dataset.error=String(view.error);
 }
 trigger.addEventListener('click',()=>{
  if(dialog.open)return;
  dialog.showModal();trigger.setAttribute('aria-expanded','true');
  (form.hidden?disconnect:input).focus();
 });
 dialog.addEventListener('close',()=>{
  trigger.setAttribute('aria-expanded','false');
  // The request stays pending if the window closes; its Cancel button revokes it.
  input.value='';consent.checked=false;
 });
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,4);if(view.invalid)render({invalid:false,message:'',error:false});});
 window.addEventListener('eumo-language',()=>render());
 render();
 return {render,form,input,consent,disconnect,dialog};
})();
