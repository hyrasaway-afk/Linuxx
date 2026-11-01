const express = require("express");
const path = require("path");
const app = express();
app.use(express.json({limit:"20kb"}));
app.use(express.static(path.join(__dirname,"public")));
const COBALT_API = process.env.COBALT_API_URL;
const API_KEY = process.env.COBALT_API_KEY || "";
app.post("/api/resolve", async (req,res)=>{
  const {url,quality} = req.body || {};
  if (!url || typeof url !== "string") return res.status(400).json({error:"أدخل رابطًا صحيحًا."});
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({error:"الرابط غير صالح."}); }
  if (!["http:","https:"].includes(parsed.protocol)) return res.status(400).json({error:"يسمح بروابط HTTP/HTTPS فقط."});
  if (!COBALT_API) return res.status(503).json({error:"لم يتم إعداد عنوان خادم Cobalt بعد."});
  try {
    const q = String(quality || "");
    const videoQuality = q.includes("720") ? "720" : q.includes("480") ? "480" : "max";
    const headers = {"Content-Type":"application/json","Accept":"application/json"};
    if (API_KEY) headers.Authorization = `Api-Key ${API_KEY}`;
    const upstream = await fetch(COBALT_API.replace(/\/$/,"")+"/", {
      method:"POST", headers,
      body:JSON.stringify({url,videoQuality,downloadMode:"auto",filenameStyle:"pretty"})
    });
    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) return res.status(502).json({error:data?.error?.code || data?.text || "خدمة التنزيل رفضت الرابط."});
    if (data.status === "tunnel" && data.url) return res.json({status:"tunnel",url:data.url,message:"تم تجهيز الفيديو. اضغط تنزيل الفيديو."});
    if (data.status === "redirect" && data.url) return res.json({status:"redirect",url:data.url,message:"تم العثور على رابط المصدر."});
    if (data.status === "picker") return res.json({status:"picker",message:"المصدر يحتوي على أكثر من ملف."});
    return res.status(502).json({error:"لم تُرجع الخدمة رابط تنزيل مباشر."});
  } catch (e) {
    return res.status(502).json({error:"تعذر الوصول إلى خادم Cobalt. تحقق من عنوانه واتصاله."});
  }
});
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Linux Downloader running on :${port}`));
