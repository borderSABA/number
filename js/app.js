(() => {
  const $ = (s) => document.querySelector(s);
  const core = window.SudokuCore;
  const hard = window.HardPuzzles;
  const SAVE_KEY='number.github.save.v1';
  const SETTINGS_KEY='number.github.settings.v1';
  const STATS_KEY='number.github.stats.v1';

  const state={
    level:1, puzzle:null, solution:null, board:null, notes:null, given:null,
    selected:-1, memo:false, undo:[], redo:[], elapsed:0, running:false,
    difficulty:null, source:null, errors:new Set(), paused:false,
    settings:{conflicts:true,sameNumber:true,autoMemo:true}
  };

  const levelMeta={
    1:['入門','基本のシングル中心。'], 2:['初級','候補を見れば進みやすい問題。'],
    3:['初中級','行・列・ブロックを横断して考える。'], 4:['中級','隠れシングルや候補整理が増える。'],
    5:['中上級','ロック候補などを要求しやすい。'], 6:['上級','ペア系を含む難しい盤面。'],
    7:['超上級','高度な候補除去が必要になりやすい。'], 8:['極難','生成問題の最上位帯。難易度99まで。'],
    9:['難易度100','AI Escargot / Platinum Blonde / Golden Nuggetから出題。'],
    10:['世界最難関','Arto Inkala 2012「World’s Hardest」を固定出題。']
  };

  function init(){
    loadSettings(); buildLevels(); buildPad(); bind(); refreshContinue(); showHome();
  }

  function buildLevels(){
    const grid=$('#levelGrid'); grid.innerHTML='';
    for(let lv=1;lv<=10;lv++){
      const b=document.createElement('button'); b.className='level-button'+(lv===9?' extreme':'')+(lv===10?' world':'');
      b.dataset.level=lv; b.innerHTML=`Lv${lv}<small>${levelMeta[lv][0]}</small>`;
      b.addEventListener('click',()=>selectLevel(lv)); grid.appendChild(b);
    }
    selectLevel(state.level);
  }
  function selectLevel(lv){ state.level=lv; document.querySelectorAll('.level-button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.level)===lv)); $('#levelDescription').textContent=levelMeta[lv][1]; }

  function buildPad(){
    const pad=$('#numberPad'); pad.innerHTML='';
    for(let n=1;n<=9;n++){
      const b=document.createElement('button'); b.className='num-button'; b.textContent=n; b.dataset.num=n;
      b.addEventListener('click',()=>inputNumber(n)); pad.appendChild(b);
    }
  }

  function bind(){
    $('#newGameBtn').addEventListener('click',()=>startNew(state.level));
    $('#continueBtn').addEventListener('click',continueSaved);
    $('#memoBtn').addEventListener('click',()=>{state.memo=!state.memo; updateMemoButton();});
    $('#autoNotesBtn').addEventListener('click',fillCandidates);
    $('#eraseBtn').addEventListener('click',eraseSelected);
    $('#undoBtn').addEventListener('click',undo); $('#redoBtn').addEventListener('click',redo);
    $('#checkBtn').addEventListener('click',checkAnswer);
    $('#saveQuitBtn').addEventListener('click',()=>{saveGame();showHome();});
    $('#pauseBtn').addEventListener('click',pauseGame);
    $('#resumeBtn').addEventListener('click',resumeGame);
    $('#pauseHomeBtn').addEventListener('click',()=>{saveGame();hide('#pauseOverlay');showHome();});
    $('#nextGameBtn').addEventListener('click',()=>{hide('#resultOverlay');startNew(state.level);});
    $('#resultHomeBtn').addEventListener('click',()=>{hide('#resultOverlay');showHome();});
    $('#settingsBtn').addEventListener('click',openSettings); $('#closeSettingsBtn').addEventListener('click',closeSettings);
    $('#conflictSetting').addEventListener('change',saveSettingsFromUI);
    $('#sameNumberSetting').addEventListener('change',saveSettingsFromUI);
    $('#autoMemoSetting').addEventListener('change',saveSettingsFromUI);
    window.addEventListener('beforeunload',()=>{if(state.board) saveGame();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden && state.running) pauseGame(true);});
    document.addEventListener('keydown',handleKey);
    setInterval(()=>{if(state.running&&!state.paused){state.elapsed++;renderTimer();if(state.elapsed%15===0)saveGame();}},1000);
  }

  async function startNew(level){
    state.level=level; showLoading();
    await new Promise(r=>setTimeout(r,40));
    let puzzle,solution,difficulty,source=null;
    try{
      if(level<=8){
        $('#loadingText').textContent='唯一解と難易度を確認しています…';
        const g=core.generatePuzzle(level,(a,m)=>{ if(a%3===0) $('#loadingText').textContent=`候補を選別中… ${a}/${m}`; });
        puzzle=g.puzzle; solution=g.solution; difficulty=g.analysis.score;
      } else if(level===9){
        const item=hard.EXTREME_100[Math.floor(Math.random()*hard.EXTREME_100.length)];
        puzzle=core.parsePuzzle(item.puzzle); solution=core.solveOne(puzzle); difficulty=100; source=`${item.name} — ${item.author} (${item.year})`;
      } else {
        const item=hard.WORLD_HARDEST;
        puzzle=core.parsePuzzle(item.puzzle); solution=core.solveOne(puzzle); difficulty='WORLD'; source=`${item.name} — ${item.author} (${item.year})`;
      }
      if(!solution || core.countSolutions(puzzle,2)!==1) throw new Error('唯一解検証に失敗しました');
      loadPuzzle({level,puzzle,solution,difficulty,source,elapsed:0,board:puzzle.slice(),notes:Array.from({length:81},()=>[])});
      localStorage.removeItem(SAVE_KEY); hide('#loadingOverlay'); showGame();
    }catch(e){ hide('#loadingOverlay'); toast(`生成エラー: ${e.message}`); }
  }

  function loadPuzzle(data){
    Object.assign(state,{level:data.level,puzzle:data.puzzle.slice(),solution:data.solution.slice(),board:data.board.slice(),difficulty:data.difficulty,source:data.source||null,elapsed:data.elapsed||0});
    state.notes=(data.notes||Array.from({length:81},()=>[])).map(a=>new Set(a));
    state.given=state.puzzle.map(Boolean); state.selected=-1; state.memo=false; state.undo=[]; state.redo=[]; state.errors=new Set(); state.paused=false;
    updateMemoButton(); renderTimer();
  }

  function renderBoard(){
    const boardEl=$('#board'); boardEl.innerHTML='';
    for(let i=0;i<81;i++){
      const cell=document.createElement('button'); cell.type='button'; cell.className='cell'; cell.dataset.i=i;
      const r=Math.floor(i/9),c=i%9; if(c===2||c===5)cell.classList.add('box-right'); if(r===2||r===5)cell.classList.add('box-bottom');
      cell.addEventListener('click',()=>{state.selected=i;state.errors.delete(i);renderBoard();}); boardEl.appendChild(cell);
    }
    paintBoard();
  }

  function paintBoard(){
    if(!state.board) return;
    const selectedVal=state.selected>=0?state.board[state.selected]:0;
    document.querySelectorAll('.cell').forEach((cell,i)=>{
      const r=Math.floor(i/9),c=i%9, sr=state.selected>=0?Math.floor(state.selected/9):-1, sc=state.selected%9;
      cell.classList.remove('peer','same','selected','given','user','error','conflict'); cell.innerHTML='';
      if(state.selected>=0 && (r===sr||c===sc||core.boxIndex(r,c)===core.boxIndex(sr,sc))) cell.classList.add('peer');
      if(state.settings.sameNumber && selectedVal && state.board[i]===selectedVal) cell.classList.add('same');
      if(i===state.selected) cell.classList.add('selected');
      if(state.given[i]) cell.classList.add('given'); else cell.classList.add('user');
      if(state.errors.has(i)) cell.classList.add('error');
      if(state.settings.conflicts && !state.given[i] && hasConflict(i)) cell.classList.add('conflict');
      if(state.board[i]) cell.textContent=state.board[i];
      else if(state.notes[i] && state.notes[i].size){
        const wrap=document.createElement('div');wrap.className='notes';
        for(let n=1;n<=9;n++){const s=document.createElement('span');s.className='note';const has=state.notes[i].has(n);s.textContent=has?n:'';if(has && state.settings.sameNumber && selectedVal===n)s.classList.add('match');wrap.appendChild(s);} cell.appendChild(wrap);
      }
    });
    updatePadState();
  }

  function hasConflict(i){
    const v=state.board[i]; if(!v)return false; const r=Math.floor(i/9),c=i%9,b=core.boxIndex(r,c);
    for(let j=0;j<81;j++){ if(j===i||state.board[j]!==v)continue; const rr=Math.floor(j/9),cc=j%9; if(rr===r||cc===c||core.boxIndex(rr,cc)===b)return true; }
    return false;
  }

  function snapshot(){return {board:state.board.slice(),notes:state.notes.map(s=>[...s])};}
  function restore(s){state.board=s.board.slice();state.notes=s.notes.map(a=>new Set(a));state.errors.clear();paintBoard();saveGame();}
  function pushUndo(){state.undo.push(snapshot()); if(state.undo.length>200)state.undo.shift(); state.redo=[];}

  function inputNumber(n){
    const i=state.selected; if(i<0||state.given[i])return;
    pushUndo(); state.errors.delete(i);
    if(state.memo){
      if(state.board[i]) state.board[i]=0;
      if(state.notes[i].has(n))state.notes[i].delete(n);else state.notes[i].add(n);
    }else{
      state.board[i]=state.board[i]===n?0:n; state.notes[i].clear(); if(state.board[i]&&state.settings.autoMemo)removePeerNote(i,n);
    }
    paintBoard();saveGame();
  }
  function removePeerNote(i,n){const r=Math.floor(i/9),c=i%9,b=core.boxIndex(r,c);for(let j=0;j<81;j++){const rr=Math.floor(j/9),cc=j%9;if(rr===r||cc===c||core.boxIndex(rr,cc)===b)state.notes[j].delete(n);}}

  function fillCandidates(){
    if(!state.board)return;
    const masks=core.masksFor(state.board);
    if(!masks){toast('重複があるため候補入力できません');return;}
    pushUndo();
    let filled=0, zero=0;
    for(let i=0;i<81;i++){
      if(state.board[i]){state.notes[i].clear();continue;}
      const mask=core.candidateMask(state.board,i,masks);
      const next=new Set();
      for(let n=1;n<=9;n++)if(mask&(1<<(n-1)))next.add(n);
      state.notes[i]=next;
      if(next.size)filled++;else zero++;
    }
    state.errors.clear();
    paintBoard();saveGame();
    toast(zero?`候補を入力しました（候補なし ${zero}マス）`:`${filled}マスに候補を入力しました`);
  }

  function eraseSelected(){const i=state.selected;if(i<0||state.given[i])return;pushUndo();state.board[i]=0;state.notes[i].clear();state.errors.delete(i);paintBoard();saveGame();}
  function undo(){if(!state.undo.length)return;state.redo.push(snapshot());restore(state.undo.pop());}
  function redo(){if(!state.redo.length)return;state.undo.push(snapshot());restore(state.redo.pop());}
  function updateMemoButton(){const b=$('#memoBtn');b.classList.toggle('active',state.memo);b.querySelector('span').textContent=`メモ ${state.memo?'ON':'OFF'}`;}
  function updatePadState(){for(let n=1;n<=9;n++){const count=state.board?state.board.filter(v=>v===n).length:0;document.querySelector(`.num-button[data-num="${n}"]`)?.classList.toggle('exhausted',count>=9);}}

  function checkAnswer(){
    const empty=state.board.some(v=>!v); if(empty){toast('まだ空いているマスがあります');return;}
    state.errors.clear(); for(let i=0;i<81;i++)if(state.board[i]!==state.solution[i])state.errors.add(i);
    if(state.errors.size){paintBoard();toast(`間違いが ${state.errors.size} マスあります`);return;}
    state.running=false; localStorage.removeItem(SAVE_KEY); recordClear();
    $('#resultLevel').textContent=`Lv${state.level}`; $('#resultDifficulty').textContent=state.level===10?'WORLD':state.difficulty; $('#resultTime').textContent=formatTime(state.elapsed); show('#resultOverlay');
  }

  function recordClear(){
    let stats=[];try{stats=JSON.parse(localStorage.getItem(STATS_KEY)||'[]')}catch{}
    stats.push({at:new Date().toISOString(),level:state.level,difficulty:state.difficulty,time:state.elapsed,source:state.source||null});
    localStorage.setItem(STATS_KEY,JSON.stringify(stats.slice(-200)));
  }

  function showGame(){
    $('#homeScreen').classList.remove('active');$('#gameScreen').classList.add('active');
    $('#levelLabel').textContent=state.level;$('#difficultyLabel').textContent=state.level===10?'WORLD':state.difficulty;
    if(state.source){$('#sourceBadge').textContent=state.source;show('#sourceBadge');}else hide('#sourceBadge');
    renderBoard();renderTimer();state.running=true;state.paused=false;
  }
  function showHome(){state.running=false;$('#gameScreen').classList.remove('active');$('#homeScreen').classList.add('active');selectLevel(state.level);refreshContinue();}

  function pauseGame(silent=false){if(!state.board||!$('#gameScreen').classList.contains('active'))return;state.paused=true;state.running=false;saveGame();show('#pauseOverlay');if(!silent)toast('一時停止しました');}
  function resumeGame(){state.paused=false;state.running=true;hide('#pauseOverlay');}

  function saveGame(){
    if(!state.board||!state.solution)return;
    const data={level:state.level,puzzle:state.puzzle,solution:state.solution,board:state.board,notes:state.notes.map(s=>[...s]),elapsed:state.elapsed,difficulty:state.difficulty,source:state.source,savedAt:Date.now()};
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));refreshContinue();
  }
  function continueSaved(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY));if(!d)throw 0;loadPuzzle(d);showGame();}catch{toast('保存データを読み込めませんでした');}}
  function refreshContinue(){let ok=false;try{const d=JSON.parse(localStorage.getItem(SAVE_KEY));ok=!!(d&&d.board&&d.solution);}catch{}$('#continueBtn').classList.toggle('hidden',!ok);}

  function loadSettings(){try{Object.assign(state.settings,JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}catch{}}
  function openSettings(){$('#conflictSetting').checked=state.settings.conflicts;$('#sameNumberSetting').checked=state.settings.sameNumber;$('#autoMemoSetting').checked=state.settings.autoMemo;show('#settingsOverlay');}
  function saveSettingsFromUI(){state.settings.conflicts=$('#conflictSetting').checked;state.settings.sameNumber=$('#sameNumberSetting').checked;state.settings.autoMemo=$('#autoMemoSetting').checked;localStorage.setItem(SETTINGS_KEY,JSON.stringify(state.settings));paintBoard();}
  function closeSettings(){saveSettingsFromUI();hide('#settingsOverlay');}

  function handleKey(e){
    if(!$('#gameScreen').classList.contains('active')||state.paused)return;
    if(/^[1-9]$/.test(e.key)){inputNumber(Number(e.key));e.preventDefault();return;}
    if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){eraseSelected();e.preventDefault();return;}
    if(e.key.toLowerCase()==='n'||e.key===' '){state.memo=!state.memo;updateMemoButton();e.preventDefault();return;}
    if(e.key.toLowerCase()==='a'){fillCandidates();e.preventDefault();return;}
    if(state.selected<0)return; let r=Math.floor(state.selected/9),c=state.selected%9;
    if(e.key==='ArrowUp')r=Math.max(0,r-1);else if(e.key==='ArrowDown')r=Math.min(8,r+1);else if(e.key==='ArrowLeft')c=Math.max(0,c-1);else if(e.key==='ArrowRight')c=Math.min(8,c+1);else return;
    state.selected=r*9+c;paintBoard();e.preventDefault();
  }

  function showLoading(){show('#loadingOverlay');$('#loadingText').textContent='問題を生成しています…';}
  function renderTimer(){$('#timer').textContent=formatTime(state.elapsed);}
  function formatTime(sec){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  function show(sel){$(sel).classList.remove('hidden');} function hide(sel){$(sel).classList.add('hidden');}
  let toastTimer=null;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),2200);}

  init();
})();
