/* Pairing entry only. Device transport will be integrated after firmware review. */
'use strict';
(() => {
 const trigger=document.getElementById('connectCaneleButton');
 const dialog=document.getElementById('caneleDialog');
 if(!trigger||!dialog)return;
 const form=document.getElementById('canelePairForm');
 const input=document.getElementById('canelePairCode');
 const feedback=document.getElementById('caneleFeedback');
 const t=text=>window.EumoI18n?.t(text)||text;
 let message='';

 FocusIcons.set(trigger,'canele','Connect your canele');
 document.getElementById('caneleDeviceArt').innerHTML=FocusIcons.svg('canele');

 function showMessage(text,invalid=false){
  message=text;
  feedback.textContent=t(text);
  feedback.hidden=!text;
  input.setAttribute('aria-invalid',String(invalid));
 }
 trigger.addEventListener('click',()=>{
  if(dialog.open)return;
  showMessage('');
  dialog.showModal();
  trigger.setAttribute('aria-expanded','true');
  input.focus();
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!input.value.trim()){
   showMessage('Enter the pairing code shown on your canele.',true);
   input.focus();
   return;
  }
  // Never infer a device connection from a code alone, persist the code,
  // or change the local timer/save. No pairing endpoint is available yet.
  showMessage('Pairing is not available yet. Your canele has not been connected.');
 });
 input.addEventListener('input',()=>showMessage(''));
 dialog.addEventListener('close',()=>{
  form.reset();
  showMessage('');
  trigger.setAttribute('aria-expanded','false');
 });
 window.addEventListener('eumo-language',()=>{
  FocusIcons.set(trigger,'canele','Connect your canele');
  if(message)feedback.textContent=t(message);
 });
})();
