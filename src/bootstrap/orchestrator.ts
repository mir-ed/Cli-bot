import { initialiseIfNeeded, resolveWorkspace } from "./bootstrapTools.js"


export const init = async ()=>{
   const UserInfo =  await initialiseIfNeeded();
   const wd = await resolveWorkspace(UserInfo);
  console.log(wd);
  
}