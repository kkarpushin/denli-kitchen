import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const port=Number(process.env.DENLI_PORT||8765);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.pdf':'application/pdf','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
  try{
    const decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(decoded.split('/').some(s=>s.startsWith('.')&&s!=='.')){res.writeHead(404);return res.end();}
    let file=path.resolve(root,'.'+decoded);
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`DENLI: http://127.0.0.1:${port}\nHandoff: http://127.0.0.1:${port}/HANDOFF.html`));
