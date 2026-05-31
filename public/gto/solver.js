// solver.js - The Algorithmic Engine for GTO Poker Solver & Trainer

const CARDS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Helper to get hand representation
function getHandString(r, c) {
    if (r === c) return CARDS[r] + CARDS[c];
    if (r < c) return CARDS[r] + CARDS[c] + 's';
    return CARDS[c] + CARDS[r] + 'o';
}

// Combo count for weighted averages
function getComboCount(r, c) {
    if (r === c) return 6;  // pocket pairs
    if (r < c) return 4;   // suited
    return 12;             // offsuit
}

// Parses string like "AA:0:0:100,KK:0:10:90" into grid of [Fold%, Call%, Raise%]
function parseRange(str) {
    let range = Array(13).fill(0).map(() => Array(13).fill(null).map(() => [1.0, 0, 0])); // Default is Fold 100%
    if (!str) return range;
    let parts = str.split(',');
    for (let part of parts) {
        let trimmed = part.trim();
        if (!trimmed) continue;
        let [hand, f, c, r] = trimmed.split(':');
        let foldVal = parseFloat(f) / 100;
        let callVal = parseFloat(c) / 100;
        let raiseVal = parseFloat(r) / 100;
        
        let found = false;
        for (let ri = 0; ri < 13; ri++) {
            for (let ci = 0; ci < 13; ci++) {
                if (getHandString(ri, ci) === hand) {
                    range[ri][ci] = [foldVal, callVal, raiseVal];
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
    }
    return range;
}

// High-fidelity GTO preflop ranges (Fold:Call:Raise)
const GTO_RANGES_DATA = {
    // 6-Max 100BB Cash: UTG Open range (~15% of hands)
    'UTG_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:0:100,TT:0:0:100,99:0:0:100,88:0:0:90,77:0:0:50,66:0:0:20,55:50:0:50,44:80:0:20,AKs:0:0:100,AQs:0:0:100,AJs:0:0:100,ATs:0:0:100,A9s:0:0:80,A8s:30:0:70,A7s:70:0:30,A6s:80:0:20,A5s:0:0:100,A4s:0:0:80,A3s:40:0:60,A2s:50:0:50,KQs:0:0:100,KJs:0:0:100,KTs:0:0:90,K9s:50:0:50,K8s:80:0:20,QJs:0:0:100,QTs:0:0:90,Q9s:70:0:30,JTs:0:0:100,J9s:50:0:50,T9s:0:0:90,T8s:80:0:20,98s:0:0:70,87s:20:0:80,76s:30:0:70,65s:50:0:50,54s:70:0:30,AKo:0:0:100,AQo:0:0:100,AJo:0:0:80,ATo:70:0:30,KQo:0:0:90,KJo:80:0:20,QJo:90:0:10',
    
    // HJ Open range (~20% of hands)
    'HJ_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:0:100,TT:0:0:100,99:0:0:100,88:0:0:100,77:0:0:80,66:0:0:50,55:0:0:40,44:50:0:50,33:70:0:30,22:80:0:20,AKs:0:0:100,AQs:0:0:100,AJs:0:0:100,ATs:0:0:100,A9s:0:0:100,A8s:0:0:90,A7s:30:0:70,A6s:50:0:50,A5s:0:0:100,A4s:0:0:100,A3s:0:0:90,A2s:0:0:80,KQs:0:0:100,KJs:0:0:100,KTs:0:0:100,K9s:0:0:80,K8s:50:0:50,K7s:80:0:20,QJs:0:0:100,QTs:0:0:100,Q9s:30:0:70,Q8s:80:0:20,JTs:0:0:100,J9s:0:0:80,T9s:0:0:100,T8s:50:0:50,98s:0:0:90,87s:0:0:90,76s:0:0:80,65s:20:0:80,54s:40:0:60,AKo:0:0:100,AQo:0:0:100,AJo:0:0:100,ATo:30:0:70,A9o:90:0:10,KQo:0:0:100,KJo:50:0:50,KTo:80:0:20,QJo:60:0:40',
    
    // CO Open range (~26% of hands)
    'CO_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:0:100,TT:0:0:100,99:0:0:100,88:0:0:100,77:0:0:100,66:0:0:90,55:0:0:80,44:0:0:70,33:20:0:80,22:40:0:60,AKs:0:0:100,AQs:0:0:100,AJs:0:0:100,ATs:0:0:100,A9s:0:0:100,A8s:0:0:100,A7s:0:0:100,A6s:0:0:90,A5s:0:0:100,A4s:0:0:100,A3s:0:0:100,A2s:0:0:100,KQs:0:0:100,KJs:0:0:100,KTs:0:0:100,K9s:0:0:100,K8s:0:0:80,K7s:50:0:50,K6s:70:0:30,QJs:0:0:100,QTs:0:0:100,Q9s:0:0:90,Q8s:30:0:70,Q7s:80:0:20,JTs:0:0:100,J9s:0:0:100,J8s:40:0:60,T9s:0:0:100,T8s:0:0:90,T7s:80:0:20,98s:0:0:100,97s:40:0:60,87s:0:0:100,86s:50:0:50,76s:0:0:100,75s:60:0:40,65s:0:0:100,54s:0:0:90,43s:80:0:20,AKo:0:0:100,AQo:0:0:100,AJo:0:0:100,ATo:0:0:90,A9o:70:0:30,KQo:0:0:100,KJo:0:0:80,KTo:30:0:70,K9o:90:0:10,QJo:0:0:80,QTo:40:0:60,JTo:60:0:40',
    
    // BTN Open range (~40% of hands)
    'BTN_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:0:100,TT:0:0:100,99:0:0:100,88:0:0:100,77:0:0:100,66:0:0:100,55:0:0:100,44:0:0:100,33:0:0:100,22:0:0:100,AKs:0:0:100,AQs:0:0:100,AJs:0:0:100,ATs:0:0:100,A9s:0:0:100,A8s:0:0:100,A7s:0:0:100,A6s:0:0:100,A5s:0:0:100,A4s:0:0:100,A3s:0:0:100,A2s:0:0:100,KQs:0:0:100,KJs:0:0:100,KTs:0:0:100,K9s:0:0:100,K8s:0:0:100,K7s:0:0:90,K6s:0:0:80,K5s:0:0:70,K4s:20:0:80,K3s:40:0:60,K2s:50:0:50,QJs:0:0:100,QTs:0:0:100,Q9s:0:0:100,Q8s:0:0:90,Q7s:0:0:80,Q6s:30:0:70,Q5s:50:0:50,Q4s:70:0:30,JTs:0:0:100,J9s:0:0:100,J8s:0:0:90,J7s:40:0:60,J6s:70:0:30,T9s:0:0:100,T8s:0:0:100,T7s:0:0:80,T6s:60:0:40,98s:0:0:100,97s:0:0:90,96s:50:0:50,87s:0:0:100,86s:0:0:90,85s:60:0:40,76s:0:0:100,75s:0:0:80,65s:0:0:100,64s:30:0:70,54s:0:0:100,53s:40:0:60,43s:0:0:80,32s:80:0:20,AKo:0:0:100,AQo:0:0:100,AJo:0:0:100,ATo:0:0:100,A9o:0:0:90,A8o:30:0:70,A7o:50:0:50,A5o:60:0:40,KQo:0:0:100,KJo:0:0:100,KTo:0:0:90,K9o:40:0:60,QJo:0:0:100,QTo:0:0:90,Q9o:60:0:40,JTo:0:0:80,J9o:60:0:40,T9o:50:0:50,98o:70:0:30,87o:80:0:20',
    
    // SB Open range (~44% of hands)
    'SB_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:0:100,TT:0:0:100,99:0:0:100,88:0:0:100,77:0:0:100,66:0:0:100,55:0:0:100,44:0:0:100,33:0:0:100,22:0:0:100,AKs:0:0:100,AQs:0:0:100,AJs:0:0:100,ATs:0:0:100,A9s:0:0:100,A8s:0:0:100,A7s:0:0:100,A6s:0:0:100,A5s:0:0:100,A4s:0:0:100,A3s:0:0:100,A2s:0:0:100,KQs:0:0:100,KJs:0:0:100,KTs:0:0:100,K9s:0:0:100,K8s:0:0:100,K7s:0:0:100,K6s:0:0:90,K5s:0:0:80,K4s:0:0:70,K3s:20:0:80,K2s:30:0:70,QJs:0:0:100,QTs:0:0:100,Q9s:0:0:100,Q8s:0:0:100,Q7s:0:0:80,Q6s:0:0:70,Q5s:30:0:70,Q4s:50:0:50,JTs:0:0:100,J9s:0:0:100,J8s:0:0:90,J7s:0:0:80,J6s:40:0:60,T9s:0:0:100,T8s:0:0:100,T7s:0:0:90,T6s:30:0:70,98s:0:0:100,97s:0:0:100,96s:0:0:80,87s:0:0:100,86s:0:0:90,85s:40:0:60,76s:0:0:100,75s:0:0:90,65s:0:0:100,64s:0:0:80,54s:0:0:100,53s:0:0:80,43s:0:0:90,32s:60:0:40,AKo:0:0:100,AQo:0:0:100,AJo:0:0:100,ATo:0:0:100,A9o:0:0:90,A8o:0:0:70,A7o:20:0:80,A6o:50:0:50,A5o:30:0:70,A4o:50:0:50,A3o:60:0:40,A2o:70:0:30,KQo:0:0:100,KJo:0:0:100,KTo:0:0:100,K9o:0:0:80,K8o:40:0:60,QJo:0:0:100,QTo:0:0:100,Q9o:0:0:80,JTo:0:0:100,J9o:0:0:80,T9o:0:0:80,T8o:60:0:40,98o:0:0:80,87o:30:0:70,76o:50:0:50,65o:60:0:40',
    
    // BTN defense vs UTG open (Fold:Call:3Bet)
    'BTN_vs_UTG_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:30:70,TT:0:60:40,99:0:80:20,88:10:90:0,77:30:70:0,66:50:50:0,55:70:30:0,AKs:0:0:100,AQs:0:50:50,AJs:0:80:20,ATs:0:90:10,A5s:20:0:80,A4s:40:0:60,A3s:50:0:50,KQs:0:80:20,KJs:0:90:10,KTs:20:80:0,QJs:0:90:10,QTs:10:90:0,JTs:0:100:0,T9s:10:90:0,98s:20:80:0,87s:30:70:0,76s:50:50:0,65s:60:40:0,AKo:0:30:70,AQo:20:70:10,AJo:80:20:0,KQo:40:60:0',
    
    // BB defense vs BTN open (Fold:Call:3Bet)
    'BB_vs_BTN_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:0:100,TT:0:0:100,99:0:20:80,88:0:80:20,77:0:90:10,66:0:100:0,55:0:100:0,44:0:100:0,33:0:100:0,22:0:100:0,AKs:0:0:100,AQs:0:0:100,AJs:0:0:100,ATs:0:30:70,A9s:0:80:20,A8s:0:90:10,A7s:0:100:0,A6s:0:100:0,A5s:0:30:70,A4s:0:40:60,A3s:0:50:50,A2s:0:60:40,KQs:0:20:80,KJs:0:60:40,KTs:0:80:20,K9s:0:90:10,K8s:0:100:0,K7s:0:100:0,K6s:0:100:0,K5s:0:100:0,K4s:10:90:0,K3s:20:80:0,K2s:30:70:0,QJs:0:60:40,QTs:0:80:20,Q9s:0:90:10,Q8s:0:100:0,Q7s:0:100:0,Q6s:10:90:0,Q5s:20:80:0,Q4s:40:60:0,JTs:0:80:20,J9s:0:90:10,J8s:0:100:0,J7s:10:90:0,J6s:30:70:0,J5s:40:60:0,T9s:0:90:10,T8s:0:100:0,T7s:0:100:0,T6s:20:80:0,T5s:40:60:0,98s:0:90:10,97s:0:100:0,96s:10:90:0,87s:0:95:5,86s:0:100:0,85s:20:80:0,76s:0:95:5,75s:10:90:0,65s:0:100:0,64s:20:80:0,54s:0:100:0,53s:30:70:0,43s:20:80:0,32s:50:50:0,AKo:0:0:100,AQo:0:30:70,AJo:0:60:40,ATo:0:70:30,A9o:0:90:10,A8o:10:90:0,A7o:20:80:0,A6o:30:70:0,A5o:20:70:10,A4o:40:60:0,A3o:50:50:0,A2o:50:50:0,KQo:0:60:40,KJo:0:80:20,KTo:0:90:10,K9o:20:80:0,K8o:40:60:0,QJo:0:85:15,QTo:0:90:10,Q9o:30:70:0,JTo:0:90:10,J9o:20:80:0,T9o:10:90:0,98o:30:70:0,87o:50:50:0,76o:60:40:0',
    
    // SB defense vs BTN open (Fold:Call:3Bet)
    'SB_vs_BTN_Open': 'AA:0:0:100,KK:0:0:100,QQ:0:0:100,JJ:0:0:100,TT:0:10:90,99:0:30:70,88:0:40:60,77:0:50:50,66:20:40:40,55:30:30:40,44:40:20:40,33:50:10:40,22:60:0:40,AKs:0:0:100,AQs:0:0:100,AJs:0:0:100,ATs:0:10:90,A9s:0:30:70,A8s:0:40:60,A7s:0:50:50,A5s:0:0:100,A4s:0:20:80,A3s:0:30:70,A2s:0:40:60,KQs:0:20:80,KJs:0:40:60,KTs:0:50:50,K9s:10:40:50,K8s:20:30:50,K7s:40:10:50,QJs:0:40:60,QTs:0:50:50,Q9s:10:40:50,Q8s:30:20:50,JTs:0:50:50,J9s:10:45:45,J8s:30:20:50,T9s:0:50:50,T8s:15:40:45,98s:0:50:50,97s:20:35:45,87s:0:55:45,76s:0:60:40,65s:20:50:30,54s:30:40:30,AKo:0:0:100,AQo:0:0:100,AJo:0:10:90,ATo:10:30:60,A9o:40:10:50,A8o:60:0:40,KQo:0:20:80,KJo:10:30:60,KTo:30:20:50,QJo:20:30:50,QTo:40:10:50,JTo:30:20:50'
};

// Hand-to-hand equity model for Texas Hold'em
function getHandToHandEquity(r1, c1, r2, c2) {
    let v1_high = 14 - Math.min(r1, c1);
    let v1_low = 14 - Math.max(r1, c1);
    let v2_high = 14 - Math.min(r2, c2);
    let v2_low = 14 - Math.max(r2, c2);
    
    let pair1 = r1 === c1;
    let pair2 = r2 === c2;
    let suited1 = r1 < c1;
    let suited2 = r2 < c2;
    
    if (pair1 && pair2) {
        if (v1_high > v2_high) return 0.81;
        if (v1_high < v2_high) return 0.19;
        return 0.50;
    }
    
    if (pair1 && !pair2) {
        if (v1_high > v2_high) return 0.82; // Overpair vs lower cards
        if (v1_high < v2_low) return 0.55;  // Underpair vs higher cards
        return 0.70; // Pair split
    }
    
    if (!pair1 && pair2) {
        if (v2_high > v1_high) return 0.18;
        if (v2_high < v1_low) return 0.45;
        return 0.30;
    }
    
    // Both are non-pairs
    if (v1_high === v2_high && v1_low === v2_low) {
        let eq = 0.50;
        if (suited1 && !suited2) eq += 0.04;
        if (!suited1 && suited2) eq -= 0.04;
        return eq;
    }
    
    let eq = 0.50;
    if (v1_high > v2_high && v1_low > v2_low) {
        eq = 0.62;
    } else if (v1_high < v2_high && v1_low < v2_low) {
        eq = 0.38;
    } else {
        eq = 0.55;
    }
    
    if (v1_high === v2_high) {
        eq = v1_low > v2_low ? 0.70 : 0.30;
    } else if (v1_low === v2_low) {
        eq = v1_high > v2_high ? 0.60 : 0.40;
    } else if (v1_high === v2_low) {
        eq = 0.32; 
    } else if (v1_low === v2_high) {
        eq = 0.68;
    }
    
    if (suited1) eq += 0.035;
    if (suited2) eq -= 0.035;
    
    return Math.min(0.95, Math.max(0.05, eq));
}

// Push/Fold Nash Equilibrium Solver using Fictitious Play
function solvePushFold(stack, iterations = 120) {
    let sbRange = Array(13).fill(0).map(() => Array(13).fill(1.0)); // Pushing range
    let bbRange = Array(13).fill(0).map(() => Array(13).fill(0.5)); // Calling range
    
    let sbSum = Array(13).fill(0).map(() => Array(13).fill(0.0));
    let bbSum = Array(13).fill(0).map(() => Array(13).fill(0.0));
    
    for (let iter = 1; iter <= iterations; iter++) {
        let totalPushingCombos = 0;
        for (let r1 = 0; r1 < 13; r1++) {
            for (let c1 = 0; c1 < 13; c1++) {
                totalPushingCombos += sbRange[r1][c1] * getComboCount(r1, c1);
            }
        }
        
        let nextBB = Array(13).fill(0).map(() => Array(13).fill(0.0));
        let nextSB = Array(13).fill(0).map(() => Array(13).fill(0.0));
        
        if (totalPushingCombos === 0) {
            nextBB = Array(13).fill(0).map(() => Array(13).fill(0.0));
        } else {
            for (let r2 = 0; r2 < 13; r2++) {
                for (let c2 = 0; c2 < 13; c2++) {
                    let weightedEquitySum = 0;
                    for (let r1 = 0; r1 < 13; r1++) {
                        for (let c1 = 0; c1 < 13; c1++) {
                            let weight = sbRange[r1][c1] * getComboCount(r1, c1);
                            if (weight > 0) {
                                let eqBB = 1.0 - getHandToHandEquity(r1, c1, r2, c2);
                                weightedEquitySum += weight * eqBB;
                            }
                        }
                    }
                    let avgEquity = weightedEquitySum / totalPushingCombos;
                    let evCall = avgEquity * (2 * stack) - stack;
                    let evFold = -1.0;
                    nextBB[r2][c2] = evCall > evFold ? 1.0 : 0.0;
                }
            }
        }
        
        let totalBBCallCombos = 0;
        for (let r2 = 0; r2 < 13; r2++) {
            for (let c2 = 0; c2 < 13; c2++) {
                totalBBCallCombos += bbRange[r2][c2] * getComboCount(r2, c2);
            }
        }
        let pCallBB = totalBBCallCombos / 1326;
        
        for (let r1 = 0; r1 < 13; r1++) {
            for (let c1 = 0; c1 < 13; c1++) {
                let evPush = 0;
                if (pCallBB === 0) {
                    evPush = 1.0;
                } else {
                    let weightedEquitySum = 0;
                    for (let r2 = 0; r2 < 13; r2++) {
                        for (let c2 = 0; c2 < 13; c2++) {
                            let weight = bbRange[r2][c2] * getComboCount(r2, c2);
                            if (weight > 0) {
                                let eqSB = getHandToHandEquity(r1, c1, r2, c2);
                                weightedEquitySum += weight * (eqSB * 2 * stack - stack);
                            }
                        }
                    }
                    evPush = (1.0 - pCallBB) * 1.0 + (weightedEquitySum / 1326);
                }
                nextSB[r1][c1] = evPush > -0.5 ? 1.0 : 0.0;
            }
        }
        
        for (let r = 0; r < 13; r++) {
            for (let c = 0; c < 13; c++) {
                sbSum[r][c] += nextSB[r][c];
                bbSum[r][c] += nextBB[r][c];
                
                sbRange[r][c] = sbSum[r][c] / iter;
                bbRange[r][c] = bbSum[r][c] / iter;
            }
        }
    }
    
    return {
        sbRange: sbRange,
        bbRange: bbRange
    };
}

// ==========================================
// KUHN POKER CFR SOLVER
// ==========================================

class KuhnNode {
    constructor(actionCount = 2) {
        this.regretSum = Array(actionCount).fill(0);
        this.strategy = Array(actionCount).fill(0);
        this.strategySum = Array(actionCount).fill(0);
    }
    
    getStrategy(realizationWeight) {
        let normalizingSum = 0;
        for (let a = 0; a < 2; a++) {
            this.strategy[a] = this.regretSum[a] > 0 ? this.regretSum[a] : 0;
            normalizingSum += this.strategy[a];
        }
        for (let a = 0; a < 2; a++) {
            if (normalizingSum > 0) {
                this.strategy[a] /= normalizingSum;
            } else {
                this.strategy[a] = 0.5; // Uniform
            }
            this.strategySum[a] += realizationWeight * this.strategy[a];
        }
        return this.strategy;
    }
    
    getAverageStrategy() {
        let avgStrategy = Array(2).fill(0);
        let normalizingSum = 0;
        for (let a = 0; a < 2; a++) {
            normalizingSum += this.strategySum[a];
        }
        for (let a = 0; a < 2; a++) {
            if (normalizingSum > 0) {
                avgStrategy[a] = this.strategySum[a] / normalizingSum;
            } else {
                avgStrategy[a] = 0.5;
            }
        }
        return avgStrategy;
    }
}

class KuhnCFR {
    constructor() {
        this.nodeMap = {}; // infoSet key -> KuhnNode
        this.iterations = 0;
        this.p1UtilitySum = 0;
    }
    
    solveStep() {
        let cards = [1, 2, 3]; // J=1, Q=2, K=3
        // Shuffle cards (Fisher-Yates)
        for (let i = cards.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        
        this.p1UtilitySum += this.cfr(cards, "", 1.0, 1.0);
        this.iterations++;
    }
    
    cfr(cards, history, p0, p1) {
        let plays = history.length;
        let player = plays % 2;
        let opponent = 1 - player;
        
        // Return payoff if terminal node
        if (plays >= 2) {
            let isShowdown = history[plays - 1] === 'c' && history[plays - 2] === 'c';
            let isPassBetPass = history[plays - 1] === 'c' && history[plays - 2] === 'b'; // Fold to check-bet
            let isBetCall = history[plays - 1] === 'c' && history[plays - 2] === 'b' && plays === 2; // Wait, let's look at history:
            
            // Let's explicitly trace terminal states:
            // "cc": P1 check, P2 check. Showdown.
            // "bf": P1 bet, P2 fold. P1 wins +1.
            // "bc": P1 bet, P2 call. Showdown. Pot 2.
            // "cbc": P1 check, P2 bet, P1 call. Showdown. Pot 2.
            // "cbf": P1 check, P2 bet, P1 fold. P2 wins +1.
            
            if (history === "cc") {
                return cards[0] > cards[1] ? 1 : -1;
            }
            if (history === "bf") {
                return 1; // P1 wins 1
            }
            if (history === "bc") {
                return cards[0] > cards[1] ? 2 : -2;
            }
            if (history === "cbf") {
                return -1; // P1 folds, P2 wins 1
            }
            if (history === "cbc") {
                return cards[0] > cards[1] ? 2 : -2;
            }
        }
        
        // Get active player's card
        let card = cards[player];
        // InfoSet representation: e.g. "J_c"
        let infoSet = (card === 1 ? "J" : card === 2 ? "Q" : "K") + "_" + history;
        
        // Node lookup
        let node = this.nodeMap[infoSet];
        if (!node) {
            node = new KuhnNode();
            this.nodeMap[infoSet] = node;
        }
        
        // Get strategy
        let strategy = node.getStrategy(player === 0 ? p0 : p1);
        let util = Array(2).fill(0);
        let nodeUtil = 0;
        
        for (let a = 0; a < 2; a++) {
            let nextHistory = history + (a === 0 ? (history === "" || history === "c" ? "c" : "f") : (history === "" || history === "c" ? "b" : "c"));
            // Wait, mapping action index:
            // For P1 first action (empty history): Action 0 = Check ("c"), Action 1 = Bet ("b").
            // For P2 after P1 checks ("c"): Action 0 = Check ("cc" -> terminal), Action 1 = Bet ("cb").
            // For P2 after P1 bets ("b"): Action 0 = Fold ("bf" -> terminal), Action 1 = Call ("bc" -> terminal).
            // For P1 after check-bet ("cb"): Action 0 = Fold ("cbf" -> terminal), Action 1 = Call ("cbc" -> terminal).
            // Let's verify mapping:
            // Action 0 = Passive (Check/Fold), Action 1 = Aggressive (Bet/Call).
            // So:
            // If history === "": Action 0 -> "c", Action 1 -> "b"
            // If history === "c": Action 0 -> "cc" (terminal), Action 1 -> "cb"
            // If history === "b": Action 0 -> "bf" (terminal), Action 1 -> "bc"
            // If history === "cb": Action 0 -> "cbf" (terminal), Action 1 -> "cbc"
            
            let nextHist = "";
            if (history === "") nextHist = a === 0 ? "c" : "b";
            else if (history === "c") nextHist = a === 0 ? "cc" : "cb";
            else if (history === "b") nextHist = a === 0 ? "bf" : "bc";
            else if (history === "cb") nextHist = a === 0 ? "cbf" : "cbc";
            
            if (player === 0) {
                util[a] = this.cfr(cards, nextHist, p0 * strategy[a], p1);
            } else {
                util[a] = this.cfr(cards, nextHist, p0, p1 * strategy[a]);
            }
            nodeUtil += strategy[a] * util[a];
        }
        
        // Accumulate regrets
        for (let a = 0; a < 2; a++) {
            let regret = (player === 0 ? 1 : -1) * (util[a] - nodeUtil);
            node.regretSum[a] += (player === 0 ? p1 : p0) * regret;
        }
        
        return nodeUtil;
    }
    
    // Calculates the Nash distance / exploitability of current strategy
    // We can compare the average strategy to the known analytical Kuhn GTO strategy:
    // P1 average:
    // J: Bet 1/3 (Pass 2/3)
    // Q: Check 100% (Bet 0%)
    // K: Bet 100% (Pass 0%)
    // J_cb: Fold 100% (Call 0%)
    // Q_cb: Call 1/3 (Fold 2/3)
    // K_cb: Call 100% (Fold 0%)
    //
    // P2 average:
    // J_c: Bet 1/3 (Pass 2/3)
    // Q_c: Check 100% (Bet 0%)
    // K_c: Bet 100% (Pass 0%)
    // J_b: Fold 100% (Call 0%)
    // Q_b: Call 1/3 (Fold 2/3)
    // K_b: Call 100% (Fold 0%)
    // Wait, let's write a simple distance calculator
    getExploitability() {
        // Known Nash Equilibrium values for bet percentages:
        const NASH = {
            'J_': 1/3, 'Q_': 0, 'K_': 1,
            'J_cb': 0, 'Q_cb': 1/3, 'K_cb': 1,
            'J_c': 1/3, 'Q_c': 0, 'K_c': 1,
            'J_b': 0, 'Q_b': 1/3, 'K_b': 1
        };
        
        let sumSquaredDiff = 0;
        let countedNodes = 0;
        
        for (let key in NASH) {
            let node = this.nodeMap[key];
            let avgBet = 0.5;
            if (node) {
                let avgStrat = node.getAverageStrategy();
                avgBet = avgStrat[1]; // Index 1 is Bet/Call
            }
            sumSquaredDiff += Math.pow(avgBet - NASH[key], 2);
            countedNodes++;
        }
        
        // Return root mean square error (RMSE) as distance metric
        // Divided by a factor so it behaves as an exploitability metric starting high and going down to 0
        return Math.sqrt(sumSquaredDiff / countedNodes) * 0.4;
    }
    
    getStrategyReport() {
        let report = [];
        const keys = [
            { id: 'J_', label: 'P1: Jack (Initial)', act0: 'Check', act1: 'Bet' },
            { id: 'Q_', label: 'P1: Queen (Initial)', act0: 'Check', act1: 'Bet' },
            { id: 'K_', label: 'P1: King (Initial)', act0: 'Check', act1: 'Bet' },
            { id: 'J_cb', label: 'P1: Jack vs Bet', act0: 'Fold', act1: 'Call' },
            { id: 'Q_cb', label: 'P1: Queen vs Bet', act0: 'Fold', act1: 'Call' },
            { id: 'K_cb', label: 'P1: King vs Bet', act0: 'Fold', act1: 'Call' },
            { id: 'J_c', label: 'P2: Jack vs Check', act0: 'Check', act1: 'Bet' },
            { id: 'Q_c', label: 'P2: Queen vs Check', act0: 'Check', act1: 'Bet' },
            { id: 'K_c', label: 'P2: King vs Check', act0: 'Check', act1: 'Bet' },
            { id: 'J_b', label: 'P2: Jack vs Bet', act0: 'Fold', act1: 'Call' },
            { id: 'Q_b', label: 'P2: Queen vs Bet', act0: 'Fold', act1: 'Call' },
            { id: 'K_b', label: 'P2: King vs Bet', act0: 'Fold', act1: 'Call' }
        ];
        
        for (let item of keys) {
            let node = this.nodeMap[item.id];
            let avgStrat = node ? node.getAverageStrategy() : [0.5, 0.5];
            report.push({
                label: item.label,
                passive: avgStrat[0],
                aggressive: avgStrat[1],
                pName: item.act0,
                aName: item.act1
            });
        }
        return report;
    }
}

// Dynamic Preflop GTO Range Generator (supporting MTT/Cash, HU/6max/9max, stacks 10BB to 1000BB, custom actions)
function generateGTORange(config, actionHistory, activePosition) {
    let range = Array(13).fill(0).map(() => Array(13).fill(null).map(() => [1.0, 0, 0]));
    
    let opens = actionHistory.filter(a => a.action === "OPEN" || a.action === "RAISE");
    let threeBets = actionHistory.filter(a => a.action === "3BET");
    
    let gameType = config.gameType || "CASH";
    let tableSize = config.tableSize || "6MAX";
    let stack = parseFloat(config.stackBB) || 100;
    
    if (threeBets.length > 0) {
        let last3Bet = threeBets[threeBets.length - 1];
        let raiseSize = last3Bet.size || 9.0;
        let mdf = 1.0 / (1.0 + (raiseSize / stack));
        let baseDefPct = Math.min(0.35, Math.max(0.12, mdf * 0.4));
        
        if (activePosition === "BTN" || activePosition === "CO") baseDefPct += 0.05;
        if (activePosition === "SB") baseDefPct -= 0.03;
        if (stack > 300) baseDefPct += 0.03;
        if (stack < 30) baseDefPct -= 0.05;
        if (gameType === "MTT") baseDefPct += 0.03;
        
        for (let r = 0; r < 13; r++) {
            for (let c = 0; c < 13; c++) {
                let strength = getCustomHandStrength(r, c, stack);
                let isPremium = strength > 140;
                let isMediumPlayable = strength > 115 && strength <= 140;
                
                let f = 1.0, cl = 0, ra = 0;
                if (isPremium) {
                    if (strength > 160) { ra = 0.8; cl = 0.2; f = 0; }
                    else { ra = 0.4; cl = 0.6; f = 0; }
                } else if (isMediumPlayable) {
                    if (stack > 150) { cl = 0.5; f = 0.5; }
                    else if (stack < 30) { ra = 0.2; f = 0.8; }
                    else { cl = 0.3; f = 0.7; }
                }
                range[r][c] = [f, cl, ra];
            }
        }
    }
    else if (opens.length > 0) {
        let lastOpen = opens[0];
        let raiseSize = lastOpen.size || 2.5;
        let baseDefPct = 0.25;
        
        if (activePosition === "BB") {
            baseDefPct = 0.45;
            if (raiseSize <= 2.1) baseDefPct += 0.10;
            if (raiseSize >= 3.0) baseDefPct -= 0.10;
            if (gameType === "MTT") baseDefPct += 0.15;
            if (gameType === "CASH") baseDefPct -= 0.05;
        } else if (activePosition === "SB") {
            baseDefPct = 0.15;
        } else if (activePosition === "BTN") {
            baseDefPct = 0.20;
        }
        
        if (stack < 25) baseDefPct *= 0.8;
        
        for (let r = 0; r < 13; r++) {
            for (let c = 0; c < 13; c++) {
                let strength = getCustomHandStrength(r, c, stack);
                let f = 1.0, cl = 0, ra = 0;
                
                let isPremium = strength >= 145;
                let isCallRange = strength >= 105 && strength < 145;
                let isMarginalDef = strength >= 85 && strength < 105;
                
                if (activePosition === "BB") {
                    if (strength >= 155) { ra = 0.5; cl = 0.5; f = 0; }
                    else if (strength >= 75) { cl = 0.95; f = 0.05; }
                    else if (strength >= 60 && gameType === "MTT") { cl = 0.7; f = 0.3; }
                } else if (activePosition === "SB") {
                    if (isPremium) { ra = 0.8; cl = 0.2; f = 0; }
                    else if (strength >= 115) { ra = 0.4; cl = 0.1; f = 0.5; }
                } else {
                    if (isPremium) { ra = 0.6; cl = 0.4; f = 0; }
                    else if (isCallRange) { cl = 0.8; f = 0.2; }
                    else if (isMarginalDef) { cl = 0.4; f = 0.6; }
                }
                
                if (stack < 15 && activePosition !== "BB") {
                    let totalDef = ra + cl;
                    ra = totalDef > 0.4 ? 1.0 : 0.0;
                    cl = 0;
                    f = 1.0 - ra;
                }
                range[r][c] = [f, cl, ra];
            }
        }
    }
    else {
        let openPct = 0.20;
        let pos = activePosition;
        
        if (tableSize === "9MAX") {
            if (pos === "UTG") openPct = 0.09;
            else if (pos === "UTG1" || pos === "UTG+1") openPct = 0.10;
            else if (pos === "MP") openPct = 0.12;
            else if (pos === "LJ") openPct = 0.15;
            else if (pos === "HJ") openPct = 0.19;
            else if (pos === "CO") openPct = 0.25;
            else if (pos === "BTN") openPct = 0.38;
            else if (pos === "SB") openPct = 0.42;
            else if (pos === "BB") openPct = 0;
        } else if (tableSize === "6MAX") {
            if (pos === "UTG") openPct = 0.15;
            else if (pos === "HJ") openPct = 0.19;
            else if (pos === "CO") openPct = 0.25;
            else if (pos === "BTN") openPct = 0.38;
            else if (pos === "SB") openPct = 0.42;
            else if (pos === "BB") openPct = 0;
        } else if (tableSize === "2MAX") {
            if (pos === "SB" || pos === "BTN") openPct = 0.80;
            else openPct = 0;
        }
        
        if (gameType === "MTT" && pos !== "BB") openPct += 0.03;
        if (gameType === "CASH" && pos !== "BB") openPct -= 0.01;
        if (stack > 250) openPct -= 0.03;
        if (stack < 15) openPct -= 0.05;
        
        openPct = Math.max(0.05, Math.min(0.95, openPct));
        
        let handScores = [];
        for (let r = 0; r < 13; r++) {
            for (let c = 0; c < 13; c++) {
                let score = getCustomHandStrength(r, c, stack);
                handScores.push({ r: r, c: c, score: score });
            }
        }
        handScores.sort((a, b) => b.score - a.score);
        
        let totalCombos = 0;
        let targetCombos = openPct * 1326;
        let solvedGrid = Array(13).fill(0).map(() => Array(13).fill(null).map(() => [1.0, 0, 0]));
        
        for (let entry of handScores) {
            let combos = getComboCount(entry.r, entry.c);
            if (totalCombos < targetCombos) {
                solvedGrid[entry.r][entry.c] = [0.0, 0.0, 1.0];
                totalCombos += combos;
            } else {
                solvedGrid[entry.r][entry.c] = [1.0, 0.0, 0.0];
            }
        }
        range = solvedGrid;
    }
    return range;
}

function getCustomHandStrength(r, c, stackBB) {
    let v1 = 14 - Math.min(r, c);
    let v2 = 14 - Math.max(r, c);
    let pair = r === c;
    let suited = r < c;
    let connected = Math.abs(r - c) === 1;
    let oneGapper = Math.abs(r - c) === 2;
    
    let baseStrength = 0;
    if (pair) {
        baseStrength = 100 + v1 * 6;
    } else {
        baseStrength = v1 * 5 + v2 * 3;
        if (suited) baseStrength += 14;
        if (connected) baseStrength += 8;
        if (oneGapper) baseStrength += 3;
    }
    
    let impliedOddsBonus = 0;
    if (stackBB > 150) {
        let deepFactor = Math.min(1.0, (stackBB - 150) / 850);
        if (pair && v1 < 10) impliedOddsBonus += deepFactor * 28;
        if (!pair && suited && (connected || oneGapper)) impliedOddsBonus += deepFactor * 22;
        if (!pair && !suited && v1 > 10 && v2 < 10) impliedOddsBonus -= deepFactor * 24;
    }
    
    if (stackBB < 40) {
        let shortFactor = (40 - stackBB) / 30;
        if (!pair && suited && connected) impliedOddsBonus -= shortFactor * 16;
        if (!pair && !suited && v1 >= 11) impliedOddsBonus += shortFactor * 8;
    }
    return baseStrength + impliedOddsBonus;
}

// Export the modules
window.PokerSolver = {
    getHandString,
    getComboCount,
    parseRange,
    GTO_RANGES_DATA,
    getHandToHandEquity,
    solvePushFold,
    KuhnCFR,
    generateGTORange
};
