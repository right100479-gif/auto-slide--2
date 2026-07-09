const App=(()=>{
  const $=id=>document.getElementById(id);
  let selectedImages=[];

  function blankSlide(data={}){
    return Matcher.prepare({
      song:data.song||"",
      part:data.part||"",
      chorus:!!data.chorus,
      lyrics:data.lyrics||"",
      image:data.image||""
    });
  }

  function parseConti(){
    const lines=$("contiText").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const result=[];
    for(const line of lines){
      const m=line.match(/^(.*?)\s*[\(\[]?\s*(\d+)\s*[\)\]]?\s*$/);
      const title=(m?m[1]:line).replace(/^\d+[\.\-\s]+/,"").trim();
      const count=m?parseInt(m[2],10):1;
      result.push({title,count:Math.max(1,count||1)});
    }
    return result;
  }

  async function buildFromContiAndImages(){
    const conti=parseConti();
    const old=AutoSlideData.slides||[];
    const slides=[];
    let globalIndex=0;
    conti.forEach(song=>{
      for(let i=0;i<song.count;i++){
        const prev=old[globalIndex]||{};
        slides.push(blankSlide({
          song:song.title,
          part:prev.part || `${i+1}절`,
          chorus:prev.chorus || false,
          lyrics:prev.lyrics || "",
          image:selectedImages[globalIndex]?.dataUrl || prev.image || ""
        }));
        globalIndex++;
      }
    });
    AutoSlideData.conti=$("contiText").value;
    AutoSlideData.slides=slides;
    renderEditor();
    refreshSongSelect();
    alert(`${slides.length}개의 슬라이드를 만들었습니다.`);
  }

  function addSlide(){
    AutoSlideData.slides.push(blankSlide());
    renderEditor();
    refreshSongSelect();
  }

  function renderEditor(){
    const box=$("slideEditor");
    box.innerHTML="";
    if(!AutoSlideData.slides.length){
      box.innerHTML='<p class="hint">아직 슬라이드가 없습니다. 위에서 콘티와 이미지를 넣고 “콘티 + 이미지로 슬라이드 만들기”를 눌러주세요.</p>';
      refreshSongSelect();
      return;
    }
    AutoSlideData.slides.forEach((s,i)=>{
      const d=document.createElement("div");
      d.className="slide-card";
      d.innerHTML=`
        <div class="slide-num">${i+1}</div>
        <div>
          <div class="thumb-box">${s.image?`<img src="${s.image}" alt="슬라이드 ${i+1}">`:"이미지 없음"}</div>
          <div class="image-tools" style="margin-top:8px">
            <label class="secondary small file-label">이미지 변경<input type="file" accept="image/*"></label>
            <button class="secondary small" type="button" data-role="removeImage">이미지 삭제</button>
          </div>
        </div>
        <div class="edit-fields">
          <div class="edit-row">
            <input data-role="song" placeholder="곡명" value="${esc(s.song)}">
            <input data-role="part" placeholder="절수 예: 1절" value="${esc(s.part)}">
            <label><input data-role="chorus" type="checkbox" ${s.chorus?"checked":""}> 후렴</label>
            <button class="secondary small" type="button" data-role="delete">삭제</button>
          </div>
          <textarea data-role="lyrics" placeholder="이 이미지 슬라이드에 맞는 가사를 입력하세요.">${esc(s.lyrics)}</textarea>
        </div>`;
      const song=d.querySelector('[data-role="song"]');
      const part=d.querySelector('[data-role="part"]');
      const chorus=d.querySelector('[data-role="chorus"]');
      const lyrics=d.querySelector('[data-role="lyrics"]');
      const del=d.querySelector('[data-role="delete"]');
      const removeImg=d.querySelector('[data-role="removeImage"]');
      const imageInput=d.querySelector('input[type="file"]');
      song.oninput=()=>{s.song=song.value; refreshSongSelect();};
      part.oninput=()=>{s.part=part.value};
      chorus.onchange=()=>{s.chorus=chorus.checked};
      lyrics.oninput=()=>{s.lyrics=lyrics.value; Matcher.prepare(s)};
      del.onclick=()=>{AutoSlideData.slides.splice(i,1);renderEditor();refreshSongSelect();};
      removeImg.onclick=()=>{s.image="";renderEditor();};
      imageInput.onchange=async e=>{const f=e.target.files[0];if(!f)return;s.image=await fileToDataURL(f);renderEditor();};
      box.appendChild(d);
    });
    refreshSongSelect();
  }

  function esc(v){return String(v||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
  function fileToDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}

  async function importBulkImages(e){
    const files=Array.from(e.target.files||[]);
    if(!files.length)return;
    files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
    selectedImages=[];
    for(const f of files){selectedImages.push({name:f.name,dataUrl:await fileToDataURL(f)});}
    $("imageStatus").textContent=`${selectedImages.length}개 이미지 선택됨`;
    renderImagePreview();
    e.target.value="";
  }

  function renderImagePreview(){
    const grid=$("imagePreviewGrid");
    grid.innerHTML="";
    selectedImages.slice(0,24).forEach((img,i)=>{
      const d=document.createElement("div");
      d.className="preview-thumb";
      d.innerHTML=`<img src="${img.dataUrl}" alt="${esc(img.name)}"><span>${i+1}</span>`;
      grid.appendChild(d);
    });
    if(selectedImages.length>24){
      const d=document.createElement("div");
      d.className="preview-thumb";
      d.textContent=`+ ${selectedImages.length-24}개 더 있음`;
      grid.appendChild(d);
    }
  }

  function refreshSongSelect(){
    const sel=$("lyricSongSelect"); if(!sel)return;
    const current=sel.value;
    const songs=[];
    AutoSlideData.slides.forEach(s=>{if(s.song && !songs.includes(s.song))songs.push(s.song);});
    sel.innerHTML="";
    if(!songs.length){sel.innerHTML='<option value="">슬라이드를 먼저 만들어 주세요</option>';return;}
    songs.forEach(song=>{
      const opt=document.createElement("option");
      opt.value=song; opt.textContent=`${song} (${AutoSlideData.slides.filter(s=>s.song===song).length}장)`;
      sel.appendChild(opt);
    });
    if(songs.includes(current))sel.value=current;
  }

  function openNaverLyrics(){
    const song=$("lyricSongSelect").value || parseConti()[0]?.title || "찬양";
    window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(song+" 가사")}`,'_blank');
  }

  function cleanLyricLines(text){
    return text.split(/\n+/)
      .map(x=>x.trim())
      .filter(Boolean)
      .filter(x=>!/^\[?(verse|chorus|bridge|intro|outro|간주|전주|후주)/i.test(x))
      .filter(x=>!/^출처|^작사|^작곡|^앨범|^가수/.test(x));
  }

  function distributeLyrics(){
    const song=$("lyricSongSelect").value;
    if(!song){alert("먼저 슬라이드를 만들고 곡을 선택해 주세요.");return;}
    const lines=cleanLyricLines($("bulkLyricsText").value);
    if(!lines.length){alert("붙여넣은 가사가 없습니다.");return;}
    const per=Math.max(1,parseInt($("linesPerSlide").value,10)||2);
    const targets=AutoSlideData.slides.map((s,i)=>({s,i})).filter(x=>x.s.song===song);
    if(!targets.length){alert("선택한 곡의 슬라이드가 없습니다.");return;}
    targets.forEach((item,idx)=>{
      const chunk=lines.slice(idx*per, idx*per+per);
      if(chunk.length){
        item.s.lyrics=chunk.join("\n");
        if($("markChorusByText").checked && chunk.join(" ").includes("후렴")) item.s.chorus=true;
        Matcher.prepare(item.s);
      }
    });
    renderEditor();
    alert(`${song} 가사를 ${per}줄씩 ${targets.length}개 슬라이드에 입력했습니다.`);
  }

  function startLive(){
    if(!AutoSlideData.slides.length)buildFromContiAndImages();
    AutoSlideData.slides.forEach(Matcher.prepare);
    $("setupScreen").classList.add("hidden");
    $("liveScreen").classList.remove("hidden");
    goToSlide(0);
  }
  function backSetup(){SpeechEngine.stop();$("liveScreen").classList.add("hidden");$("setupScreen").classList.remove("hidden");}
  function goToSlide(i){if(i<0||i>=AutoSlideData.slides.length)return;AutoSlideData.currentIndex=i;SpeechEngine.reset();setProgress(0);renderLive();Projector.update();}
  function nextSlide(){if(AutoSlideData.currentIndex<AutoSlideData.slides.length-1)goToSlide(AutoSlideData.currentIndex+1);}
  function prevSlide(){if(AutoSlideData.currentIndex>0)goToSlide(AutoSlideData.currentIndex-1);}
  function renderLive(){const s=AutoSlideData.slides[AutoSlideData.currentIndex];const img=$("liveImage");const ly=$("liveLyrics");if(s?.image){img.src=s.image;img.classList.remove("hidden");ly.classList.add("hidden");}else{img.src="";img.classList.add("hidden");ly.classList.remove("hidden");ly.textContent=s?.lyrics||"가사를 입력하세요";}$("liveMeta").textContent=`${AutoSlideData.currentIndex+1} / ${AutoSlideData.slides.length} · ${s?.song||""} ${s?.part||""}`;$("slideCount").textContent=`${AutoSlideData.currentIndex+1} / ${AutoSlideData.slides.length}`;$("songTitle").textContent=s?.song||"-";renderList();}
  function renderList(){const list=$("slideList");list.innerHTML="";AutoSlideData.slides.forEach((s,i)=>{const d=document.createElement("div");d.className="list-item"+(i===AutoSlideData.currentIndex?" active":"");d.textContent=`${i+1}. ${s.song||"제목 없음"} ${s.part||""}${s.chorus?" [후렴]":""}${s.image?" 🖼️":""}`;d.onclick=()=>goToSlide(i);list.appendChild(d);});}
  function setProgress(v){AutoSlideData.progress=v;$("progressText").textContent=v+"%";$("progressBar").style.width=v+"%";}
  function setMicState(on){$("micState").textContent=on?"ON":"OFF";$("micState").style.color=on?"#10b981":"#ef4444";$("btnMic").textContent=on?"음성 인식 중지":"음성 인식 시작";}
  function showSpeech(t){$("speechPreview").textContent=t||"...";}
  function applyProject(p){$("contiText").value=p.conti||"";AutoSlideData.slides=(p.slides||[]).map(blankSlide);renderEditor();refreshSongSelect();}
  function init(){renderEditor();renderImagePreview();refreshSongSelect();$("btnBuild").onclick=buildFromContiAndImages;$("btnAddSlide").onclick=addSlide;$("bulkImageInput").onchange=importBulkImages;$("btnOpenNaver").onclick=openNaverLyrics;$("btnDistributeLyrics").onclick=distributeLyrics;$("btnClearLyricsPaste").onclick=()=>$("bulkLyricsText").value="";$("btnStart").onclick=startLive;$("btnBack").onclick=backSetup;$("btnPrev").onclick=prevSlide;$("btnNext").onclick=nextSlide;$("btnMic").onclick=()=>SpeechEngine.start();$("btnSave").onclick=Storage.saveLocal;$("btnLoad").onclick=()=>{const p=Storage.loadLocal();if(p)applyProject(p)};$("btnExport").onclick=Storage.download;$("btnProjector").onclick=Projector.open;$("importFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{applyProject(await Storage.readFile(f));alert("가져왔습니다.");}catch{alert("파일을 읽을 수 없습니다.");}e.target.value="";};$("jumpNumber").addEventListener("keydown",e=>{if(e.key==="Enter"){const n=parseInt(e.target.value,10);if(n>=1&&n<=AutoSlideData.slides.length)goToSlide(n-1);e.target.value="";}});}
  return{init,goToSlide,nextSlide,prevSlide,setProgress,setMicState,showSpeech};
})();
document.addEventListener("DOMContentLoaded",App.init);
