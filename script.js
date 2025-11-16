// --- ตัวแปรหลัก ---
let balance = 100;
let currentBet = 10;
const MIN_BET = 10;
const BET_STEP = 10;
const SPIN_DURATION_MS = 1500; // เวลาหมุน 1.5 วินาที

// ข้อมูลสีและตัวคูณ (Multiplier)
const COLORS = [
    { name: 'ส้ม', code: 'var(--color-orange)', multiplier: 1, probabilityModifier: 0 },
    { name: 'เหลือง', code: 'var(--color-yellow)', multiplier: 2, probabilityModifier: 0 },
    { name: 'แดง', code: 'var(--color-red)', multiplier: 3, probabilityModifier: 0 },
];

// --- DOM Elements ---
const balanceEl = document.getElementById('current-balance');
const betEl = document.getElementById('current-bet');
const increaseBetBtn = document.getElementById('increase-bet');
const decreaseBetBtn = document.getElementById('decrease-bet');
const spinBtn = document.getElementById('spin-button');
const slotCells = document.querySelectorAll('.slot-cell');
const messageEl = document.getElementById('game-message');

// --- Functions ---

/** อัปเดตการแสดงผลยอดเงินปัจจุบัน */
function updateDisplay() {
    balanceEl.textContent = balance;
    betEl.textContent = currentBet;
    
    // ควบคุมสถานะปุ่มเพิ่ม/ลดเงิน
    increaseBetBtn.disabled = currentBet + BET_STEP > balance; // ไม่เกินยอดเงิน
    decreaseBetBtn.disabled = currentBet <= MIN_BET; // ไม่ต่ำกว่าขั้นต่ำ

    // ควบคุมสถานะปุ่มหมุน (หมุนไม่ได้ถ้าเงินหมด)
    if (balance <= 0) {
        spinBtn.disabled = true;
        increaseBetBtn.disabled = true;
        messageEl.textContent = "เงินหมดแล้ว ลองเริ่มใหม่!";
        messageEl.style.color = '#F44336';
    } else {
        spinBtn.disabled = false;
        messageEl.textContent = "";
    }

    // หากเงินเดิมพันสูงกว่าเงินคงเหลือ ให้ลดเงินเดิมพันลงอัตโนมัติ
    if (currentBet > balance) {
        currentBet = Math.max(MIN_BET, Math.floor(balance / BET_STEP) * BET_STEP);
        betEl.textContent = currentBet;
    }
    
    // หากเงินเดิมพันเป็น 0 (ไม่ควรเกิดขึ้นแต่เพื่อความปลอดภัย)
    if (currentBet === 0 && balance > 0) {
        currentBet = MIN_BET;
        betEl.textContent = currentBet;
    }
}

/** * สุ่มสีสำหรับช่องสล็อต 
 * @param {boolean} isHighBet - เป็นการเดิมพันสูงหรือไม่ เพื่อปรับโอกาสชนะ
 * @returns {object[]} - Array ของสีที่สุ่มได้
 */
function getRandomColors(isHighBet) {
    const results = [];
    const highBetFactor = isHighBet ? 1.5 : 1; // ปัจจัยเพิ่มโอกาส

    for (let i = 0; i < 9; i++) {
        // **กลไกปรับความน่าจะเป็น (ตามโจทย์)**
        // โอกาสชนะ 3-แถวปกติ: ประมาณ 5%
        // โอกาสชนะ 3-แถวเดิมพันสูง: 8% - 15% (กำหนดให้สุ่มได้สีเดียวกันง่ายขึ้นเล็กน้อย)
        
        let shouldWinThisRow = false;
        if (i % 3 === 0) { // พิจารณาแค่ช่องแรกของแต่ละแถว
            // หากเป็นการเดิมพันสูง ให้เพิ่มโอกาสเกิดแถวตรง
            const winProbability = isHighBet ? 0.12 : 0.05; // 12% vs 5%
            if (Math.random() < winProbability) {
                shouldWinThisRow = true;
            }
        }
        
        if (shouldWinThisRow) {
            // หากตั้งใจให้แถวนี้ชนะ (เฉพาะแถวที่เริ่มจาก i=0, 3, 6)
            const winColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            results.push(winColor, winColor, winColor);
            i += 2; // ข้ามไป 2 ช่องเพราะใส่สีไปแล้ว
        } else {
            // สุ่มสีปกติ
            const randomIndex = Math.floor(Math.random() * COLORS.length);
            results.push(COLORS[randomIndex]);
        }
    }
    
    return results.slice(0, 9); // ตรวจสอบให้แน่ใจว่ามีแค่ 9 ช่อง
}


