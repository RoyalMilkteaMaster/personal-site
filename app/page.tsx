'use client';
import {useState,useRef,useEffect} from 'react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {projects} from '@/lib/projects';
import AstralScene from './astral-scene';
import {ArrowUpRight,Sun,Moon,Crown,RotateCcw} from 'lucide-react';
const sections=['關於我','我的作品','聯絡資訊'];
export default function Home(){
 const [light,setLight]=useState(false),[active,setActive]=useState('0'),[replay,setReplay]=useState(0),[skip,setSkip]=useState(false);
 const contentRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{contentRef.current?.scrollTo({top:0,behavior:'instant'});},[active]);
 return <div className={`site atlas ${light?'light':''}`}>
 <a className="skip" href="#content">跳至主要內容</a>
 <header><a className="brand" href="#"><Crown size={28} aria-hidden="true"/><span><span className="brand-name">ROYAL MILKTEA MASTER</span><span className="brand-sub">PIN HUNG LIN</span></span></a><button className="theme" onClick={()=>setLight(!light)} aria-label={light?'切換星夜':'切換日光'}>{light?<Moon size={17}/>:<Sun size={17}/>}<span>{light?'星夜':'日光'}</span></button></header>
 <main><Tabs value={active} onValueChange={v=>setActive(String(v))} className="atlas-layout">
 <aside className="portrait-stage"><div className="stage-label">ROYAL MILKTEA / PERSONAL UNIVERSE</div><AstralScene pose={Number(active)} replay={replay} skip={skip}/><div className="stage-controls"><button onClick={()=>{setActive('0');setSkip(false);setReplay(replay+1);}}><RotateCcw size={14}/>重播星塵</button><button onClick={()=>setSkip(true)}>略過動畫 →</button></div><div className="stage-caption"><span>0{Number(active)+1}</span><span>{sections[Number(active)]}</span><i>✧</i></div></aside>
 <div ref={contentRef} className="atlas-content" id="content"><p className="eyebrow">林品宏 ／ 皇家奶茶大師</p><TabsList className="chapter-tabs" aria-label="個人網站主題">{sections.map((s,i)=><TabsTrigger key={s} value={String(i)}><span>0{i+1}</span>{s}</TabsTrigger>)}</TabsList>
 <TabsContent value="0" className="chapter"><p className="chapter-kicker">ABOUT ME</p><h1>把好奇，<br/><em>變成可能。</em></h1><p className="lead">嗨，我是林品宏。探索 AI、自動化與系統開發，讓想法走出腦海，成為能被使用的作品。</p>
 <section className="bio-block"><h2>歷程 <small>JOURNEY</small></h2><div className="timeline"><article><span>2024</span><div><h3>國立成功大學</h3><p>光電科學與工程學系畢業</p></div></article><article><span>跨域經驗</span><div><h3>從研究到製造現場</h3><p>累積政策研究與製造現場跨部門工作經驗，把問題觀察帶進系統開發。</p></div></article><article><span>現在</span><div><h3>AI 應用與多 Agent 系統</h3><p>串起研究、開發與驗證，探索實際可用的產品。</p></div></article></div></section>
 <section className="bio-block"><h2>得獎 <small>RECOGNITION</small></h2><div className="award-row"><span>2026</span><div><h3>雲湧智生黑客松</h3><p>智慧交易冠軍</p></div><span>✧</span></div><div className="award-row"><span>2026</span><div><h3>台灣未來祭</h3><p>AI 創意科技優勝 · AI 綜合第四</p></div><span>✧</span></div></section>
 <section className="bio-block"><h2>技能 <small>TOOLKIT</small></h2><h3>系統與分析</h3><div className="skills"><span>Multi-Agent</span><span>Python 自動化</span><span>資料分析</span><span>後端整合</span></div><h3>生成式 AI 與創作</h3><div className="skills"><span>ComfyUI</span><span>Blender</span><span>FastAPI</span><span>原型開發</span></div></section></TabsContent>
 <TabsContent value="1" className="chapter"><p className="chapter-kicker">SELECTED & ONGOING</p><h1>我的作品<em>持續探索中。</em></h1><p className="lead">從多 Agent 協作到影像生成，留下每個想法落地的過程。</p><div className="work-collection">{projects.map((p,i)=><article className="work-entry" key={p.id}><p className="chapter-kicker">0{i+1} / {p.category}</p><h2>{p.title}</h2><p>{p.summary}</p><details><summary>了解作品</summary><p>{p.detail}</p></details><div className="skills">{p.tech.map(t=><span key={t}>{t}</span>)}</div><div className="work-links">{p.links.map(l=><a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}<ArrowUpRight size={16}/></a>)}</div></article>)}</div><a className="text-link" href="https://github.com/RoyalMilkteaMaster" target="_blank" rel="noreferrer">探索我的 GitHub <ArrowUpRight size={16}/></a></TabsContent>
 <TabsContent value="2" className="chapter"><p className="chapter-kicker">LET’S CONNECT</p><h1>讓下一個<br/><em>點子相遇。</em></h1><p className="lead">想聊 AI 應用、專案合作，或交流一個有趣的想法，歡迎聯絡我。</p><div className="contact-inner atlas-contact"><p className="eyebrow">EMAIL</p><a href="mailto:leslie0907@gmail.com">leslie0907@gmail.com <ArrowUpRight size={20}/></a></div><a className="contact-line" href="https://github.com/RoyalMilkteaMaster" target="_blank" rel="noreferrer"><span>GitHub<small>RoyalMilkteaMaster</small></span><ArrowUpRight/></a></TabsContent>
 <footer>© {new Date().getFullYear()} Royal Milktea Master</footer></div></Tabs></main></div>;
}
