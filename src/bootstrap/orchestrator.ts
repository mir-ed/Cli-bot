import { initialiseIfNeeded } from "./bootstrapTools.js"


export const init = async ()=>{
   const environmentInfo =  await initialiseIfNeeded();
  console.log(environmentInfo);
  
}