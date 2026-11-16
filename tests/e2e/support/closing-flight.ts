import {resultOf} from './proof';
/** Decode only length-framed Flight text referenced by the real chunk model.
 * The approved A–F result parser intentionally leaves these references intact. */
export function closingResult(body:string){
 const result=resultOf(body),value=result?.value as {base64?:unknown}|undefined;
 if(typeof value?.base64!=='string'||!/^\$[a-f0-9]+$/.test(value.base64))return result;
 const ref=value.base64.slice(1),bytes=Buffer.from(body,'utf8');let offset=0,text:string|undefined;
 while(offset<bytes.length){
  if(bytes[offset]===10){offset++;continue;}
  const colon=bytes.indexOf(58,offset);if(colon<0)throw Error('G_FLIGHT_INVALID');const id=bytes.subarray(offset,colon).toString();if(!/^[a-f0-9]+$/.test(id))throw Error('G_FLIGHT_INVALID');
  const start=colon+1;
  if(bytes[start]===84){const comma=bytes.indexOf(44,start),length=comma<0?'':bytes.subarray(start+1,comma).toString();if(!/^[a-f0-9]+$/.test(length))throw Error('G_FLIGHT_INVALID');const size=Number.parseInt(length,16);if(!Number.isSafeInteger(size)||size>bytes.length-comma-1)throw Error('G_FLIGHT_INVALID');if(id===ref){if(text!==undefined)throw Error('G_FLIGHT_DUPLICATE_TEXT');text=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(comma+1,comma+1+size));}offset=comma+1+size;
  }else{const end=bytes.indexOf(10,start);offset=end<0?bytes.length:end+1;}
 }
 if(text===undefined)throw Error('G_FLIGHT_MISSING_TEXT');return{...result,value:{...value,base64:text}};
}
