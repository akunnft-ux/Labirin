const $=s=>document.querySelector(s),cv=$('#cv'),wrap=$('#wrap'),ov=$('#ov'),ovc=$('#ovc');
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a,pick=a=>a[rnd(0,a.length-1)];
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const gcd=(a,b)=>b?gcd(b,a%b):a,lcm=(a,b)=>a/gcd(a,b)*b;
const fr=(n,d)=>{const g=gcd(n,d);n/=g;d/=g;return d==1?`${n}`:`${n}/${d}`};
const num=x=>x.toLocaleString('id-ID'),rp=x=>'Rp'+num(x);
const hh=x=>String(Math.floor(x/60)%24).padStart(2,'0')+'.'+String(x%60).padStart(2,'0');
function mk(q,ans,wr,exp){
  ans=String(ans);const set=[ans];
  for(const w of shuf(wr)){const s=String(w);if(s&&!set.includes(s))set.push(s);if(set.length==4)break}
  const b=parseFloat(ans),u=ans.replace(/^[\d.,-]+/,'');let k=1;
  while(set.length<4){const s=(isNaN(b)?'Pilihan '+k:b+k)+(isNaN(b)?'':u);k++;if(!set.includes(s))set.push(s)}
  const opts=shuf(set);return{q,opts,a:opts.indexOf(ans),exp};
}

/* ===== BANK SOAL: 6 kompetensi sesuai kisi-kisi TKA Matematika SD (bilangan, geometri & pengukuran, data) + penalaran =====
   Setiap generator menerima tingkat t = 1..3 (makin besar makin sulit). Tambah generator baru di array g. */
