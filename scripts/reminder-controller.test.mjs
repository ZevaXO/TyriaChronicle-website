import test from 'node:test';import assert from 'node:assert/strict';
import { createReminders } from '../reminders.mjs';
test('permission is only requested by enabling, denial and revoked permission keep reminders paused', async () => {
  const old={document:globalThis.document,window:globalThis.window,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),secure:globalThis.isSecureContext};
  globalThis.document=new EventTarget();globalThis.window=new EventTarget();globalThis.isSecureContext=true;Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
  const states=[],messages=[];let requests=0;const api={permission:'default',async requestPermission(){requests++;return 'denied'}};
  const options={events:[],storage:{getItem:()=>null,setItem:()=>{}},getState:()=>({done:[]}),onChange:s=>states.push(s),report:s=>messages.push(s),api};
  let controller;
  try{controller=createReminders(options);assert.equal(requests,0);controller.setLead(5);assert.equal(requests,0);await controller.enable();assert.equal(requests,1);assert.equal(states.at(-1).enabled,false);assert(messages.at(-1).includes('blocked'));controller.destroy();
    api.permission='granted';controller=createReminders(options);await controller.enable();assert.equal(states.at(-1).enabled,true);api.permission='denied';controller.tick();assert.equal(states.at(-1).enabled,false);assert(messages.at(-1).includes('permission changed'));controller.destroy();
    Object.defineProperty(globalThis,'navigator',{value:{locks:{request:async(name,opts,callback)=>callback(null)}},configurable:true});api.permission='granted';controller=createReminders(options);await controller.enable();assert.equal(states.at(-1).enabled,false);assert(messages.at(-1).includes('another'));controller.destroy();
  }finally{controller?.destroy();globalThis.document=old.document;globalThis.window=old.window;globalThis.isSecureContext=old.secure;if(old.navigator)Object.defineProperty(globalThis,'navigator',old.navigator);else delete globalThis.navigator;}
});
