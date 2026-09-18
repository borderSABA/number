/* Global SudokuCore for simple GitHub Pages deployment (no bundler required). */
(() => {
  const FULL = 0x1FF;
  const BIT_TO_NUM = new Map(Array.from({length:9}, (_,i) => [1 << i, i + 1]));

  const bitCount = (n) => {
    let c = 0;
    while (n) { n &= n - 1; c++; }
    return c;
  };

  const shuffle = (arr, rnd = Math.random) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const boxIndex = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

  function masksFor(board) {
    const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
    for (let i = 0; i < 81; i++) {
      const v = board[i];
      if (!v) continue;
      const bit = 1 << (v - 1), r = Math.floor(i / 9), c = i % 9, b = boxIndex(r,c);
      if ((rows[r] & bit) || (cols[c] & bit) || (boxes[b] & bit)) return null;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
    }
    return {rows, cols, boxes};
  }

  function candidateMask(board, i, masks = null) {
    if (board[i]) return 0;
    const m = masks || masksFor(board);
    if (!m) return 0;
    const r = Math.floor(i / 9), c = i % 9, b = boxIndex(r,c);
    return FULL & ~(m.rows[r] | m.cols[c] | m.boxes[b]);
  }

  function solveOne(input, randomize = false) {
    const board = input.slice();
    const m = masksFor(board);
    if (!m) return null;

    function dfs() {
      let best = -1, bestMask = 0, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (board[i]) continue;
        const r = Math.floor(i/9), c = i%9, b = boxIndex(r,c);
        const mask = FULL & ~(m.rows[r] | m.cols[c] | m.boxes[b]);
        const bc = bitCount(mask);
        if (bc === 0) return false;
        if (bc < bestCount) { best = i; bestMask = mask; bestCount = bc; if (bc === 1) break; }
      }
      if (best < 0) return true;
      let nums = [];
      for (let n=1;n<=9;n++) if (bestMask & (1 << (n-1))) nums.push(n);
      if (randomize) nums = shuffle(nums);
      const r = Math.floor(best/9), c = best%9, b = boxIndex(r,c);
      for (const n of nums) {
        const bit = 1 << (n-1);
        board[best] = n; m.rows[r] |= bit; m.cols[c] |= bit; m.boxes[b] |= bit;
        if (dfs()) return true;
        board[best] = 0; m.rows[r] ^= bit; m.cols[c] ^= bit; m.boxes[b] ^= bit;
      }
      return false;
    }
    return dfs() ? board : null;
  }

  function countSolutions(input, limit = 2) {
    const board = input.slice();
    const m = masksFor(board);
    if (!m) return 0;
    let count = 0;
    function dfs() {
      if (count >= limit) return;
      let best = -1, bestMask = 0, bestCount = 10;
      for (let i=0;i<81;i++) {
        if (board[i]) continue;
        const r=Math.floor(i/9), c=i%9, b=boxIndex(r,c);
        const mask = FULL & ~(m.rows[r] | m.cols[c] | m.boxes[b]);
        const bc = bitCount(mask);
        if (bc === 0) return;
        if (bc < bestCount) { best=i; bestMask=mask; bestCount=bc; if (bc===1) break; }
      }
      if (best < 0) { count++; return; }
      const r=Math.floor(best/9), c=best%9, b=boxIndex(r,c);
      for (let n=1;n<=9;n++) {
        const bit=1<<(n-1); if (!(bestMask&bit)) continue;
        board[best]=n; m.rows[r]|=bit; m.cols[c]|=bit; m.boxes[b]|=bit;
        dfs();
        board[best]=0; m.rows[r]^=bit; m.cols[c]^=bit; m.boxes[b]^=bit;
        if (count >= limit) return;
      }
    }
    dfs();
    return count;
  }

  function generateSolvedBoard() {
    return solveOne(Array(81).fill(0), true);
  }

  // Lightweight human-style analyzer. It is intentionally deterministic and used
  // to separate the generated Lv1-Lv8 bands, not to claim an SE-equivalent rating.
  function analyzeDifficulty(input) {
    const board = input.slice();
    const clueCount = board.filter(Boolean).length;
    let technique = { nakedSingle:0, hiddenSingle:0, locked:0, pair:0, xwing:0 };
    let eliminations = Array.from({length:81}, () => 0);
    let rounds = 0;

    const getMasks = () => {
      const base = masksFor(board); if (!base) return null;
      const cm = Array(81).fill(0);
      for (let i=0;i<81;i++) {
        if (board[i]) continue;
        cm[i] = candidateMask(board, i, base) & ~eliminations[i];
        if (!cm[i]) return null;
      }
      return cm;
    };

    const place = (i,n) => { board[i]=n; eliminations[i]=0; };

    function units() {
      const all=[];
      for(let r=0;r<9;r++) all.push(Array.from({length:9},(_,c)=>r*9+c));
      for(let c=0;c<9;c++) all.push(Array.from({length:9},(_,r)=>r*9+c));
      for(let br=0;br<3;br++) for(let bc=0;bc<3;bc++) {
        const u=[]; for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) u.push((br*3+dr)*9+(bc*3+dc));
        all.push(u);
      }
      return all;
    }
    const allUnits = units();

    for (; rounds < 300; rounds++) {
      let cm = getMasks(); if (!cm) break;
      let progress = false;
      // Naked single
      for(let i=0;i<81;i++) if(!board[i] && bitCount(cm[i])===1) {
        place(i, BIT_TO_NUM.get(cm[i])); technique.nakedSingle++; progress=true;
      }
      if (progress) continue;
      cm = getMasks();
      // Hidden single
      outer: for(const u of allUnits) for(let n=1;n<=9;n++) {
        const bit=1<<(n-1); let hit=-1, count=0;
        for(const i of u) if(!board[i] && (cm[i]&bit)) {hit=i; count++; if(count>1) break;}
        if(count===1) { place(hit,n); technique.hiddenSingle++; progress=true; break outer; }
      }
      if(progress) continue;
      cm=getMasks();
      // Locked candidates: box -> row/col
      lockedOuter: for(let br=0;br<3;br++) for(let bc=0;bc<3;bc++) for(let n=1;n<=9;n++) {
        const bit=1<<(n-1), cells=[];
        for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) {
          const i=(br*3+dr)*9+(bc*3+dc); if(!board[i] && (cm[i]&bit)) cells.push(i);
        }
        if(cells.length<2) continue;
        const rows=[...new Set(cells.map(i=>Math.floor(i/9)))];
        const cols=[...new Set(cells.map(i=>i%9))];
        if(rows.length===1){ const r=rows[0]; for(let c=0;c<9;c++){ if(Math.floor(c/3)===bc) continue; const i=r*9+c; if(!board[i]&&(cm[i]&bit)){ eliminations[i]|=bit; progress=true; } } }
        if(!progress && cols.length===1){ const c=cols[0]; for(let r=0;r<9;r++){ if(Math.floor(r/3)===br) continue; const i=r*9+c; if(!board[i]&&(cm[i]&bit)){ eliminations[i]|=bit; progress=true; } } }
        if(progress){ technique.locked++; break lockedOuter; }
      }
      if(progress) continue;
      cm=getMasks();
      // Naked pair in any unit
      pairOuter: for(const u of allUnits){
        const pairs=new Map();
        for(const i of u) if(!board[i] && bitCount(cm[i])===2){ const k=cm[i]; if(!pairs.has(k)) pairs.set(k,[]); pairs.get(k).push(i); }
        for(const [mask,cells] of pairs){
          if(cells.length!==2) continue;
          for(const i of u){ if(board[i]||cells.includes(i)) continue; if(cm[i]&mask){ eliminations[i]|=mask; progress=true; } }
          if(progress){ technique.pair++; break pairOuter; }
        }
      }
      if(progress) continue;
      cm=getMasks();
      // Basic X-Wing, rows then columns
      xwingOuter: for(let n=1;n<=9;n++){
        const bit=1<<(n-1), rowPairs=[];
        for(let r=0;r<9;r++){
          const cols=[]; for(let c=0;c<9;c++){ const i=r*9+c; if(!board[i]&&(cm[i]&bit)) cols.push(c); }
          if(cols.length===2) rowPairs.push([r,cols[0],cols[1]]);
        }
        for(let a=0;a<rowPairs.length;a++) for(let b=a+1;b<rowPairs.length;b++){
          const A=rowPairs[a], B=rowPairs[b]; if(A[1]!==B[1]||A[2]!==B[2]) continue;
          for(let r=0;r<9;r++){ if(r===A[0]||r===B[0]) continue; for(const c of [A[1],A[2]]){ const i=r*9+c; if(!board[i]&&(cm[i]&bit)){ eliminations[i]|=bit; progress=true; } } }
          if(progress){ technique.xwing++; break xwingOuter; }
        }
        const colPairs=[];
        for(let c=0;c<9;c++){
          const rows=[]; for(let r=0;r<9;r++){ const i=r*9+c; if(!board[i]&&(cm[i]&bit)) rows.push(r); }
          if(rows.length===2) colPairs.push([c,rows[0],rows[1]]);
        }
        for(let a=0;a<colPairs.length;a++) for(let b=a+1;b<colPairs.length;b++){
          const A=colPairs[a], B=colPairs[b]; if(A[1]!==B[1]||A[2]!==B[2]) continue;
          for(let c=0;c<9;c++){ if(c===A[0]||c===B[0]) continue; for(const r of [A[1],A[2]]){ const i=r*9+c; if(!board[i]&&(cm[i]&bit)){ eliminations[i]|=bit; progress=true; } } }
          if(progress){ technique.xwing++; break xwingOuter; }
        }
      }
      if(!progress) break;
    }

    const remaining = board.filter(v=>!v).length;
    const logicSolved = remaining===0;
    const search = searchStats(input);
    const base = Math.max(0, (52 - clueCount) * 2.5);
    const tech = Math.min(24,
      technique.hiddenSingle * .25 + technique.locked * 2.0 + technique.pair * 3.0 + technique.xwing * 7.0
    );
    const stall = logicSolved ? 0 : Math.min(22, 8 + remaining * .35);
    const searchWeight = Math.min(18, Math.log2(search.nodes + 1) * 2.2 + search.maxDepth * .5);
    const score = Math.max(0, Math.min(99, Math.round(base + tech + stall + searchWeight)));
    return { score, clueCount, logicSolved, remaining, technique, search };
  }

  function searchStats(input) {
    const board=input.slice(), m=masksFor(board);
    if(!m) return {nodes:0,maxDepth:0};
    let nodes=0,maxDepth=0,solved=false;
    function dfs(depth){
      if(solved || nodes>200000) return;
      maxDepth=Math.max(maxDepth,depth);
      let best=-1,bestMask=0,bestCount=10;
      for(let i=0;i<81;i++){
        if(board[i]) continue;
        const r=Math.floor(i/9),c=i%9,b=boxIndex(r,c);
        const mask=FULL&~(m.rows[r]|m.cols[c]|m.boxes[b]), bc=bitCount(mask);
        if(!bc) return;
        if(bc<bestCount){best=i;bestMask=mask;bestCount=bc;if(bc===1)break;}
      }
      if(best<0){solved=true;return;}
      const r=Math.floor(best/9),c=best%9,b=boxIndex(r,c);
      for(let n=1;n<=9;n++){
        const bit=1<<(n-1);if(!(bestMask&bit))continue;
        nodes++;board[best]=n;m.rows[r]|=bit;m.cols[c]|=bit;m.boxes[b]|=bit;
        dfs(depth+1);
        board[best]=0;m.rows[r]^=bit;m.cols[c]^=bit;m.boxes[b]^=bit;
        if(solved)return;
      }
    }
    dfs(0); return {nodes,maxDepth};
  }

  const LEVELS = {
    1:{score:[15,24], clues:[49,52], label:'入門'},
    2:{score:[25,32], clues:[45,48], label:'初級'},
    3:{score:[33,42], clues:[41,44], label:'初中級'},
    4:{score:[43,52], clues:[37,40], label:'中級'},
    5:{score:[53,62], clues:[33,36], label:'中上級'},
    6:{score:[63,74], clues:[29,32], label:'上級'},
    7:{score:[75,88], clues:[26,28], label:'超上級'},
    8:{score:[89,99], clues:[23,25], label:'極難'}
  };

  function generatePuzzle(level, progressCb = null) {
    const cfg=LEVELS[level];
    if(!cfg) throw new Error('Lv1〜8のみ生成できます');
    let best=null, bestDistance=Infinity;
    const maxAttempts = level <= 4 ? 8 : level <= 6 ? 14 : 22;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      if(progressCb) progressCb(attempt+1,maxAttempts);
      const solution=generateSolvedBoard();
      const puzzle=solution.slice();
      const target = cfg.clues[0] + Math.floor(Math.random()*(cfg.clues[1]-cfg.clues[0]+1));
      let clues=81;
      const order=shuffle(Array.from({length:41},(_,i)=>i));
      for(const i of order){
        if(clues<=target) break;
        const j=80-i;
        const oldI=puzzle[i], oldJ=puzzle[j];
        if(!oldI && !oldJ) continue;
        puzzle[i]=0; if(j!==i) puzzle[j]=0;
        const removed = (oldI?1:0)+(j!==i&&oldJ?1:0);
        if(clues-removed < target || countSolutions(puzzle,2)!==1){ puzzle[i]=oldI; if(j!==i)puzzle[j]=oldJ; }
        else clues-=removed;
      }
      // If symmetry stopped early, try single removals.
      for(const i of shuffle(Array.from({length:81},(_,i)=>i))){
        if(clues<=target) break; if(!puzzle[i]) continue;
        const old=puzzle[i]; puzzle[i]=0;
        if(countSolutions(puzzle,2)===1) clues--; else puzzle[i]=old;
      }
      const analysis=analyzeDifficulty(puzzle);
      const [lo,hi]=cfg.score;
      const distance=analysis.score<lo?lo-analysis.score:analysis.score>hi?analysis.score-hi:0;
      if(distance<bestDistance){best={puzzle,solution,analysis};bestDistance=distance;}
      if(distance===0) return best;
    }
    return best;
  }

  function parsePuzzle(str) { return [...str].map(ch => /[1-9]/.test(ch) ? Number(ch) : 0); }
  function boardToString(board) { return board.map(v=>v||0).join(''); }

  window.SudokuCore={FULL,bitCount,shuffle,boxIndex,masksFor,candidateMask,solveOne,countSolutions,generateSolvedBoard,analyzeDifficulty,generatePuzzle,parsePuzzle,boardToString,LEVELS};
})();
