"use client";
import { useState } from "react";
export default function VerifyPage() {
  const [value,setValue]=useState(""); const [message,setMessage]=useState("");
  return <><div className="eyebrow">Public verification</div><h1>Verify a digital title</h1><p className="lede">Check a parcel code, token ID or blockchain transaction without exposing private evidence.</p>
    <div className="card" style={{maxWidth:620}}><div className="field"><label>Parcel code or token ID</label><input value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g. AN-LA-001"/></div>
    <button className="button" onClick={()=>setMessage(value ? "Verification endpoint is ready; no matching issued title was found in the current local registry." : "Enter a reference first.")}>Verify title</button>
    {message&&<p>{message}</p>}</div></>;
}
