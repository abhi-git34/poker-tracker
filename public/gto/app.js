// app.js - UI Orchestrator and Event Handlers

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // SIDEBAR NAVIGATION
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === targetTab) {
                    sec.classList.add('active');
                }
            });
            
            // Special initialization on tab view
            if (targetTab === 'range-explorer') {
                renderExplorerGrid();
            } else if (targetTab === 'push-fold-solver') {
                renderPushFoldGridsDefault();
            } else if (targetTab === 'kuhn-cfr') {
                initKuhnCfrView();
            }
        });
    });

    // ==========================================
    // RANGE EXPLORER TAB & CUSTOM SOLVER BUILDER
    // ==========================================
    const explorerGrid = document.getElementById('explorer-grid');
    const scenarioSelect = document.getElementById('explorer-scenario');
    const detailHandName = document.getElementById('detail-hand-name');
    const detailHandCombos = document.getElementById('detail-hand-combos');
    const detailBars = document.getElementById('detail-bars');
    const barFold = document.getElementById('bar-fold');
    const barCall = document.getElementById('bar-call');
    const barRaise = document.getElementById('bar-raise');
    const lblFold = document.getElementById('lbl-fold-val');
    const lblCall = document.getElementById('lbl-call-val');
    const lblRaise = document.getElementById('lbl-raise-val');
    
    const statFold = document.getElementById('stat-fold-pct');
    const statCall = document.getElementById('stat-call-pct');
    const statRaise = document.getElementById('stat-raise-pct');

    // Custom Builder DOM
    const customBuilderCard = document.getElementById('custom-builder-card');
    const custGameType = document.getElementById('cust-game-type');
    const custTableSize = document.getElementById('cust-table-size');
    const custStackRange = document.getElementById('cust-stack-range');
    const custStackVal = document.getElementById('cust-stack-val');
    const custHeroPos = document.getElementById('cust-hero-pos');
    const custActionSelect = document.getElementById('cust-action-select');
    const btnCustAddAction = document.getElementById('btn-cust-add-action');
    const custActionList = document.getElementById('cust-action-list');
    const btnCustClearActions = document.getElementById('btn-cust-clear-actions');
    const btnCustSolve = document.getElementById('btn-cust-solve');
    const btnCustPractice = document.getElementById('btn-cust-practice');

    let activeRangeGrid = null;
    let customActions = [];
    let activeCustomSpot = null; // Stores training custom spot config

    // Sync stack slider and number input
    custStackRange.addEventListener('input', () => {
        custStackVal.value = custStackRange.value;
    });
    custStackVal.addEventListener('change', () => {
        let val = Math.max(10, Math.min(1000, parseInt(custStackVal.value) || 100));
        custStackVal.value = val;
        custStackRange.value = val;
    });

    // Positions dropdown based on table size
    function updateHeroPositions() {
        const size = custTableSize.value;
        let positions = [];
        if (size === '9MAX') {
            positions = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
        } else if (size === '6MAX') {
            positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
        } else {
            positions = ['SB', 'BB'];
        }
        custHeroPos.innerHTML = '';
        positions.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p === 'BTN' ? 'BTN (Hero)' : p;
            custHeroPos.appendChild(opt);
        });
    }

    custTableSize.addEventListener('change', () => {
        updateHeroPositions();
        clearCustomActions();
        updateActionSelectOptions();
    });

    function updateActionSelectOptions() {
        const size = custTableSize.value;
        let positions = getPositionsList(size);
        let actorIdx = customActions.length % positions.length;
        let actor = positions[actorIdx];
        
        custActionSelect.innerHTML = '';
        
        // Add options depending on player position (e.g. BB can't open raise)
        const optFold = document.createElement('option');
        optFold.value = 'FOLD';
        optFold.textContent = `${actor} Folds`;
        custActionSelect.appendChild(optFold);
        
        // Check if there is already an open raise
        const hasOpen = customActions.some(a => a.action === 'OPEN' || a.action === 'RAISE');
        const has3Bet = customActions.some(a => a.action === '3BET');
        
        if (!hasOpen && actor !== 'BB') {
            const optOpen = document.createElement('option');
            optOpen.value = 'OPEN';
            optOpen.textContent = `${actor} Opens (2.5 BB)`;
            custActionSelect.appendChild(optOpen);
        } else if (hasOpen && !has3Bet) {
            const optCall = document.createElement('option');
            optCall.value = 'CALL';
            optCall.textContent = `${actor} Calls`;
            custActionSelect.appendChild(optCall);
            
            const opt3Bet = document.createElement('option');
            opt3Bet.value = '3BET';
            opt3Bet.textContent = `${actor} 3-Bets (9 BB)`;
            custActionSelect.appendChild(opt3Bet);
        } else if (has3Bet) {
            const optCall = document.createElement('option');
            optCall.value = 'CALL';
            optCall.textContent = `${actor} Calls`;
            custActionSelect.appendChild(optCall);
        }
    }

    function getPositionsList(size) {
        if (size === '9MAX') return ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
        if (size === '6MAX') return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
        return ['SB', 'BB']; // Heads Up
    }

    btnCustAddAction.addEventListener('click', () => {
        const size = custTableSize.value;
        const positions = getPositionsList(size);
        
        let actorIdx = customActions.length % positions.length;
        let actor = positions[actorIdx];
        
        let actType = custActionSelect.value;
        let sizeVal = 0;
        if (actType === 'OPEN') sizeVal = 2.5;
        if (actType === '3BET') sizeVal = 9.0;
        
        customActions.push({ pos: actor, action: actType, size: sizeVal });
        renderActionList();
        updateActionSelectOptions();
    });

    function renderActionList() {
        custActionList.innerHTML = '';
        customActions.forEach((act, idx) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.color = 'var(--text-secondary)';
            div.innerHTML = `<span>[${idx+1}] <strong>${act.pos}:</strong> ${act.action}</span>`;
            custActionList.appendChild(div);
        });
    }

    function clearCustomActions() {
        customActions = [];
        custActionList.innerHTML = '<em>No actions added yet.</em>';
        updateActionSelectOptions();
    }

    btnCustClearActions.addEventListener('click', clearCustomActions);

    btnCustSolve.addEventListener('click', () => {
        solveAndRenderCustomRange();
    });

    function solveAndRenderCustomRange() {
        const config = {
            gameType: custGameType.value,
            tableSize: custTableSize.value,
            stackBB: parseFloat(custStackVal.value)
        };
        const heroPos = custHeroPos.value;
        
        activeRangeGrid = PokerSolver.generateGTORange(config, customActions, heroPos);
        renderGridFromRange(activeRangeGrid);
    }

    btnCustPractice.addEventListener('click', () => {
        // Build practice spot config
        activeCustomSpot = {
            gameType: custGameType.value,
            tableSize: custTableSize.value,
            stackBB: parseFloat(custStackVal.value),
            heroPos: custHeroPos.value,
            actions: [...customActions]
        };
        
        // Switch to trainer tab
        const trainerNav = document.querySelector('[data-tab="gto-trainer"]');
        trainerNav.click();
        
        // Start custom trainer hand
        startTrainerHand();
    });

    scenarioSelect.addEventListener('change', () => {
        if (scenarioSelect.value === 'CUSTOM') {
            customBuilderCard.style.display = 'block';
            updateHeroPositions();
            clearCustomActions();
            solveAndRenderCustomRange();
        } else {
            customBuilderCard.style.display = 'none';
            activeCustomSpot = null; // Reset custom trainer spot
            renderExplorerGrid();
        }
    });

    function renderExplorerGrid() {
        const scenario = scenarioSelect.value;
        if (scenario === 'CUSTOM') return;
        const rangeString = PokerSolver.GTO_RANGES_DATA[scenario];
        activeRangeGrid = PokerSolver.parseRange(rangeString);
        renderGridFromRange(activeRangeGrid);
    }

    function renderGridFromRange(grid) {
        explorerGrid.innerHTML = '';
        
        let totalFoldCombos = 0;
        let totalCallCombos = 0;
        let totalRaiseCombos = 0;
        let totalCombos = 0;
        
        for (let r = 0; r < 13; r++) {
            for (let c = 0; c < 13; c++) {
                const handName = PokerSolver.getHandString(r, c);
                const [f, cl, ra] = grid[r][c];
                const combos = PokerSolver.getComboCount(r, c);
                
                totalFoldCombos += f * combos;
                totalCallCombos += cl * combos;
                totalRaiseCombos += ra * combos;
                totalCombos += combos;
                
                const cell = document.createElement('div');
                cell.className = 'hand-cell';
                cell.textContent = handName;
                
                const fPct = Math.round(f * 100);
                const cPct = Math.round(cl * 100);
                const rPct = Math.round(ra * 100);
                
                cell.style.background = `linear-gradient(to right, 
                    var(--gto-fold) 0%, var(--gto-fold) ${fPct}%, 
                    var(--gto-call) ${fPct}%, var(--gto-call) ${fPct + cPct}%, 
                    var(--gto-raise) ${fPct + cPct}%, var(--gto-raise) 100%)`;
                
                cell.addEventListener('mouseover', () => {
                    updateHandDetails(handName, combos, f, cl, ra);
                });
                
                explorerGrid.appendChild(cell);
            }
        }
        
        statFold.textContent = ((totalFoldCombos / totalCombos) * 100).toFixed(1) + '%';
        statCall.textContent = ((totalCallCombos / totalCombos) * 100).toFixed(1) + '%';
        statRaise.textContent = ((totalRaiseCombos / totalCombos) * 100).toFixed(1) + '%';
    }

    function updateHandDetails(name, combos, f, cl, ra) {
        detailHandName.textContent = name;
        detailHandCombos.textContent = `${combos} combos`;
        detailBars.style.display = 'block';
        
        const fPct = f * 100;
        const cPct = cl * 100;
        const rPct = ra * 100;
        
        barFold.style.width = fPct + '%';
        barCall.style.width = cPct + '%';
        barRaise.style.width = rPct + '%';
        
        lblFold.textContent = fPct.toFixed(0) + '%';
        lblCall.textContent = cPct.toFixed(0) + '%';
        lblRaise.textContent = rPct.toFixed(0) + '%';
    }

    // Initialize first render
    renderExplorerGrid();

    // ==========================================
    // GTO TRAINER TAB
    // ==========================================
    let trainerStats = {
        played: 0,
        correct: 0,
        evLoss: 0.0
    };
    
    let currentTrainerSpot = null;
    
    const scorePlayed = document.getElementById('score-played');
    const scoreAccuracy = document.getElementById('score-accuracy');
    const scoreEvLoss = document.getElementById('score-ev-loss');
    
    const trainerHeroCards = document.getElementById('trainer-hero-cards');
    const btnHeroFold = document.getElementById('btn-hero-fold');
    const btnHeroCall = document.getElementById('btn-hero-call');
    const btnHeroRaise = document.getElementById('btn-hero-raise');
    const trainerFeedback = document.getElementById('trainer-feedback');
    const feedbackHeadline = document.getElementById('feedback-headline');
    const feedbackBody = document.getElementById('feedback-body');
    const btnNextHand = document.getElementById('btn-next-hand');
    const trainerScenarioLbl = document.getElementById('trainer-scenario-lbl');
    
    // Seats elements (expanded to 9-Max)
    const avatars = {
        UTG: document.getElementById('avatar-UTG'),
        UTG1: document.getElementById('avatar-UTG1'),
        MP: document.getElementById('avatar-MP'),
        LJ: document.getElementById('avatar-LJ'),
        HJ: document.getElementById('avatar-HJ'),
        CO: document.getElementById('avatar-CO'),
        BTN: document.getElementById('avatar-BTN'),
        SB: document.getElementById('avatar-SB'),
        BB: document.getElementById('avatar-BB')
    };
    
    const actions = {
        UTG: document.getElementById('action-UTG'),
        UTG1: document.getElementById('action-UTG1'),
        MP: document.getElementById('action-MP'),
        LJ: document.getElementById('action-LJ'),
        HJ: document.getElementById('action-HJ'),
        CO: document.getElementById('action-CO'),
        BTN: document.getElementById('action-BTN'),
        SB: document.getElementById('action-SB'),
        BB: document.getElementById('action-BB')
    };

    function startTrainerHand() {
        trainerFeedback.style.display = 'none';
        document.getElementById('trainer-actions-panel').style.display = 'flex';
        
        // Reset avatars styles
        for (let seat in avatars) {
            if (avatars[seat]) avatars[seat].className = 'seat-avatar';
            if (actions[seat]) actions[seat].style.display = 'none';
        }
        
        // 2. Choose a random card combination
        const cardValues = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        const suits = ['♠', '♥', '♦', '♣'];
        
        // Deal cards
        let c1_idx = Math.floor(Math.random() * 13);
        let c2_idx = Math.floor(Math.random() * 13);
        let s1 = suits[Math.floor(Math.random() * 4)];
        let s2 = suits[Math.floor(Math.random() * 4)];
        
        if (c1_idx === c2_idx && s1 === s2) {
            s2 = suits[(suits.indexOf(s1) + 1) % 4];
        }
        
        const card1 = cardValues[c1_idx] + s1;
        const card2 = cardValues[c2_idx] + s2;
        
        let matrix_r, matrix_c;
        let isSuited = s1 === s2;
        if (c1_idx === c2_idx) {
            matrix_r = c1_idx;
            matrix_c = c2_idx;
        } else {
            if (isSuited) {
                matrix_r = Math.min(c1_idx, c2_idx);
                matrix_c = Math.max(c1_idx, c2_idx);
            } else {
                matrix_r = Math.max(c1_idx, c2_idx);
                matrix_c = Math.min(c1_idx, c2_idx);
            }
        }
        
        const handRep = PokerSolver.getHandString(matrix_r, matrix_c);
        let f, cl, ra;
        
        if (activeCustomSpot) {
            // CUSTOM PRACTICE SPOT MODE
            const solvedGrid = PokerSolver.generateGTORange(activeCustomSpot, activeCustomSpot.actions, activeCustomSpot.heroPos);
            [f, cl, ra] = solvedGrid[matrix_r][matrix_c];
            
            currentTrainerSpot = {
                scenario: 'CUSTOM',
                hand: handRep,
                cards: [card1, card2],
                gto: [f, cl, ra]
            };
            
            configureTableSizeSeats(activeCustomSpot.tableSize);
            setupCustomTableScenario();
        } else {
            // STANDARD SCENARIOS
            configureTableSizeSeats('6MAX');
            const scenarios = ['UTG_Open', 'HJ_Open', 'CO_Open', 'BTN_Open', 'SB_Open', 'BB_vs_BTN_Open', 'BTN_vs_UTG_Open'];
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            
            const rangeString = PokerSolver.GTO_RANGES_DATA[scenario];
            const rangeGrid = PokerSolver.parseRange(rangeString);
            [f, cl, ra] = rangeGrid[matrix_r][matrix_c];
            
            currentTrainerSpot = {
                scenario: scenario,
                hand: handRep,
                cards: [card1, card2],
                gto: [f, cl, ra]
            };
            setupTableScenario(scenario);
        }
        
        trainerHeroCards.innerHTML = '';
        renderPokerCard(trainerHeroCards, card1);
        renderPokerCard(trainerHeroCards, card2);
    }

    function renderPokerCard(container, cardStr) {
        const value = cardStr.slice(0, -1);
        const suit = cardStr.slice(-1);
        const isRed = suit === '♥' || suit === '♦';
        
        const card = document.createElement('div');
        card.className = `card-poker ${isRed ? 'red-suit' : 'black-suit'}`;
        
        card.innerHTML = `
            <div class="suit-top">${value}<span>${suit}</span></div>
            <div class="suit-bottom">${suit}</div>
        `;
        container.appendChild(card);
    }

    function configureTableSizeSeats(tableSize) {
        const seats = getPositionsList(tableSize);
        const allPositions = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
        
        allPositions.forEach(p => {
            const el = document.querySelector(`.seat-${p.toLowerCase()}`);
            if (el) {
                el.style.display = seats.includes(p) ? 'flex' : 'none';
            }
        });
        
        const sbLabel = document.getElementById('label-SB');
        if (sbLabel) {
            sbLabel.textContent = tableSize === '2MAX' ? 'BTN/SB' : 'SB';
        }
    }

    function setupCustomTableScenario() {
        const potEl = document.querySelector('.table-pot');
        const raBtn = document.getElementById('btn-hero-raise');
        const clBtn = document.getElementById('btn-hero-call');
        
        raBtn.textContent = 'Raise';
        clBtn.textContent = 'Call';
        clBtn.style.display = 'block';
        
        trainerScenarioLbl.textContent = `Custom (${activeCustomSpot.tableSize}, ${activeCustomSpot.stackBB} BB)`;
        
        let pot = 1.5;
        let lastRaiseSize = 1.0;
        
        // Highlight active opponent if they bet/raised
        let lastAggressor = null;
        
        activeCustomSpot.actions.forEach(act => {
            if (actions[act.pos]) {
                actions[act.pos].style.display = 'block';
                if (act.action === 'FOLD') {
                    actions[act.pos].textContent = 'Fold';
                } else if (act.action === 'OPEN' || act.action === 'RAISE') {
                    actions[act.pos].textContent = `Raise ${act.size} BB`;
                    pot += act.size;
                    lastRaiseSize = act.size;
                    lastAggressor = act.pos;
                } else if (act.action === 'CALL') {
                    actions[act.pos].textContent = 'Call';
                    pot += lastRaiseSize;
                } else if (act.action === '3BET') {
                    actions[act.pos].textContent = `3-Bet ${act.size} BB`;
                    pot += act.size;
                    lastRaiseSize = act.size;
                    lastAggressor = act.pos;
                }
            }
        });
        
        potEl.textContent = `Pot: ${pot.toFixed(1)} BB`;
        
        // Highlight active opponent
        if (lastAggressor && avatars[lastAggressor]) {
            avatars[lastAggressor].className = 'seat-avatar active-opponent';
        }
        
        // Set Hero seat active
        let hero = activeCustomSpot.heroPos;
        if (avatars[hero]) {
            avatars[hero].className = 'seat-avatar active-hero';
        }
        
        // Configure Hero Buttons
        const hasOpen = activeCustomSpot.actions.some(a => a.action === 'OPEN' || a.action === 'RAISE');
        const has3Bet = activeCustomSpot.actions.some(a => a.action === '3BET');
        
        if (has3Bet) {
            clBtn.textContent = `Call (${lastRaiseSize.toFixed(1)} BB)`;
            raBtn.textContent = '4-Bet Shove';
        } else if (hasOpen) {
            clBtn.textContent = `Call (${lastRaiseSize.toFixed(1)} BB)`;
            raBtn.textContent = `Raise ${(lastRaiseSize * 3).toFixed(1)} BB`;
        } else {
            clBtn.style.display = 'none';
            raBtn.textContent = 'Raise 2.5 BB';
        }
    }

    function setupTableScenario(scenario) {
        const potEl = document.querySelector('.table-pot');
        const raBtn = document.getElementById('btn-hero-raise');
        const clBtn = document.getElementById('btn-hero-call');
        
        raBtn.textContent = 'Raise';
        clBtn.textContent = 'Call';
        clBtn.style.display = 'block';
        
        if (scenario.endsWith('_Open')) {
            const pos = scenario.split('_')[0];
            trainerScenarioLbl.textContent = `${pos} Preflop Open`;
            potEl.textContent = 'Pot: 1.5 BB';
            avatars[pos].className = 'seat-avatar active-hero';
            clBtn.style.display = 'none';
            raBtn.textContent = pos === 'SB' ? 'Raise 3 BB' : 'Raise 2.2 BB';
            
            const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
            let heroIdx = positions.indexOf(pos);
            for (let i = 0; i < heroIdx; i++) {
                actions[positions[i]].textContent = 'Fold';
                actions[positions[i]].style.display = 'block';
            }
        } 
        else if (scenario === 'BB_vs_BTN_Open') {
            trainerScenarioLbl.textContent = 'BB vs BTN Open';
            potEl.textContent = 'Pot: 4.0 BB';
            avatars['BTN'].className = 'seat-avatar active-opponent';
            actions['BTN'].textContent = 'Raise 2.5 BB';
            actions['BTN'].style.display = 'block';
            
            actions['UTG'].textContent = 'Fold'; actions['UTG'].style.display = 'block';
            actions['HJ'].textContent = 'Fold'; actions['HJ'].style.display = 'block';
            actions['CO'].textContent = 'Fold'; actions['CO'].style.display = 'block';
            actions['SB'].textContent = 'Fold'; actions['SB'].style.display = 'block';
            
            avatars['BB'].className = 'seat-avatar active-hero';
            clBtn.textContent = 'Call (1.5 BB)';
            raBtn.textContent = '3-Bet 9.0 BB';
        }
        else if (scenario === 'BTN_vs_UTG_Open') {
            trainerScenarioLbl.textContent = 'BTN vs UTG Open';
            potEl.textContent = 'Pot: 4.0 BB';
            avatars['UTG'].className = 'seat-avatar active-opponent';
            actions['UTG'].textContent = 'Raise 2.5 BB';
            actions['UTG'].style.display = 'block';
            
            actions['HJ'].textContent = 'Fold'; actions['HJ'].style.display = 'block';
            actions['CO'].textContent = 'Fold'; actions['CO'].style.display = 'block';
            
            avatars['BTN'].className = 'seat-avatar active-hero';
            clBtn.textContent = 'Call (2.5 BB)';
            raBtn.textContent = '3-Bet 8.0 BB';
        }
        else if (scenario === 'SB_vs_BTN_Open') {
            trainerScenarioLbl.textContent = 'SB vs BTN Open';
            potEl.textContent = 'Pot: 4.0 BB';
            avatars['BTN'].className = 'seat-avatar active-opponent';
            actions['BTN'].textContent = 'Raise 2.5 BB';
            actions['BTN'].style.display = 'block';
            
            actions['UTG'].textContent = 'Fold'; actions['UTG'].style.display = 'block';
            actions['HJ'].textContent = 'Fold'; actions['HJ'].style.display = 'block';
            actions['CO'].textContent = 'Fold'; actions['CO'].style.display = 'block';
            
            avatars['SB'].className = 'seat-avatar active-hero';
            clBtn.textContent = 'Call (2.0 BB)';
            raBtn.textContent = '3-Bet 9.5 BB';
        }
    }

    function handleHeroAction(actionIdx) {
        // actionIdx: 0 = Fold, 1 = Call, 2 = Raise
        const gto = currentTrainerSpot.gto;
        const prob = gto[actionIdx];
        
        let isCorrect = prob >= 0.1; // GTO plays this action at least 10% of the time
        let maxProbActionIdx = gto.indexOf(Math.max(...gto));
        let evLoss = 0.0;
        
        if (!isCorrect) {
            // Approximate EV loss for playing non-GTO action
            evLoss = Math.max(0.0, gto[maxProbActionIdx] - prob) * 0.6; 
        }
        
        // Update stats
        trainerStats.played++;
        if (isCorrect) trainerStats.correct++;
        trainerStats.evLoss += evLoss;
        
        // Update scoreboard
        scorePlayed.textContent = trainerStats.played;
        scoreAccuracy.textContent = Math.round((trainerStats.correct / trainerStats.played) * 100) + '%';
        scoreEvLoss.textContent = trainerStats.evLoss.toFixed(2) + ' BB';
        
        // Hide choices and show feedback
        document.getElementById('trainer-actions-panel').style.display = 'none';
        trainerFeedback.style.display = 'block';
        
        if (isCorrect) {
            trainerFeedback.className = 'feedback-overlay correct';
            feedbackHeadline.textContent = 'Correct GTO Play!';
        } else {
            trainerFeedback.className = 'feedback-overlay incorrect';
            feedbackHeadline.textContent = `Mistake! (${evLoss.toFixed(2)} BB EV loss)`;
        }
        
        // Text details
        const actNames = ['Fold', 'Call', 'Raise'];
        const formatGto = gto.map((p, idx) => `<strong>${actNames[idx]}:</strong> ${(p*100).toFixed(0)}%`).join(', ');
        
        feedbackBody.innerHTML = `
            You chose <strong>${actNames[actionIdx]}</strong>. <br>
            GTO frequencies for <strong>${currentTrainerSpot.hand}</strong> are: <br>
            ${formatGto}.
        `;
    }

    btnHeroFold.addEventListener('click', () => handleHeroAction(0));
    btnHeroCall.addEventListener('click', () => handleHeroAction(1));
    btnHeroRaise.addEventListener('click', () => handleHeroAction(2));
    
    btnNextHand.addEventListener('click', () => {
        startTrainerHand();
    });

    // Start first hand
    startTrainerHand();

    // ==========================================
    // PUSH / FOLD SOLVER TAB
    // ==========================================
    const btnRunPf = document.getElementById('btn-run-pf');
    const pfStackInput = document.getElementById('pf-stack');
    const pfIterationsInput = document.getElementById('pf-iterations');
    const pfSbGrid = document.getElementById('pf-sb-grid');
    const pfBbGrid = document.getElementById('pf-bb-grid');

    btnRunPf.addEventListener('click', () => {
        const stack = parseFloat(pfStackInput.value);
        const iterations = parseInt(pfIterationsInput.value);
        
        btnRunPf.textContent = 'Solving...';
        btnRunPf.disabled = true;
        
        setTimeout(() => {
            const solution = PokerSolver.solvePushFold(stack, iterations);
            renderPushFoldGrids(solution.sbRange, solution.bbRange);
            btnRunPf.textContent = 'Solve Nash Equilibrium';
            btnRunPf.disabled = false;
        }, 30); // small delay to let UI show "Solving..."
    });

    function renderPushFoldGridsDefault() {
        // Initial blank ranges
        const blankRange = Array(13).fill(0).map(() => Array(13).fill(0.0));
        renderPushFoldGrids(blankRange, blankRange);
    }

    function renderPushFoldGrids(sbRange, bbRange) {
        // Render SB grid (Fold/Push)
        pfSbGrid.innerHTML = '';
        pfBbGrid.innerHTML = '';
        
        for (let r = 0; r < 13; r++) {
            for (let c = 0; c < 13; c++) {
                const handName = PokerSolver.getHandString(r, c);
                
                // SB Cell (Fold vs Push)
                const sbPushProb = sbRange[r][c];
                const sbCell = document.createElement('div');
                sbCell.className = 'hand-cell';
                sbCell.textContent = handName;
                
                const sbPushPct = Math.round(sbPushProb * 100);
                sbCell.style.background = `linear-gradient(to right, 
                    var(--gto-fold) 0%, var(--gto-fold) ${100 - sbPushPct}%, 
                    var(--accent-rose) ${100 - sbPushPct}%, var(--accent-rose) 100%)`;
                
                pfSbGrid.appendChild(sbCell);
                
                // BB Cell (Fold vs Call)
                const bbCallProb = bbRange[r][c];
                const bbCell = document.createElement('div');
                bbCell.className = 'hand-cell';
                bbCell.textContent = handName;
                
                const bbCallPct = Math.round(bbCallProb * 100);
                bbCell.style.background = `linear-gradient(to right, 
                    var(--gto-fold) 0%, var(--gto-fold) ${100 - bbCallPct}%, 
                    var(--accent-emerald) ${100 - bbCallPct}%, var(--accent-emerald) 100%)`;
                
                pfBbGrid.appendChild(bbCell);
            }
        }
    }

    // ==========================================
    // KUHN CFR SOLVER TAB
    // ==========================================
    let cfr = null;
    let cfrChartData = [];
    const cfrChartCanvas = document.getElementById('cfr-chart');
    const btnCfrStep = document.getElementById('btn-cfr-step');
    const btnCfrRun = document.getElementById('btn-cfr-run');
    const btnCfrReset = document.getElementById('btn-cfr-reset');
    
    const cfrStatIter = document.getElementById('cfr-stat-iter');
    const cfrStatExploit = document.getElementById('cfr-stat-exploit');
    const cfrStatEv = document.getElementById('cfr-stat-ev');
    const cfrStrategyBody = document.getElementById('cfr-strategy-body');

    function initKuhnCfrView() {
        if (!cfr) {
            resetCfr();
        }
    }

    function resetCfr() {
        cfr = new PokerSolver.KuhnCFR();
        cfrChartData = [];
        updateCfrUI();
        drawConvergenceChart();
    }

    function iterateCfr(steps) {
        for (let i = 0; i < steps; i++) {
            cfr.solveStep();
            
            // Record chart points periodically
            if (cfr.iterations < 200 || cfr.iterations % 100 === 0) {
                let exploit = cfr.getExploitability();
                cfrChartData.push({ x: cfr.iterations, y: exploit });
                // Keep chart data size manageable
                if (cfrChartData.length > 150) {
                    cfrChartData.shift();
                }
            }
        }
        updateCfrUI();
        drawConvergenceChart();
    }

    function updateCfrUI() {
        cfrStatIter.textContent = cfr.iterations;
        
        let exploit = cfr.getExploitability();
        cfrStatExploit.textContent = exploit.toFixed(3);
        
        // P1 EV GTO in Kuhn is -1/18 (-0.0556)
        let ev = cfr.iterations > 0 ? (cfr.p1UtilitySum / cfr.iterations) : 0.0;
        cfrStatEv.textContent = ev.toFixed(2);
        
        // Render Strategy Table
        const report = cfr.getStrategyReport();
        cfrStrategyBody.innerHTML = '';
        
        report.forEach(row => {
            const tr = document.createElement('tr');
            
            const passivePct = Math.round(row.passive * 100);
            const aggressivePct = Math.round(row.aggressive * 100);
            
            tr.innerHTML = `
                <td><strong>${row.label}</strong></td>
                <td><span class="action-tag passive">${row.pName}</span> ${passivePct}%</td>
                <td><span class="action-tag aggressive">${row.aName}</span> ${aggressivePct}%</td>
                <td>
                    <div class="freq-bar-container" style="height: 12px; margin: 0">
                        <div class="freq-segment" style="width: ${passivePct}%; background-color: var(--gto-fold)"></div>
                        <div class="freq-segment" style="width: ${aggressivePct}%; background-color: var(--gto-raise)"></div>
                    </div>
                </td>
            `;
            cfrStrategyBody.appendChild(tr);
        });
    }

    function drawConvergenceChart() {
        const ctx = cfrChartCanvas.getContext('2d');
        const width = cfrChartCanvas.clientWidth;
        const height = cfrChartCanvas.clientHeight;
        
        // Set canvas coordinate size
        cfrChartCanvas.width = width;
        cfrChartCanvas.height = height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Drawing borders and grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        
        // Grid lines
        for (let i = 1; i < 4; i++) {
            let y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        if (cfrChartData.length < 2) {
            // Draw placeholder text
            ctx.fillStyle = '#64748b';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No data. Run solver to plot convergence.', width / 2, height / 2);
            return;
        }
        
        // Scale data points
        const minY = 0;
        const maxY = Math.max(0.5, ...cfrChartData.map(d => d.y));
        const minX = cfrChartData[0].x;
        const maxX = cfrChartData[cfrChartData.length - 1].x;
        
        ctx.beginPath();
        ctx.strokeStyle = 'var(--accent-cyan)';
        ctx.lineWidth = 2;
        
        cfrChartData.forEach((pt, idx) => {
            const cx = ((pt.x - minX) / (maxX - minX)) * (width - 20) + 10;
            const cy = height - ((pt.y - minY) / (maxY - minY)) * (height - 20) - 10;
            
            if (idx === 0) {
                ctx.moveTo(cx, cy);
            } else {
                ctx.lineTo(cx, cy);
            }
        });
        
        ctx.stroke();
    }

    btnCfrStep.addEventListener('click', () => iterateCfr(100));
    btnCfrRun.addEventListener('click', () => {
        btnCfrRun.textContent = 'Solving...';
        btnCfrRun.disabled = true;
        setTimeout(() => {
            iterateCfr(10000);
            btnCfrRun.textContent = 'Run +10,000 Iterations';
            btnCfrRun.disabled = false;
        }, 30);
    });
    btnCfrReset.addEventListener('click', resetCfr);

    // ==========================================
    // INTERACTIVE KUHN POKER GAME
    // ==========================================
    let kuhnGameState = {
        deck: [],
        heroCard: 0,
        oppCard: 0,
        history: "",
        heroActionNeeded: false
    };
    
    const kuhnOppCard = document.getElementById('kuhn-opp-card');
    const kuhnHeroCard = document.getElementById('kuhn-hero-card');
    const kuhnOppAction = document.getElementById('kuhn-opp-action');
    const kuhnPot = document.getElementById('kuhn-pot');
    const kuhnNarrative = document.getElementById('kuhn-narrative');
    const kuhnDealBtn = document.getElementById('kuhn-deal-btn');
    const kuhnHeroActions = document.getElementById('kuhn-hero-actions');
    const kuhnBtnPassive = document.getElementById('kuhn-btn-passive');
    const kuhnBtnAggressive = document.getElementById('kuhn-btn-aggressive');

    kuhnDealBtn.addEventListener('click', startKuhnHand);
    
    function startKuhnHand() {
        // Reset state
        kuhnGameState.deck = [1, 2, 3];
        // Shuffle
        for (let i = 2; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [kuhnGameState.deck[i], kuhnGameState.deck[j]] = [kuhnGameState.deck[j], kuhnGameState.deck[i]];
        }
        
        kuhnGameState.heroCard = kuhnGameState.deck[0];
        kuhnGameState.oppCard = kuhnGameState.deck[1];
        kuhnGameState.history = "";
        kuhnGameState.heroActionNeeded = false;
        
        // UI resets
        kuhnOppAction.textContent = '-';
        kuhnOppCard.style.backgroundColor = '#27272a';
        kuhnOppCard.style.borderColor = '#3f3f46';
        kuhnOppCard.style.color = 'transparent';
        kuhnOppCard.textContent = '?';
        kuhnPot.textContent = 'Pot: 2 Chips';
        
        // Render Hero Card
        renderKuhnCardUI(kuhnHeroCard, kuhnGameState.heroCard);
        
        // Flip a coin to see who goes first
        const heroFirst = Math.random() > 0.5;
        if (heroFirst) {
            kuhnNarrative.textContent = 'You act first. Check or Bet?';
            showKuhnHeroActions('Check', 'Bet');
        } else {
            kuhnNarrative.textContent = 'Opponent acts first. Waiting...';
            kuhnHeroActions.style.display = 'none';
            setTimeout(executeKuhnOpponentAction, 800);
        }
    }

    function renderKuhnCardUI(el, val) {
        el.className = 'card-poker';
        let rankStr = val === 1 ? 'J' : val === 2 ? 'Q' : 'K';
        let suit = val === 1 ? '♠' : val === 2 ? '♥' : '♦';
        let isRed = suit === '♥' || suit === '♦';
        
        el.classList.add(isRed ? 'red-suit' : 'black-suit');
        el.style.backgroundColor = 'white';
        el.style.borderColor = '#e4e4e7';
        el.style.color = isRed ? 'var(--accent-rose)' : '#18181b';
        
        el.innerHTML = `
            <div class="suit-top">${rankStr}<span>${suit}</span></div>
            <div class="suit-bottom">${suit}</div>
        `;
    }

    function showKuhnHeroActions(passiveLabel, aggressiveLabel) {
        kuhnBtnPassive.textContent = passiveLabel;
        kuhnBtnAggressive.textContent = aggressiveLabel;
        kuhnHeroActions.style.display = 'flex';
    }

    kuhnBtnPassive.addEventListener('click', () => handleKuhnPlayerAction(0));
    kuhnBtnAggressive.addEventListener('click', () => handleKuhnPlayerAction(1));

    function handleKuhnPlayerAction(action) {
        kuhnHeroActions.style.display = 'none';
        
        let hist = kuhnGameState.history;
        let nextHist = "";
        
        if (hist === "") nextHist = action === 0 ? "c" : "b";
        else if (hist === "c") nextHist = action === 0 ? "cc" : "cb";
        else if (hist === "b") nextHist = action === 0 ? "bf" : "bc";
        else if (hist === "cb") nextHist = action === 0 ? "cbf" : "cbc";
        
        kuhnGameState.history = nextHist;
        kuhnPot.textContent = `Pot: ${getKuhnPotSize(nextHist)} Chips`;
        
        if (isKuhnTerminal(nextHist)) {
            resolveKuhnShowdown();
        } else {
            kuhnNarrative.textContent = 'Opponent acting...';
            setTimeout(executeKuhnOpponentAction, 800);
        }
    }

    function executeKuhnOpponentAction() {
        const hist = kuhnGameState.history;
        const card = kuhnGameState.oppCard;
        const infoSet = (card === 1 ? "J" : card === 2 ? "Q" : "K") + "_" + hist;
        
        // Find decision probabilities from CFR nodes
        let node = cfr ? cfr.nodeMap[infoSet] : null;
        let betProb = 0.5;
        if (node) {
            betProb = node.getAverageStrategy()[1];
        } else {
            // Default heuristics if CFR has not run yet
            if (infoSet.startsWith('J')) betProb = hist === "" ? 0.3 : 0.0;
            if (infoSet.startsWith('Q')) betProb = hist === "b" ? 0.3 : (hist === "cb" ? 0.3 : 0.0);
            if (infoSet.startsWith('K')) betProb = 1.0;
        }
        
        const action = Math.random() < betProb ? 1 : 0;
        let nextHist = "";
        let actionName = "";
        
        if (hist === "") {
            nextHist = action === 0 ? "c" : "b";
            actionName = action === 0 ? "Check" : "Bet 1 Chip";
        } else if (hist === "c") {
            nextHist = action === 0 ? "cc" : "cb";
            actionName = action === 0 ? "Check" : "Bet 1 Chip";
        } else if (hist === "b") {
            nextHist = action === 0 ? "bf" : "bc";
            actionName = action === 0 ? "Fold" : "Call 1 Chip";
        } else if (hist === "cb") {
            nextHist = action === 0 ? "cbf" : "cbc";
            actionName = action === 0 ? "Fold" : "Call 1 Chip";
        }
        
        kuhnOppAction.textContent = actionName;
        kuhnGameState.history = nextHist;
        kuhnPot.textContent = `Pot: ${getKuhnPotSize(nextHist)} Chips`;
        
        if (isKuhnTerminal(nextHist)) {
            resolveKuhnShowdown();
        } else {
            // Player acts next
            if (nextHist === "c") {
                kuhnNarrative.textContent = 'Opponent checked. Check or Bet?';
                showKuhnHeroActions('Check', 'Bet');
            } else if (nextHist === "b") {
                kuhnNarrative.textContent = 'Opponent bet 1 chip. Fold or Call?';
                showKuhnHeroActions('Fold', 'Call');
            } else if (nextHist === "cb") {
                kuhnNarrative.textContent = 'Opponent bet 1 chip after you checked. Fold or Call?';
                showKuhnHeroActions('Fold', 'Call');
            }
        }
    }

    function isKuhnTerminal(h) {
        return h === "cc" || h === "bf" || h === "bc" || h === "cbf" || h === "cbc";
    }

    function getKuhnPotSize(h) {
        if (h === "cc" || h === "bf" || h === "cbf") return 2;
        return 4;
    }

    function resolveKuhnShowdown() {
        const h = kuhnGameState.history;
        const hero = kuhnGameState.heroCard;
        const opp = kuhnGameState.oppCard;
        
        renderKuhnCardUI(kuhnOppCard, opp);
        
        let heroWins = false;
        let profit = 0;
        
        if (h === "cc") {
            heroWins = hero > opp;
            profit = heroWins ? 1 : -1;
            kuhnNarrative.textContent = heroWins ? `You Win! Checkdown with higher card. (+1 Chip)` : `You Lose! Opponent has higher card. (-1 Chip)`;
        } else if (h === "bf") {
            // Hero bet, Opponent folded. Hero wins pot.
            kuhnNarrative.textContent = `You Win! You betted and opponent folded. (+1 Chip)`;
        } else if (h === "bc") {
            heroWins = hero > opp;
            profit = heroWins ? 2 : -2;
            kuhnNarrative.textContent = heroWins ? `You Win! Hero bet and was called. Showdown won. (+2 Chips)` : `You Lose! Hero bet and was called. Showdown lost. (-2 Chips)`;
        } else if (h === "cbf") {
            // Hero checked, Opponent bet, Hero folded. Opponent wins pot.
            kuhnNarrative.textContent = `You Lose! You checked and folded to opponent's bet. (-1 Chip)`;
        } else if (h === "cbc") {
            heroWins = hero > opp;
            profit = heroWins ? 2 : -2;
            kuhnNarrative.textContent = heroWins ? `You Win! You check-called opponent's bet and won showdown. (+2 Chips)` : `You Lose! You check-called opponent's bet and lost showdown. (-2 Chips)`;
        }
    }
});