const DM=[
{n:'Bilangan',s:'Bilangan',e:'🔢',c:'#e5484d',g:[
 t=>{const a=rnd(2,8*t),b=rnd(2,9),c=rnd(2,9),d=rnd(2,9),e=rnd(2,5);
  const [s,r]=t==1?[`${a} + ${b} × ${c}`,a+b*c]:t==2?[`(${a} + ${b}) × ${c} − ${d}`,(a+b)*c-d]:[`${a*e} ÷ ${e} + ${b} × ${c} − ${d}`,a+b*c-d];
  return mk(`Hasil dari ${s} adalah ...`,r,[r+d,r-c,r+10,r-10,(a+b)*c],`Kerjakan tanda kurung, kali, dan bagi dulu, baru tambah dan kurang: ${r}.`)},
 t=>{const P=[4,6,8,9,10,12,15,18],a=pick(P),b=pick(P.filter(x=>x!==a)),k=rnd(0,t>1?2:1);
  if(k==0)return mk(`KPK dari ${a} dan ${b} adalah ...`,lcm(a,b),[a*b,gcd(a,b),lcm(a,b)*2,a+b],`Kelipatan persekutuan terkecil ${a} dan ${b} adalah ${lcm(a,b)}.`);
  if(k==1)return mk(`FPB dari ${a*t} dan ${b*t} adalah ...`,gcd(a*t,b*t),[lcm(a*t,b*t),gcd(a*t,b*t)*2,gcd(a*t,b*t)+1,Math.abs(a-b)*t],`Faktor persekutuan terbesar ${a*t} dan ${b*t} adalah ${gcd(a*t,b*t)}.`);
  return mk(`Lampu merah menyala tiap ${a} detik dan lampu biru tiap ${b} detik. Keduanya menyala bersama pada detik ke-0. Keduanya menyala bersama lagi pada detik ke-...`,lcm(a,b),[a*b,gcd(a,b),a+b,lcm(a,b)+a],`Dicari KPK ${a} dan ${b} = ${lcm(a,b)}.`)},
 t=>{const n=rnd(1200,9800*t+1000),u=t==1?10:t==2?100:1000,r=Math.round(n/u)*u,nm=u==10?'puluhan':u==100?'ratusan':'ribuan';
  return mk(`Bilangan ${num(n)} dibulatkan ke ${nm} terdekat menjadi ...`,num(r),[num(Math.floor(n/u)*u),num(Math.ceil(n/u)*u),num(r+u),num(r-u)],`Lihat angka di kanan tempat pembulatan: jika 5 atau lebih, bulatkan ke atas.`)},
 t=>{const a=rnd(3,6+3*t),b=rnd(6,12),T=a*b,c=pick([a,b,2,3,4,5,6,8,9,10,12].filter(x=>T%x==0&&x<T)),r=T/c;
  return mk(`Ibu membeli ${a} kantong jeruk, tiap kantong berisi ${b} buah. Semua jeruk dibagi rata ke ${c} keranjang. Banyak jeruk di tiap keranjang adalah ...`,r,[T,a+b+c,r+c,r-1],`Total = ${a} × ${b} = ${T}; ${T} ÷ ${c} = ${r}.`)}
]},
{n:'Pecahan & Perbandingan',s:'Pecahan',e:'➗',c:'#8e4ec6',g:[
 t=>{const d=pick([2,3,4,5,6,8]),n=rnd(1,d-1),k=rnd(2,3+t),r=`${n*k}/${d*k}`;
  return mk(`Pecahan yang senilai dengan ${n}/${d} adalah ...`,r,[`${n+k}/${d+k}`,`${n*k}/${d+k}`,`${n+k}/${d*k}`],`Kalikan pembilang dan penyebut dengan bilangan yang sama (${k}): ${r}.`)},
 t=>{const D=[2,3,4,5,6,8,10,12],L=[];while(L.length<4){const q=pick(D),p=rnd(1,q-1),v=p/q;if(!L.some(x=>Math.abs(x.v-v)<1e-9))L.push({v,s:`${p}/${q}`})}
  const big=rnd(0,1),s=[...L].sort((a,b)=>big?b.v-a.v:a.v-b.v);
  return mk(`Pecahan yang paling ${big?'besar':'kecil'} di antara pilihan ini adalah ...`,s[0].s,L.filter(x=>x!==s[0]).map(x=>x.s),`Samakan penyebut atau ubah ke desimal: ${s[0].s} ≈ ${s[0].v.toFixed(2).replace('.',',')}.`)},
 t=>{let [b,d]=pick([[2,4],[3,6],[4,8],[2,3],[3,4],[4,6]].slice(0,2+t)),a=rnd(1,b-1),c=rnd(1,d-1),L=lcm(b,d),x=a*L/b,y=c*L/d,sub=t>1&&rnd(0,1);
  if(sub&&x<y){[a,b,c,d]=[c,d,a,b];[x,y]=[y,x]}if(x==y)sub=false;
  const n=sub?x-y:x+y;
  return mk(`${a}/${b} ${sub?'−':'+'} ${c}/${d} = ...`,fr(n,L),[fr(a+c,b+d),fr(a+c,L),fr(n+1,L),fr(Math.abs(x-y)||1,L)],`Samakan penyebut jadi ${L}: ${x}/${L} ${sub?'−':'+'} ${y}/${L} = ${fr(n,L)}.`)},
 t=>{const a=rnd(1,4),b=a+rnd(1,4),k=rnd(3,9+3*t),tot=k*(a+b),[A,B]=shuf(['Ani','Budi','Citra','Dedi']),n=pick(['kelereng','kue','stiker']);
  return mk(`Perbandingan ${n} ${A} dan ${B} adalah ${a} : ${b}. Jumlah ${n} mereka ${tot}. Banyak ${n} ${B} adalah ...`,b*k,[a*k,tot-k,b*k+k,Math.round(tot/2)],`1 bagian = ${tot} ÷ ${a+b} = ${k}. ${B}: ${b} × ${k} = ${b*k}.`)},
 t=>{const S=pick([100000,200000,500000,1000000]),x=rnd(2,9)*t+1,km=x*S/100000;
  return mk(`Pada peta berskala 1 : ${num(S)}, jarak dua kota pada peta ${x} cm. Jarak sebenarnya ... km.`,km,[km*10,km+5,km*100,km+x],`${x} × ${num(S)} = ${num(x*S)} cm = ${km} km (1 km = 100.000 cm).`)},
 t=>{const p=pick([10,20,25,30,40,50]),h=rnd(2,20)*5000,d=h*p/100,r=h-d;
  return mk(`Sebuah tas harganya ${rp(h)}. Dalam promo ada diskon ${p}%. Harga yang harus dibayar ...`,rp(r),[rp(d),rp(h+d),rp(r+h/10),rp(r-5000)],`Diskon = ${p}% × ${rp(h)} = ${rp(d)}. Bayar = ${rp(h)} − ${rp(d)} = ${rp(r)}.`)}
]},
{n:'Geometri',s:'Geometri',e:'📐',c:'#2b8a3e',g:[
 t=>{const p=rnd(5,9+3*t),l=rnd(3,p-1),L=p*l;
  return t==1?mk(`Persegi panjang berukuran ${p} cm × ${l} cm. Kelilingnya ... cm.`,2*(p+l),[p*l,p+l,2*p+l,2*(p+l)+2],`Keliling = 2 × (${p} + ${l}) = ${2*(p+l)} cm.`)
  :mk(`Luas sebuah persegi panjang ${L} cm² dan panjangnya ${p} cm. Kelilingnya ... cm.`,2*(p+l),[L,p+l,2*p+l,2*(p+l)+4],`Lebar = ${L} ÷ ${p} = ${l} cm. Keliling = 2 × (${p} + ${l}) = ${2*(p+l)} cm.`)},
 t=>{const a=rnd(2,6)*2,b=a+rnd(1,3)*2,h=rnd(3,9),s=rnd(2,6)*2;
  const A=[[`Segitiga memiliki alas ${a} cm dan tinggi ${h} cm. Luasnya ... cm².`,a*h/2,`½ × ${a} × ${h}`],
  [`Trapesium memiliki sisi sejajar ${a} cm dan ${b} cm, tinggi ${h} cm. Luasnya ... cm².`,(a+b)*h/2,`½ × (${a} + ${b}) × ${h}`],
  [`Sebuah bangun terdiri atas persegi bersisi ${s} cm dengan segitiga di atasnya (alas ${s} cm, tinggi ${h} cm). Luas seluruh bangun ... cm².`,s*s+s*h/2,`Persegi ${s*s} + segitiga ½ × ${s} × ${h}`]][t-1];
  return mk(A[0],A[1],[A[1]*2,A[1]+h,A[1]-2,a*h],`${A[2]} = ${A[1]} cm².`)},
 t=>{const s=rnd(3,6),p=rnd(4,9),l=rnd(3,6),h=rnd(2,7);
  return t==1?mk(`Volume kubus dengan rusuk ${s} cm adalah ... cm³.`,s**3,[s*s,6*s*s,3*s,s**3+s],`Volume = ${s}³ = ${s**3} cm³.`)
  :t==2?mk(`Balok berukuran ${p} cm × ${l} cm × ${h} cm. Volumenya ... cm³.`,p*l*h,[2*(p*l+p*h+l*h),p+l+h,p*l,p*l*h+p],`Volume = ${p} × ${l} × ${h} = ${p*l*h} cm³.`)
  :mk(`Bak berbentuk balok beralas ${p*2} cm × ${l*2} cm. Bak penuh berisi air ${p*l*4*h} cm³. Tinggi bak ... cm.`,h,[h*2,h+2,p*l*h,Math.max(1,h-1)],`Tinggi = ${p*l*4*h} ÷ ${p*l*4} = ${h} cm.`)},
 t=>{const x=rnd(2,16)*5,y=rnd(3,15)*5,j=pick([2,3,4,5,7,8,10]),aj=Math.min(30*j,360-30*j);
  const A=[[`Dua sudut saling berpelurus. Satu sudutnya ${x}°. Sudut yang lain ... °.`,180-x,'Sudut berpelurus berjumlah 180°.'],
  [`Dua sudut sebuah segitiga ${x}° dan ${y}°. Sudut ketiga ... °.`,180-x-y,'Jumlah sudut dalam segitiga 180°.'],
  [`Besar sudut terkecil antara jarum jam dan jarum menit pada pukul ${j}.00 adalah ... °.`,aj,'Tiap jam = 30°.']][t-1];
  return mk(A[0],A[1],[A[1]+10,A[1]-10,A[1]+30,x],`${A[2]} Jawaban: ${A[1]}°.`)},
 ()=>{const [q,a,w,e]=pick([
  ['Bangun datar yang memiliki 4 sumbu simetri lipat adalah ...','persegi',['persegi panjang','belah ketupat','jajar genjang'],'Persegi punya 4 sumbu simetri.'],
  ['Banyak rusuk pada kubus adalah ...','12',['6','8','10'],'Kubus: 12 rusuk, 6 sisi, 8 titik sudut.'],
  ['Banyak titik sudut pada balok adalah ...','8',['6','12','4'],'Balok punya 8 titik sudut.'],
  ['Segitiga yang ketiga sisinya sama panjang disebut segitiga ...','sama sisi',['sama kaki','siku-siku','sembarang'],'Sama sisi: semua sisi sama panjang.'],
  ['Jaring-jaring dari 6 persegi sama besar dapat dilipat menjadi ...','kubus',['balok','limas','prisma segitiga'],'6 persegi sama besar membentuk kubus.']]);
  return mk(q,a,w,e)}
]},
{n:'Pengukuran',s:'Ukur',e:'⏱️',c:'#e08a00',g:[
 t=>{const s=rnd(6,16)*60+pick([0,5,10,15,20,30,45]),dm=pick([25,35,50,75,95]),n=rnd(2,3),f=d=>d<60?`${d} menit`:`${Math.floor(d/60)} jam`+(d%60?` ${d%60} menit`:''),e=s+n*dm;
  return t==1?mk(`Dina berangkat pukul ${hh(s)}. Perjalanan ${dm} menit. Dina sampai pukul ...`,hh(s+dm),[hh(s+dm+10),hh(s+dm-10),hh(s+dm+20)],`${hh(s)} + ${dm} menit = ${hh(s+dm)}.`)
  :t==2?mk(`Film dimulai pukul ${hh(s)} dan selesai pukul ${hh(s+dm)}. Lama film itu ...`,f(dm),[f(dm+10),f(dm-10),f(dm+25)],`${hh(s+dm)} − ${hh(s)} = ${f(dm)}.`)
  :mk(`Les dimulai pukul ${hh(s)}. Ada ${n} pelajaran, tiap pelajaran ${dm} menit, tanpa istirahat. Les selesai pukul ...`,hh(e),[hh(e+dm),hh(e-10),hh(s+dm+10)],`${n} × ${dm} = ${n*dm} menit. ${hh(s)} + ${n*dm} menit = ${hh(e)}.`)},
 t=>{const U=[['km','m',1000],['m','cm',100],['kg','gram',1000],['liter','mL',1000],['ton','kg',1000],['jam','menit',60]],[a,b,f]=pick(U),v=t==1?rnd(2,9):pick([1.5,2.5,3.5,0.5,4.2,6.8]),r=Math.round(v*f),vs=String(v).replace('.',',');
  return mk(`${vs} ${a} = ... ${b}`,num(r),[num(r*10),num(Math.round(r/10)),num(r+f),num(r+f/2)],`1 ${a} = ${f} ${b}, jadi ${vs} × ${f} = ${num(r)}.`)},
 t=>{const v=pick([30,40,45,60,80]),h=rnd(2,5),s0=rnd(6,9)*60+pick([0,30]);
  return t==1?mk(`Mobil melaju ${v} km/jam selama ${h} jam. Jarak yang ditempuh ... km.`,v*h,[v+h,v*h+v,v*h-v,v*h*2],`Jarak = ${v} × ${h} = ${v*h} km.`)
  :t==2?mk(`Jarak kota A ke B ${v*h} km. Motor melaju ${v} km/jam. Lama perjalanan ... jam.`,h,[h+1,h-1,v,h*2],`Waktu = ${v*h} ÷ ${v} = ${h} jam.`)
  :mk(`Budi naik motor dari pukul ${hh(s0)} dengan kecepatan ${v} km/jam menuju kota sejauh ${v*h} km. Budi tiba pukul ...`,hh(s0+h*60),[hh(s0+h*60+30),hh(s0+(h+1)*60),hh(s0+(h-1)*60)],`Waktu = ${v*h} ÷ ${v} = ${h} jam. ${hh(s0)} + ${h} jam = ${hh(s0+h*60)}.`)},
 ()=>{const [q,a,w]=pick([['Tinggi pintu rumah sekitar ...','2 m',['2 cm','20 cm','200 m']],['Berat seekor ayam dewasa sekitar ...','2 kg',['2 g','20 kg','200 kg']],['Isi satu gelas air sekitar ...','250 mL',['250 L','25 L','2,5 mL']],['Lama menggosok gigi yang wajar sekitar ...','3 menit',['3 jam','30 menit','3 detik']],['Panjang pensil baru sekitar ...','17 cm',['17 m','1,7 mm','170 cm']]]);
  return mk(q,a,w,'Bayangkan benda sehari-hari sebagai pembanding ukuran.')}
]},
{n:'Data',s:'Data',e:'📊',c:'#0d7fd1',g:[
 t=>{const it=shuf([['🍎','apel'],['🍌','pisang'],['🍊','jeruk'],['🍇','anggur']]).slice(0,3),u=t==1?2:pick([5,10,20]),n=shuf([2,3,4,5,6,7]).slice(0,3),
  h=`Piktogram penjualan buah (1 gambar = ${u} kg):\n`+it.map((x,i)=>`${x[1]}: ${x[0].repeat(n[i])}`).join('\n'),r=rnd(0,2),S=n.reduce((a,b)=>a+b),mx=Math.max(...n),mn=Math.min(...n);
  if(r==0)return mk(`${h}\nJumlah seluruh buah yang terjual ... kg.`,S*u,[S,S*u+u,(S-1)*u,mx*u],`${S} gambar × ${u} kg = ${S*u} kg.`);
  if(r==1)return mk(`${h}\nSelisih penjualan buah terbanyak dan tersedikit ... kg.`,(mx-mn)*u,[mx-mn,(mx+mn)*u,mx*u,(mx-mn+1)*u],`Selisih ${mx} − ${mn} = ${mx-mn} gambar; × ${u} = ${(mx-mn)*u} kg.`);
  const w=it[n.indexOf(mx)][1];return mk(`${h}\nBuah yang paling banyak terjual adalah ...`,w,it.map(x=>x[1]).filter(x=>x!==w).concat(['semua sama banyak']),`Gambar terbanyak: ${w}.`)},
 t=>{const V=[5,6,7,8,9,10].slice(0,3+t),c=V.map(()=>rnd(2,9)),k=V[rnd(1,V.length-2)],r=V.reduce((s,v,i)=>s+(v>=k?c[i]:0),0),tot=c.reduce((a,b)=>a+b);
  return mk(`Tabel nilai ulangan:\n${V.map((v,i)=>`Nilai ${v}: ${c[i]} siswa`).join('\n')}\nBanyak siswa yang mendapat nilai ${k} atau lebih ...`,r,[tot,r+c[0],r-1,tot-c[V.indexOf(k)]],`Jumlahkan siswa dengan nilai ${k} ke atas: ${r} siswa.`)},
 t=>{const k=t==1?3:8,m=t==1?rnd(10,20):rnd(6,9)*10,x=[0,0,0,0].map(()=>m+rnd(-k,k)),sx=x.reduce((a,b)=>a+b),f=m*5-sx,r=rnd(0,2);
  if(r==0)return mk(`Rata-rata dari data ${shuf([...x,f]).join(', ')} adalah ...`,m,[m+1,m-1,m+k,f],`Jumlah data = ${m*5}; dibagi 5 = ${m}.`);
  if(r==1)return mk(`Rata-rata 5 nilai adalah ${m}. Empat nilai di antaranya: ${x.join(', ')}. Nilai kelima adalah ...`,f,[m,f+k,f-1,m*5],`Jumlah semua = 5 × ${m} = ${m*5}. Nilai kelima = ${m*5} − ${sx} = ${f}.`);
  const md=rnd(3,9),o=shuf([1,2,4,5,6,7,8,9,10].filter(v=>v!==md)).slice(0,4),L=shuf([md,md,md,...o]),s=[...L].sort((a,b)=>a-b),q=t<3;
  return mk(`Data: ${L.join(', ')}. ${q?'Modus':'Median'} data tersebut adalah ...`,q?md:s[3],q?[s[3],o[0],s[0]]:[md,s[2],s[4],s[6]],q?`Modus = nilai yang paling sering muncul: ${md}.`:`Urutkan: ${s.join(', ')}. Median = nilai tengah = ${s[3]}.`)}
]},
{n:'Penalaran',s:'Nalar',e:'🧠',c:'#d6409f',g:[
 t=>{const s=rnd(1,6),st=rnd(2,5),e=rnd(1,3),k=rnd(2,3),L=[s];
  for(let i=0;i<5;i++)L.push(t==1?L[i]+st:t==2?L[i]+st+e*i:(i%2?L[i]*k:L[i]+st));
  const a=L[4],ex=[`Selisih selalu ${st}.`,`Selisih tiap suku bertambah ${e}.`,`Berselang-seling: tambah ${st}, lalu kali ${k}.`][t-1];
  return mk(`Lengkapi pola bilangan: ${L.slice(0,4).join(', ')}, ...`,a,[a+1,a-1,a+st,L[3]+st+e],`${ex} Suku berikutnya: ${a}.`)},
 t=>{const E=['🍎','🍌','🍇','⭐','🔷','🐱'],s=shuf(E).slice(0,3),pt=pick([[0,1],[0,0,1],[0,1,2],[0,1,1,2],[0,0,1,1,2]].slice(0,t+2)),f=i=>s[pt[i%pt.length]],n=pt.length*2+rnd(1,2),a=[];
  for(let i=0;i<n;i++)a.push(f(i));const r=f(n);
  return mk(`Gambar apa yang muncul berikutnya?\n${a.join(' ')} ❓`,r,s.filter(x=>x!==r).concat(E.filter(x=>!s.includes(x))),'Temukan kelompok gambar yang berulang, lalu lanjutkan.')},
 t=>{const n=shuf(['Andi','Bella','Cindy','Dodi','Eka']).slice(0,t<3?3:4),st=shuf(n.slice(1).map((x,i)=>rnd(0,1)?`${n[i]} lebih tinggi dari ${x}`:`${x} lebih pendek dari ${n[i]}`)),
  i=t<3?pick([0,n.length-1]):pick([0,1,n.length-1]),lb=i==0?'paling tinggi':i==n.length-1?'paling pendek':'tertinggi kedua';
  return mk(`${st.join('. ')}.\nSiapa yang ${lb}?`,n[i],n.filter((_,j)=>j!==i).concat(['Tidak bisa ditentukan']).slice(0,3),`Urutan dari tertinggi: ${n.join(', ')}.`)},
 t=>{const x=rnd(3,9),k=rnd(2,4),T=x*(k+1),a=rnd(15,40),b=rnd(5,a-2),n=rnd(2,5),p=rnd(2,9)*1000,q=rnd(1,5)*500,rest=rnd(1,9)*1000,M=n*p+q+rest;
  const A=[()=>mk(`Rina membawa ${rp(M)}. Ia membeli ${n} buku @${rp(p)} dan sebuah pensil ${rp(q)}. Sisa uang Rina ...`,rp(rest),[rp(M-n*p),rp(M-q),rp(rest+q),rp(n*p+q)],`Belanja = ${n} × ${rp(p)} + ${rp(q)} = ${rp(n*p+q)}. Sisa = ${rp(M)} − ${rp(n*p+q)} = ${rp(rest)}.`),
   ()=>mk(`Umur ayah ${k} kali umur Dina. Jumlah umur mereka ${T} tahun. Umur Dina ... tahun.`,x,[x*k,Math.round(T/2),T-k,x+k],`${k+1} bagian = ${T}, 1 bagian = ${x}. Umur Dina ${x}.`),
   ()=>mk(`Jumlah dua bilangan ${a+b} dan selisihnya ${a-b}. Bilangan yang lebih besar adalah ...`,a,[b,a+b,a-b,a+2],`Besar = (jumlah + selisih) ÷ 2 = (${a+b} + ${a-b}) ÷ 2 = ${a}.`)];
  return A[rnd(0,Math.min(2,t))]()}
]}];
const used=new Set();
function Q(di,t){let q;for(let i=0;i<12;i++){q=pick(DM[di].g)(t);if(!used.has(q.q))break}used.add(q.q);return q}

