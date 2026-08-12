/**
 * Connect Four - 4 in a Row Core Game Logic & Audio Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Board Constants
  const ROWS = 6;
  const COLS = 7;
  const PLAYER1 = 1; // Red
  const PLAYER2 = 2; // Yellow

  // State Variables
  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let currentPlayer = PLAYER1;
  let isGameActive = true;
  let moveHistory = [];
  let scores = { player1: 0, player2: 0 };
  let gameMode = 'ai-medium'; // 'pvp', 'ai-easy', 'ai-medium', 'ai-hard'
  let soundEnabled = true;
  let isAiThinking = false;

  // DOM Elements
  const boardElem = document.getElementById('board');
  const previewRowElem = document.getElementById('preview-row');
  const statusIndicatorElem = document.getElementById('status-indicator');
  const statusTextElem = document.getElementById('status-text');
  const statusDiscElem = statusIndicatorElem.querySelector('.status-disc');

  const p1CardElem = document.getElementById('p1-card');
  const p2CardElem = document.getElementById('p2-card');
  const p1NameElem = document.getElementById('p1-name');
  const p2NameElem = document.getElementById('p2-name');
  const p1ScoreElem = document.getElementById('p1-score');
  const p2ScoreElem = document.getElementById('p2-score');

  const undoBtn = document.getElementById('undo-btn');
  const resetBtn = document.getElementById('reset-btn');
  const clearScoreBtn = document.getElementById('clear-score-btn');
  const soundBtn = document.getElementById('sound-btn');
  const soundIcon = document.getElementById('sound-icon');
  const modeBtn = document.getElementById('mode-btn');
  const currentModeLabel = document.getElementById('current-mode-label');

  const settingsModal = document.getElementById('settings-modal');
  const victoryModal = document.getElementById('victory-modal');
  const victoryTitle = document.getElementById('victory-title');
  const victorySubtitle = document.getElementById('victory-subtitle');
  const playAgainBtn = document.getElementById('play-again-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  // Web Audio Context Synthesis
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      if (type === 'drop') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'win') {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const startTime = now + idx * 0.1;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      } else if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // Audio fallback silent
    }
  }

  // Board Initialization
  function createBoard() {
    boardElem.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const slot = document.createElement('div');
        slot.classList.add('slot');
        slot.dataset.row = r;
        slot.dataset.col = c;
        slot.addEventListener('click', () => handleColumnClick(c));
        slot.addEventListener('mouseenter', () => handleColumnHover(c));
        slot.addEventListener('mouseleave', clearColumnHover);
        boardElem.appendChild(slot);
      }
    }

    // Set preview row handlers
    const previewSlots = previewRowElem.querySelectorAll('.preview-slot');
    previewSlots.forEach((slot) => {
      const col = parseInt(slot.dataset.col);
      slot.addEventListener('click', () => handleColumnClick(col));
      slot.addEventListener('mouseenter', () => handleColumnHover(col));
      slot.addEventListener('mouseleave', clearColumnHover);
    });
  }

  // Hover Effect Handling
  function handleColumnHover(col) {
    if (!isGameActive || isAiThinking) return;
    clearColumnHover();

    const previewSlots = previewRowElem.querySelectorAll('.preview-slot');
    if (previewSlots[col]) {
      previewSlots[col].classList.add('hovered');
      const ghostDisc = previewSlots[col].querySelector('.ghost-disc');
      ghostDisc.className = 'ghost-disc ' + (currentPlayer === PLAYER1 ? 'red' : 'yellow');
    }
  }

  function clearColumnHover() {
    const previewSlots = previewRowElem.querySelectorAll('.preview-slot');
    previewSlots.forEach((slot) => slot.classList.remove('hovered'));
  }

  // Handle Player Column Drop
  function handleColumnClick(col) {
    if (!isGameActive || isAiThinking) return;
    if (gameMode !== 'pvp' && currentPlayer === PLAYER2) return;

    makeMove(col);
  }

  function getAvailableRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) {
        return r;
      }
    }
    return -1;
  }

  function makeMove(col) {
    const row = getAvailableRow(col);
    if (row === -1) return false;

    // Apply board state change
    board[row][col] = currentPlayer;
    moveHistory.push({ row, col, player: currentPlayer });

    // Render disc with animation
    renderDisc(row, col, currentPlayer);
    playSound('drop');

    // Check Win or Draw
    const winningCoords = checkWin(board, currentPlayer);
    if (winningCoords) {
      handleWin(currentPlayer, winningCoords);
      return true;
    }

    if (checkDraw(board)) {
      handleDraw();
      return true;
    }

    // Switch Player Turn
    currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
    updateStatusUI();

    // Check AI Turn trigger
    if (isGameActive && gameMode !== 'pvp' && currentPlayer === PLAYER2) {
      triggerAiMove();
    }

    return true;
  }

  function renderDisc(row, col, player) {
    const slot = boardElem.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!slot) return;

    const disc = document.createElement('div');
    disc.classList.add('disc', player === PLAYER1 ? 'red' : 'yellow');

    // Calculate drop height distance for CSS animation
    const slotSize = slot.offsetWidth || 68;
    const dropDistance = -(row + 1) * (slotSize + 12);
    disc.style.setProperty('--drop-distance', `${dropDistance}px`);
    disc.classList.add('falling');

    slot.appendChild(disc);
  }

  // Check Win Condition
  function checkWin(b, player) {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (
          b[r][c] === player &&
          b[r][c + 1] === player &&
          b[r][c + 2] === player &&
          b[r][c + 3] === player
        ) {
          return [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]];
        }
      }
    }

    // Vertical
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        if (
          b[r][c] === player &&
          b[r + 1][c] === player &&
          b[r + 2][c] === player &&
          b[r + 3][c] === player
        ) {
          return [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]];
        }
      }
    }

    // Positive Diagonal (Bottom-left to Top-right)
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (
          b[r][c] === player &&
          b[r - 1][c + 1] === player &&
          b[r - 2][c + 2] === player &&
          b[r - 3][c + 3] === player
        ) {
          return [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]];
        }
      }
    }

    // Negative Diagonal (Top-left to Bottom-right)
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (
          b[r][c] === player &&
          b[r + 1][c + 1] === player &&
          b[r + 2][c + 2] === player &&
          b[r + 3][c + 3] === player
        ) {
          return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
        }
      }
    }

    return null;
  }

  function checkDraw(b) {
    return b[0].every((cell) => cell !== 0);
  }

  // Game End Handlers
  function handleWin(winner, coords) {
    isGameActive = false;
    clearColumnHover();

    // Highlight winning discs
    coords.forEach(([r, c]) => {
      const slot = boardElem.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      if (slot) {
        const disc = slot.querySelector('.disc');
        if (disc) disc.classList.add('winning-disc');
      }
    });

    // Update scores
    if (winner === PLAYER1) {
      scores.player1++;
      p1ScoreElem.textContent = scores.player1;
    } else {
      scores.player2++;
      p2ScoreElem.textContent = scores.player2;
    }

    playSound('win');
    launchConfetti();

    const winnerName = winner === PLAYER1 ? p1NameElem.textContent : p2NameElem.textContent;
    statusTextElem.textContent = `${winnerName} Wins! 🎉`;

    setTimeout(() => {
      victoryTitle.textContent = `${winnerName} Wins!`;
      victorySubtitle.textContent = 'Congratulations on connecting 4 in a row!';
      victoryModal.classList.add('open');
    }, 1000);
  }

  function handleDraw() {
    isGameActive = false;
    clearColumnHover();
    statusTextElem.textContent = "It's a Draw! 🤝";

    setTimeout(() => {
      victoryTitle.textContent = "It's a Tie!";
      victorySubtitle.textContent = 'The board is completely full.';
      victoryModal.classList.add('open');
    }, 800);
  }

  // AI Opponent Logic
  function triggerAiMove() {
    isAiThinking = true;
    updateStatusUI();

    const delay = gameMode === 'ai-easy' ? 400 : 600;

    setTimeout(() => {
      if (!isGameActive) {
        isAiThinking = false;
        return;
      }

      let chosenCol = -1;

      if (gameMode === 'ai-easy') {
        chosenCol = getEasyAiMove();
      } else if (gameMode === 'ai-medium') {
        chosenCol = getMediumAiMove();
      } else if (gameMode === 'ai-hard') {
        chosenCol = getHardAiMove();
      }

      isAiThinking = false;
      if (chosenCol !== -1) {
        makeMove(chosenCol);
      }
    }, delay);
  }

  function getValidColumns(b) {
    const validCols = [];
    for (let c = 0; c < COLS; c++) {
      if (b[0][c] === 0) validCols.push(c);
    }
    return validCols;
  }

  function getEasyAiMove() {
    const valid = getValidColumns(board);
    if (valid.length === 0) return -1;
    return valid[Math.floor(Math.random() * valid.length)];
  }

  function getMediumAiMove() {
    const valid = getValidColumns(board);
    // 1. Can AI win in 1 move?
    for (let col of valid) {
      const r = getAvailableRowInBoard(board, col);
      board[r][col] = PLAYER2;
      if (checkWin(board, PLAYER2)) {
        board[r][col] = 0;
        return col;
      }
      board[r][col] = 0;
    }

    // 2. Can Player 1 win in 1 move? Block it!
    for (let col of valid) {
      const r = getAvailableRowInBoard(board, col);
      board[r][col] = PLAYER1;
      if (checkWin(board, PLAYER1)) {
        board[r][col] = 0;
        return col;
      }
      board[r][col] = 0;
    }

    // Prefer center column if available
    if (valid.includes(3)) return 3;

    return valid[Math.floor(Math.random() * valid.length)];
  }

  function getHardAiMove() {
    // Minimax depth 4
    const result = minimax(board, 4, -Infinity, Infinity, true);
    return result.column !== null ? result.column : getMediumAiMove();
  }

  function getAvailableRowInBoard(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) return r;
    }
    return -1;
  }

  function evaluateWindow(window, player) {
    let score = 0;
    const opponent = player === PLAYER1 ? PLAYER2 : PLAYER1;

    const countPlayer = window.filter((cell) => cell === player).length;
    const countEmpty = window.filter((cell) => cell === 0).length;
    const countOpponent = window.filter((cell) => cell === opponent).length;

    if (countPlayer === 4) score += 100;
    else if (countPlayer === 3 && countEmpty === 1) score += 5;
    else if (countPlayer === 2 && countEmpty === 2) score += 2;

    if (countOpponent === 3 && countEmpty === 1) score -= 4;

    return score;
  }

  function scoreBoardState(b, player) {
    let score = 0;

    // Score center column priority
    const centerArray = [];
    for (let r = 0; r < ROWS; r++) {
      centerArray.push(b[r][3]);
    }
    const centerCount = centerArray.filter((cell) => cell === player).length;
    score += centerCount * 3;

    // Score Horizontal windows
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const window = [b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]];
        score += evaluateWindow(window, player);
      }
    }

    // Score Vertical windows
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        const window = [b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]];
        score += evaluateWindow(window, player);
      }
    }

    // Score Diagonal windows
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const window = [b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]];
        score += evaluateWindow(window, player);
      }
    }

    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const window = [b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]];
        score += evaluateWindow(window, player);
      }
    }

    return score;
  }

  function minimax(b, depth, alpha, beta, maximizingPlayer) {
    const validCols = getValidColumns(b);
    const isTerminal = checkWin(b, PLAYER1) || checkWin(b, PLAYER2) || validCols.length === 0;

    if (depth === 0 || isTerminal) {
      if (isTerminal) {
        if (checkWin(b, PLAYER2)) return { column: null, score: 100000 };
        if (checkWin(b, PLAYER1)) return { column: null, score: -100000 };
        return { column: null, score: 0 }; // Draw
      } else {
        return { column: null, score: scoreBoardState(b, PLAYER2) };
      }
    }

    if (maximizingPlayer) {
      let value = -Infinity;
      let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
      for (let col of validCols) {
        const r = getAvailableRowInBoard(b, col);
        b[r][col] = PLAYER2;
        const newScore = minimax(b, depth - 1, alpha, beta, false).score;
        b[r][col] = 0;
        if (newScore > value) {
          value = newScore;
          bestCol = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return { column: bestCol, score: value };
    } else {
      let value = Infinity;
      let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
      for (let col of validCols) {
        const r = getAvailableRowInBoard(b, col);
        b[r][col] = PLAYER1;
        const newScore = minimax(b, depth - 1, alpha, beta, true).score;
        b[r][col] = 0;
        if (newScore < value) {
          value = newScore;
          bestCol = col;
        }
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return { column: bestCol, score: value };
    }
  }

  // UI Updates
  function updateStatusUI() {
    p1CardElem.classList.toggle('active', currentPlayer === PLAYER1);
    p2CardElem.classList.toggle('active', currentPlayer === PLAYER2);

    if (isAiThinking) {
      statusDiscElem.className = 'status-disc yellow-disc';
      statusTextElem.textContent = 'AI is thinking... 🤖';
      return;
    }

    if (currentPlayer === PLAYER1) {
      statusDiscElem.className = 'status-disc red-disc';
      statusTextElem.textContent = `${p1NameElem.textContent}'s Turn`;
    } else {
      statusDiscElem.className = 'status-disc yellow-disc';
      statusTextElem.textContent = `${p2NameElem.textContent}'s Turn`;
    }

    undoBtn.disabled = moveHistory.length === 0 || isAiThinking;
  }

  // Controls & Action Handlers
  function undoMove() {
    if (moveHistory.length === 0 || !isGameActive || isAiThinking) return;

    playSound('click');

    // In AI mode, undo both AI move and Player move
    const movesToUndo = gameMode !== 'pvp' && currentPlayer === PLAYER1 ? 2 : 1;

    for (let i = 0; i < movesToUndo; i++) {
      if (moveHistory.length === 0) break;
      const lastMove = moveHistory.pop();
      board[lastMove.row][lastMove.col] = 0;

      const slot = boardElem.querySelector(`[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
      if (slot) slot.innerHTML = '';
      currentPlayer = lastMove.player;
    }

    isGameActive = true;
    updateStatusUI();
    clearColumnHover();
  }

  function resetGame() {
    playSound('click');
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    moveHistory = [];
    currentPlayer = PLAYER1;
    isGameActive = true;
    isAiThinking = false;

    // Clear grid UI
    const slots = boardElem.querySelectorAll('.slot');
    slots.forEach((slot) => (slot.innerHTML = ''));

    victoryModal.classList.remove('open');
    updateStatusUI();
    clearColumnHover();
  }

  function resetScores() {
    playSound('click');
    scores.player1 = 0;
    scores.player2 = 0;
    p1ScoreElem.textContent = '0';
    p2ScoreElem.textContent = '0';
  }

  function updateModeLabel() {
    if (gameMode === 'pvp') {
      currentModeLabel.textContent = '👥 2-Player Local';
      p2NameElem.textContent = 'Player 2';
    } else if (gameMode === 'ai-easy') {
      currentModeLabel.textContent = '🤖 VS AI (Easy)';
      p2NameElem.textContent = 'AI (Easy)';
    } else if (gameMode === 'ai-medium') {
      currentModeLabel.textContent = '🤖 VS AI (Medium)';
      p2NameElem.textContent = 'AI (Medium)';
    } else if (gameMode === 'ai-hard') {
      currentModeLabel.textContent = '🧠 VS AI (Hard)';
      p2NameElem.textContent = 'AI (Hard)';
    }
  }

  // Keyboard Navigation
  let selectedKeyboardCol = 3;
  document.addEventListener('keydown', (e) => {
    if (!isGameActive || isAiThinking) return;

    if (e.key === 'ArrowLeft') {
      selectedKeyboardCol = Math.max(0, selectedKeyboardCol - 1);
      handleColumnHover(selectedKeyboardCol);
    } else if (e.key === 'ArrowRight') {
      selectedKeyboardCol = Math.min(COLS - 1, selectedKeyboardCol + 1);
      handleColumnHover(selectedKeyboardCol);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleColumnClick(selectedKeyboardCol);
    } else if (e.key.toLowerCase() === 'u') {
      undoMove();
    } else if (e.key.toLowerCase() === 'r') {
      resetGame();
    }
  });

  // Event Listeners
  undoBtn.addEventListener('click', undoMove);
  resetBtn.addEventListener('click', resetGame);
  clearScoreBtn.addEventListener('click', resetScores);

  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    playSound('click');
  });

  modeBtn.addEventListener('click', () => {
    playSound('click');
    settingsModal.classList.add('open');
  });

  saveSettingsBtn.addEventListener('click', () => {
    playSound('click');
    const selectedMode = document.querySelector('input[name="gameMode"]:checked').value;
    gameMode = selectedMode;
    updateModeLabel();
    settingsModal.classList.remove('open');
    resetGame();
  });

  playAgainBtn.addEventListener('click', () => {
    playSound('click');
    resetGame();
  });

  // Confetti Particle Explosion
  function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ff3b5c', '#ffc83b', '#6366f1', '#10b981', '#ec4899', '#3b82f6'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let animationFrame;
    function renderParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        if (p.opacity > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3; // Gravity
          p.opacity -= 0.012;
          p.rotation += p.rSpeed;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrame = requestAnimationFrame(renderParticles);
      } else {
        cancelAnimationFrame(animationFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    renderParticles();
  }

  // Setup Initial Game State
  createBoard();
  updateModeLabel();
  updateStatusUI();
});
