import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='ZevaXO/TyriaChronicle-beta';
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalize(raw){
 if(!Array.isArray(raw))throw Error('Release response must be an array');
 const releases=raw.filter(r=>!r.draft&&/^v\d+\.\d+\.\d+(?:-beta)?$/.test(r.tag_name)).map(r=>{
  const version=r.tag_name.slice(1).replace(/-beta$/,'');
  const expected=`TyriaChronicle-${version}-beta-windows-x64.zip`;
  const asset=(r.assets||[]).find(a=>a.name===expected&&a.state==='uploaded'&&a.browser_download_url===`https://github.com/${REPO}/releases/download/${r.tag_name}/${expected}`);
  if(!asset)return null;
  if(!Number.isFinite(Date.parse(r.published_at)))throw Error('Invalid publication date');
  return {tag:r.tag_name,version,name:String(r.name||`Tyria Chronicle ${version}-beta`),date:r.published_at,url:`https://github.com/${REPO}/releases/tag/${r.tag_name}`,download:asset.browser_download_url,body:String(r.body||'')};
 }).filter(Boolean).sort((a,b)=>{const x=a.version.split('.').map(Number),y=b.version.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return y[i]-x[i];return Date.parse(b.date)-Date.parse(a.date);});
 if(!releases.length)throw Error('No published installable beta found; keep the previous site');
 return releases;
}
export function section(body,pattern){const lines=body.split(/\r?\n/);const start=lines.findIndex(l=>pattern.test(l));if(start<0)return '';let end=start+1;while(end<lines.length&&!/^##\s/.test(lines[end]))end++;return lines.slice(start+1,end).join('\n').trim();}
export function replaceBlock(html,name,content){const start=`<!-- release:${name}:start -->`,end=`<!-- release:${name}:end -->`;if(html.split(start).length!==2||html.split(end).length!==2)throw Error(`Expected one ${name} block`);const a=html.indexOf(start)+start.length,b=html.indexOf(end);if(b<a)throw Error('Reversed markers');return html.slice(0,a)+'\n'+content+'\n'+html.slice(b);}
const dateText=iso=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(iso));
export function render(releases,config){
 const latest=releases[0],e=escapeHtml,date=dateText(latest.date);
 const important=section(latest.body,/^##\s+Important (?:upgrade|update|notice|installation)/i);
 const warnings=[...(config.advisories||[])];
 if(important)warnings.unshift({title:`Important release information · ${latest.version}`,text:important.replace(/\*\*/g,''),url:latest.url});
 const warning=warnings.length?`<aside class="release-alert" aria-label="Important upgrade information">${warnings.map(w=>`<h2>${e(w.title)}</h2><p style="white-space:pre-line">${e(w.text)}</p><a href="${e(w.url)}">Read the upgrade notes ↗</a>`).join('')}</aside>`:'';
 const news=section(latest.body,/^##\s+What's new/i).split('\n').filter(l=>l.trim()).map(l=>`<li>${e(l.replace(/^[-*]\s+/,''))}</li>`).join('');
 const changelog=`<p>Latest published beta: <strong>${e(latest.version)}</strong> · ${date}. Release information is synchronized automatically from <a href="https://github.com/${REPO}/releases">GitHub</a>. Guide review status is separate.</p><div id="release-notes">${releases.map(r=>`<div class="changelog-entry"><span class="version">${e(r.version)}-beta · ${dateText(r.date)}</span><h3>${e(r.name)}</h3>${r===latest&&news?`<ul>${news}</ul>`:''}<details><summary>Release notes</summary><div style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px">${e(r.body)}</div></details><a href="${e(r.url)}">Original release notes ↗</a></div>`).join('')}</div>`;
 return {strip:`<div class="release-strip"><span><span class="dot"></span> PUBLIC BETA <strong>${e(latest.version)}</strong></span><p>Published ${date}</p><a href="guide.html#changelog">Read the release notes →</a></div>`,warning,version:`<p>Public beta ${e(latest.version)} · Published ${date}</p>`,download:`<a class="button" href="${e(latest.download)}">Download Windows x64 ZIP ↓</a>`,changelog,'guide-status':`<p class="note">Latest beta: <strong>${e(latest.version)}</strong>. Feature guides reviewed for <strong>${e(config.manualVersion)}</strong> on ${dateText(config.manualReviewed)}; installation/update troubleshooting reviewed for <strong>${e(config.installationVersion)}</strong> on ${dateText(config.installationReviewed)}. Automatic release updates do not mark the manual as newly reviewed.</p>`};
}
export async function sync(root=ROOT,raw){
 if(!raw){const headers={'Accept':'application/vnd.github+json','User-Agent':'TyriaChronicle-website-release-sync'};if(process.env.GITHUB_TOKEN)headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
  const response=await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`,{headers,signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Release fetch failed: ${response.status}`);raw=await response.json();}
 const releases=normalize(raw),config=JSON.parse(await fs.readFile(path.join(root,'release-config.json'),'utf8')),blocks=render(releases,config);
 const pending=[];
 for(const [name,names] of [['index.html',['strip','warning','version','download']],['guide.html',['warning','guide-status','changelog']]]){let html=await fs.readFile(path.join(root,name),'utf8');for(const block of names)html=replaceBlock(html,block,blocks[block]);pending.push([name,html]);}
 pending.push(['releases.json',JSON.stringify(releases,null,2)+'\n']);
 for(const [name,content] of pending){let old='';try{old=await fs.readFile(path.join(root,name),'utf8')}catch{}if(old!==content)await fs.writeFile(path.join(root,name),content);}
 console.log(`Synchronized ${releases[0].tag}; manual review remains ${config.manualVersion}`);
 return releases;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const arg=process.argv.indexOf('--input');const raw=arg>=0?JSON.parse(await fs.readFile(process.argv[arg+1],'utf8')):undefined;await sync(ROOT,raw);}catch(error){console.error(error.message);process.exitCode=1;}}