/* ===== LABIRIN ===== */
const DIR={N:[0,-1,'S'],S:[0,1,'N'],E:[1,0,'W'],W:[-1,0,'E']};
function gen(w,h,loop){
  const c=[...Array(h)].map(()=>[...Array(w)].map(()=>({N:1,E:1,S:1,W:1,v:0}))),st=[[0,0]];c[0][0].v=1;
  while(st.length){
    const [x,y]=st[st.length-1],nb=Object.keys(DIR).filter(k=>{const t=c[y+DIR[k][1]]?.[x+DIR[k][0]];return t&&!t.v});
    if(!nb.length){st.pop();continue}
    const k=pick(nb),nx=x+DIR[k][0],ny=y+DIR[k][1];c[y][x][k]=0;c[ny][nx][DIR[k][2]]=0;c[ny][nx].v=1;st.push([nx,ny]);
  }
  let ex=Math.round(w*h*loop);
  while(ex>0){const x=rnd(0,w-1),y=rnd(0,h-1),k=pick(['E','S']),t=c[y+DIR[k][1]]?.[x+DIR[k][0]];if(t&&c[y][x][k]){c[y][x][k]=0;t[DIR[k][2]]=0;ex--}}
  return c;
}
const ek=(x,y,d)=>d==='N'?`${x},${y-1},S`:d==='W'?`${x-1},${y},E`:`${x},${y},${d}`;
const LV={
 1:{n:'Latihan',w:9,h:9,loop:.12,fog:0,tiers:[1,1,2],pass:9},
 2:{n:'TKA Standar',w:11,h:11,loop:.12,fog:3,tiers:[1,2,3],pass:10},
 3:{n:'Master TKA',w:13,h:13,loop:.12,fog:2,tiers:[2,3,3],pass:11}};