/** ตรวจสอบแถวชนะ (แนวนอน 3 แถว) */
function checkWin(results) {
    let totalMultiplier = 0;
    const winningCells = [];

    // ตรวจสอบ 3 แถวแนวนอน (แถว 0, 1, 2), (แถว 3, 4, 5), (แถว 6, 7, 8)
    for (let i = 0; i < 9; i += 3) {
        const color1 = results[i].name;
        const color2 = results[i+1].name;
        const color3 = results[i+2].name;

        if (color1 === color2 && color2 === color3) {
            // ชนะ! แถวตรง
            const multiplier = results[i].multiplier;
            totalMultiplier += multiplier;
            winningCells.push(i, i+1, i+2);
            console.log(`WIN on Row ${i/3 + 1}: ${color1} x${multiplier}`);
        }
    }

    return { totalMultiplier, winningCells };
}


/** จัดการเมื่อผู้เล่นกดปุ่มหมุน */
async function handleSpin() {
    if (balance < currentBet || spinBtn.disabled) return;

    // 1. หักเงิน
    balance -= currentBet;
    updateDisplay();
    messageEl.textContent = `หักเงิน ${currentBet} หน่วย...`;
    messageEl.style.color = '#F44336';
    
    // 2. เริ่มแอนิเมชันหมุน
    spinBtn.disabled = true;
    increaseBetBtn.disabled = true;
    decreaseBetBtn.disabled = true;
    slotCells.forEach(cell => {
        cell.classList.add('spinning');
        cell.classList.remove('highlight-win');
    });

    // 3. สุ่มและแสดงผลลัพธ์
    const isHighBet = currentBet >= 50; // กำหนดให้เดิมพัน 50 ขึ้นไปเป็น High Bet
    const finalResults = getRandomColors(isHighBet);
    
    await new Promise(resolve => setTimeout(resolve, SPIN_DURATION_MS)); // รอจนกว่าจะหมุนเสร็จ

    // หยุดแอนิเมชันและแสดงผล
    slotCells.forEach((cell, index) => {
        cell.classList.remove('spinning');
        cell.style.backgroundColor = finalResults[index].code;
    });

    // 4. ตรวจสอบการชนะ
    const { totalMultiplier, winningCells } = checkWin(finalResults);
    
    // 5. คำนวณเงินรางวัล
    if (totalMultiplier > 0) {
        const winnings = currentBet * totalMultiplier;
        balance += winnings;
        messageEl.textContent = `💰 ชนะ! ได้รับ ${winnings} หน่วย (x${totalMultiplier})! 🥳`;
        messageEl.style.color = '#4CAF50';

        // ไฮไลท์ช่องที่ชนะ
        winningCells.forEach(index => {
            slotCells[index].classList.add('highlight-win');
        });

    } else {
        messageEl.textContent = '❌ เสียใจด้วย ไม่ถูกรางวัล!';
        messageEl.style.color = '#F44336';
    }

    // 6. อัปเดตสถานะและเปิดปุ่ม
    setTimeout(() => {
        updateDisplay();
        spinBtn.disabled = false;
        // หากเงินหมด จะถูกจัดการใน updateDisplay()
    }, 500); // หน่วงเวลาเล็กน้อยให้ผู้เล่นเห็นผลก่อนกดต่อ
}

/** รีเซ็ตเกม (ตามเงื่อนไขที่ผู้พัฒนาออกแบบ) */
function resetGame() {
    balance = 100;
    currentBet = 10;
    updateDisplay();
    messageEl.textContent = "เริ่มเกมใหม่! ขอให้โชคดี 😊";
    slotCells.forEach(cell => {
        cell.classList.remove('highlight-win');
        cell.style.backgroundColor = COLORS[0].code; // สีเริ่มต้น
    });
}

// --- Event Listeners ---
increaseBetBtn.addEventListener('click', () => {
    if (currentBet + BET_STEP <= balance) {
        currentBet += BET_STEP;
        updateDisplay();
    }
});

decreaseBetBtn.addEventListener('click', () => {
    if (currentBet - BET_STEP >= MIN_BET) {
        currentBet -= BET_STEP;
        updateDisplay();
    }
});

spinBtn.addEventListener('click', handleSpin);

// สามารถเพิ่มปุ่ม Reset ใน HTML ได้ถ้าต้องการ
// แต่สำหรับตอนนี้ ให้ผู้เล่นรีเซ็ตด้วยการโหลดหน้าเว็บใหม่ หรือเพิ่มปุ่มรีเซ็ต
document.getElementById('game-message').addEventListener('click', () => {
    if (balance <= 0) {
        resetGame(); // หากเงินหมด กดที่ข้อความเพื่อเริ่มใหม่
    }
});

// --- Initialization ---
// กำหนดสีเริ่มต้นให้กับช่องสล็อต
slotCells.forEach(cell => {
    cell.style.backgroundColor = COLORS[0].code; // เริ่มด้วยสีส้ม
});
updateDisplay();