let lv,cells,doorG,gates,opened,passed,seen,px,py,hearts,score,rep,ses,cur,answered=false,busy=true,xr,xq;

function bfs(){const d=cells.map(r=>r.map(()=>-1));d[0][0]=0;const q=[[0,0]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const k in DIR){if(cells[y][x][k])continue;const nx=x+DIR[k][0],ny=y+DIR[k][1];if(d[ny][nx]<0){d[ny][nx]=d[y][x]+1;q.push([nx,ny])}}}return d}
function start(l){
  lv=LV[l];cells=gen(lv.w,lv.h,lv.loop);opened=new Set();doorG=new Map();gates=[];passed=[];seen=cells.map(r=>r.map(()=>0));
  /* 6 gerbang = 6 "irisan" labirin berdasarkan jarak dari start. Semua jalur ke finish PASTI melewati
     minimal satu pintu di tiap gerbang, jadi 6 kompetensi wajib dilalui. */
  const dist=bfs(),L=dist[lv.h-1][lv.w-1],order=shuf([0,1,2,3,4,5]);
  for(let k=1;k<=6;k++){
    const D=Math.round(L*k/7),g={dom:order[k-1],D,keys:[]};
    for(let y=0;y<lv.h;y++)for(let x=0;x<lv.w;x++)for(const d of ['E','S']){
      if(cells[y][x][d])continue;
      const a=dist[y][x],b=dist[y+DIR[d][1]][x+DIR[d][0]];
      if(Math.min(a,b)==D&&Math.abs(a-b)==1){const key=`${x},${y},${d}`;doorG.set(key,k-1);g.keys.push(key)}
    }
    gates.push(g);passed.push(false);
  }
  hearts=5;score=0;rep=DM.map(()=>({c:0,s:0}));used.clear();px=py=0;reveal();busy=false;hide();hud();draw();
}
function reveal(){const r=lv.fog;for(let y=0;y<lv.h;y++)for(let x=0;x<lv.w;x++)if(!r||Math.max(Math.abs(x-px),Math.abs(y-py))<=r)seen[y][x]=1}
function hud(){
  $('#hud').innerHTML=`<span>${'❤️'.repeat(Math.max(0,hearts))||'💔'}</span><span>🚪 ${passed.filter(Boolean).length}/6</span><span>⭐ ${score}</span>`;
  $('#comp').innerHTML=gates.map((g,i)=>{const d=DM[g.dom];return `<span class="chip${passed[i]?' on':''}" style="--c:${d.c}">${i+1}. ${d.e} ${d.s}${passed[i]?' ✓':''}</span>`}).join('');
}
function draw(){
  if(!lv)return;
  const wide=matchMedia('(min-width:860px)').matches,side=['h1','#hud','#comp','#pad','.hint'].reduce((a,s)=>a+(wide&&s!=='h1'?0:$(s).offsetHeight+8),0),
  avail=Math.min(wrap.clientWidth,Math.max(220,innerHeight-side-36),wide?720:620),cs=Math.floor(avail/lv.w),S=cs*lv.w,Hh=cs*lv.h,r=devicePixelRatio||1;
  cv.width=S*r;cv.height=Hh*r;cv.style.width=S+'px';cv.style.height=Hh+'px';
  const g=cv.getContext('2d');g.setTransform(r,0,0,r,0,0);
  const css=getComputedStyle(document.documentElement),col=n=>css.getPropertyValue(n).trim();
  g.fillStyle=col('--floor');g.fillRect(0,0,S,Hh);g.fillStyle='#22a06b66';g.fillRect(0,0,cs,cs);
  g.strokeStyle=col('--wall');g.lineWidth=Math.max(3,cs*.08);g.lineCap='round';g.beginPath();
  for(let y=0;y<lv.h;y++)for(let x=0;x<lv.w;x++){
    const c=cells[y][x],X=x*cs,Y=y*cs;
    if(c.N){g.moveTo(X,Y);g.lineTo(X+cs,Y)}if(c.S){g.moveTo(X,Y+cs);g.lineTo(X+cs,Y+cs)}
    if(c.W){g.moveTo(X,Y);g.lineTo(X,Y+cs)}if(c.E){g.moveTo(X+cs,Y);g.lineTo(X+cs,Y+cs)}
  }
  g.stroke();g.textAlign='center';g.textBaseline='middle';
  for(const [k,gi] of doorG){
    const [x,y,d]=k.split(','),X=+x*cs,Y=+y*cs,op=opened.has(k),dm=DM[gates[gi].dom];
    let x1,y1,x2,y2;
    if(d==='E'){x1=x2=X+cs;y1=Y+cs*.1;y2=Y+cs*.9}else{y1=y2=Y+cs;x1=X+cs*.1;x2=X+cs*.9}
    g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=op?col('--ok'):dm.c;g.lineWidth=op?3:cs*.22;g.setLineDash(op?[4,4]:[]);g.stroke();g.setLineDash([]);
    if(!op){g.font=`${cs*.36}px system-ui,"Segoe UI Emoji",sans-serif`;g.fillText(dm.e,(x1+x2)/2,(y1+y2)/2)}
  }
  g.fillStyle='#141b33';g.globalAlpha=.93;
  for(let y=0;y<lv.h;y++)for(let x=0;x<lv.w;x++)if(!seen[y][x])g.fillRect(x*cs,y*cs,cs,cs);
  g.globalAlpha=1;
  const badge=(cx,cy,f,s,e)=>{g.save();g.shadowColor='#0006';g.shadowBlur=cs*.15;g.beginPath();g.arc(cx,cy,cs*.4,0,7);g.fillStyle=f;g.fill();g.restore();g.lineWidth=Math.max(2,cs*.06);g.strokeStyle=s;g.stroke();g.font=`${cs*.55}px system-ui,"Segoe UI Emoji",sans-serif`;g.fillStyle='#000';g.fillText(e,cx,cy+cs*.03)};
  badge(S-cs/2,Hh-cs/2,'#ffffff','#e5484d','🏁');badge(px*cs+cs/2,py*cs+cs/2,'#ffd54a','#7a4b00','🧒');
}
addEventListener('resize',draw);

/* ===== ALUR GAME ===== */
function show(h){ovc.innerHTML=h;ov.classList.remove('off')}
function hide(){ov.classList.add('off')}
function move(d){
  if(busy||!lv||cells[py][px][d])return;
  const nx=px+DIR[d][0],ny=py+DIR[d][1],k=ek(px,py,d);
  if(doorG.has(k)&&!opened.has(k)){ses={m:'d',k,gi:doorG.get(k),step:0,nx,ny};nextQ();return}
  enter(nx,ny);
}
function enter(nx,ny){px=nx;py=ny;reveal();draw();if(px==lv.w-1&&py==lv.h-1)startExam()}
function nextQ(){
  busy=true;answered=false;let di,t;
  if(ses.m=='d'){di=gates[ses.gi].dom;t=lv.tiers[ses.step]}else{[di,t]=xq[ses.i]}
  cur=Q(di,t);cur.di=di;const d=DM[di],
  head=ses.m=='d'?`Pintu ${d.e} ${d.n} · ${'●'.repeat(ses.step)}${'○'.repeat(3-ses.step)} (harus 3 benar beruntun)`:`Ujian Akhir · soal ${ses.i+1}/12 · ${d.e} ${d.n}`;
  show(`<div class="tag" style="color:${d.c}">${head}</div><div class="q">${cur.q}</div><div class="opts">${cur.opts.map((o,i)=>`<button data-i="${i}"><b>${'ABCD'[i]}.</b> ${o}</button>`).join('')}</div><div id="fb"></div>`);
}
function answer(i){
  if(answered)return;answered=true;
  const bs=ovc.querySelectorAll('.opts button'),ok=i===cur.a,r=rep[cur.di];
  bs[cur.a].classList.add('ok');if(!ok)bs[i].classList.add('bad');ok?r.c++:r.s++;
  let msg=ok?'✅ <b>Benar!</b>':`❌ <b>Belum tepat.</b> Jawaban benar: <b>${cur.opts[cur.a]}</b>.`,btn,fn;
  if(ses.m=='x'){
    if(ok)xr[cur.di]++;ses.i++;btn=ses.i<12?'Soal berikutnya':'Lihat hasil ujian';fn=ses.i<12?nextQ:rapor;
  }else if(ok){
    ses.step++;score+=10;
    if(ses.step<3){btn='Soal berikutnya';fn=nextQ;msg+=` Tinggal ${3-ses.step} soal lagi.`}
    else{
      opened.add(ses.k);const g=ses.gi;
      if(!passed[g]){passed[g]=true;hearts=Math.min(5,hearts+1);score+=30;msg+=` 🔓 Pintu terbuka! Gerbang <b>${DM[gates[g].dom].n}</b> lulus (+1 nyawa).`}else msg+=' 🔓 Pintu terbuka!';
      btn='Lanjut';const {nx,ny}=ses;fn=()=>{hide();busy=false;enter(nx,ny)};
    }
  }else{
    hearts--;msg+=' Nyawa −1. Pintu mengulang dari soal 1.';ses=null;btn=hearts>0?'Tutup':'Main lagi';
    fn=()=>{if(hearts>0){hide();busy=false}else menu('Nyawa habis 💔')};
  }
  hud();draw();
  $('#fb').innerHTML=`${msg}<br>💡 ${cur.exp}<button class="go" id="nx">${btn}</button>`;$('#nx').onclick=fn;
}
function startExam(){
  busy=true;xr=DM.map(()=>0);xq=[];
  for(let r=1;r<=2;r++)shuf([0,1,2,3,4,5]).forEach(d=>xq.push([d,lv.tiers[r]]));
  ses={m:'x',i:0};
  show(`<h2>🏁 Gerbang Ujian Akhir</h2><p>Simulasi TKA: <b>12 soal</b> (2 soal tiap kompetensi). Kamu lulus jika benar minimal <b>${lv.pass}/12</b>. Jika belum lulus, kamu mengulang dengan soal baru.</p><button class="go" id="nx">Mulai ujian</button>`);
  $('#nx').onclick=nextQ;
}
function rapor(){
  const tot=xr.reduce((a,b)=>a+b),ok=tot>=lv.pass;
  const rows=DM.map((d,i)=>{const r=rep[i];return `<div class="rw"><span>${d.e} ${d.n}</span><span>Ujian ${xr[i]}/2 · Labirin ${r.c}/${r.c+r.s}</span></div>`}).join('');
  const weak=DM.filter((d,i)=>xr[i]<2).map(d=>d.n);
  if(!ok){hearts--;hud()}
  const over=!ok&&hearts<=0;
  show(`<h2>${ok?'🎓 LULUS Simulasi TKA!':'📋 Belum lulus'}</h2><p style="text-align:center;font-size:1.3rem;margin:4px"><b>${tot}/12</b> benar (minimal ${lv.pass})</p>${rows}
  <p>${weak.length?`Perlu diulang: <b>${weak.join(', ')}</b>.`:'Semua kompetensi aman. Hebat!'}${ok?'':' Nyawa −1.'}</p>
  ${ok?lvBtns():`<button class="go" id="nx">${over?'Main lagi':'Ulangi ujian (soal baru)'}</button>`}`);
  if(!ok)$('#nx').onclick=()=>over?menu('Nyawa habis 💔'):startExam();
}
const lvBtns=()=>`<div class="lv">${[1,2,3].map(l=>`<button class="go" data-l="${l}">${['🟢','🟡','🔴'][l-1]} ${LV[l].n} (${LV[l].w}×${LV[l].h}${LV[l].fog?', berkabut':''} · lulus ${LV[l].pass}/12)</button>`).join('')}</div>`;
function menu(t){busy=true;show(`<h2>${t||'🚪 Labirin Penguasa TKA'}</h2>
  <p>Cari jalan dari 🧒 ke 🏁. Labirin punya <b>6 gerbang kompetensi</b> (bilangan, pecahan & perbandingan, geometri, pengukuran, data, penalaran). <b>Semua jalur</b> melewati pintu di tiap gerbang.</p>
  <p>Tiap pintu: <b>3 soal benar beruntun</b>. Salah = nyawa −1 dan ulang dari soal 1. Di finish ada <b>ujian akhir 12 soal</b>.</p>${lvBtns()}`)}
ovc.addEventListener('click',e=>{const b=e.target.closest('.opts button');if(b)answer(+b.dataset.i);const l=e.target.closest('[data-l]');if(l)start(+l.dataset.l)});
document.querySelectorAll('#pad button').forEach(b=>b.addEventListener('click',()=>move(b.dataset.d)));
addEventListener('keydown',e=>{
  const m={ArrowUp:'N',w:'N',ArrowDown:'S',s:'S',ArrowLeft:'W',a:'W',ArrowRight:'E',d:'E'}[e.key];
  if(m){e.preventDefault();move(m);return}
  if(!ov.classList.contains('off')&&!answered&&/^[1-4]$/.test(e.key)&&ovc.querySelector('.opts'))answer(+e.key-1);
  else if(e.key==='Enter'&&$('#nx'))$('#nx').click();
});
let t0;cv.addEventListener('touchstart',e=>{t0=e.touches[0]},{passive:true});
cv.addEventListener('touchend',e=>{if(!t0)return;const t=e.changedTouches[0],dx=t.clientX-t0.clientX,dy=t.clientY-t0.clientY;t0=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?'E':'W'):(dy>0?'S':'N'))});
menu();
