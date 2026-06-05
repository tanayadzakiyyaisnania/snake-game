// CANVAS
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// SOUND (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "eat") {
        osc.type = "square";
        osc.frequency.setValueAtTime(300, audioCtx.currentTime); // frekuensi awal 300 Hz
        osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.1); //frekuensi naik menuju 600 Hz dalam waktu 0.1 detik
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); // volume awal
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1); // volume turun ke 0 dalam waktu 0.1 detik
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);

    } else if (type === "levelup") {
        const notes = [400, 600, 800]; // frekuensi untuk nada level up
        notes.forEach((freq, i) => { 
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = "sine";
            o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15); // setiap nada dimulai dengan delay 0.15 detik
            g.gain.setValueAtTime(0.25, audioCtx.currentTime + i * 0.15); // volume awal untuk setiap nada
            g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + i * 0.15 + 0.12); // volume turun ke 0 dalam waktu 0.12 detik setelah nada dimulai
            o.start(audioCtx.currentTime + i * 0.15);
            o.stop(audioCtx.currentTime + i * 0.15 + 0.12);
        });

    } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.6); // frekuensi turun dari 400 Hz ke 80 Hz dalam waktu 0.6 detik
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime); // volume awal
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6); // volume turun ke 0 dalam waktu 0.6 detik
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    }
}

// PANEL LEVEL
const levelPanel = document.getElementById("levelPanel");
const levelText = document.getElementById("levelText");
const scoreText = document.getElementById("scoreText");
const nextLevelBtn = document.getElementById("nextLevelBtn");

// SNAKE
let snake = [{x:200,y:200}]; // mulai dari tengah
let dx = 20; // Kecepatan horizontal
let dy = 0; // Kecepatan vertikal

// FOOD
let food = generateFood();
let bonusFood = null;
let bonusTimer = null;

// SCORE
let score = 0;

// LEVEL
let level = "Level 1";
let gameSpeed = 250;

// pause level
let pauseLevel = false;

// paused : true saat pemain menekan P (pause manual)
let paused = false;

// game over
let gameOver = false;
let gameOverSoundPlayed = false;

// game started : false di layar awal, true setelah pemain menekan Space
let gameStarted = false;

let loopTimeout = null;

// GENERATE FOOD
// Menghasilkan posisi makanan acak dalam grid 20x20 px
function generateFood(){
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * 20) * 20,
            y: Math.floor(Math.random() * 20) * 20
        };
    } while (snake.some(part => part.x === pos.x && part.y === pos.y));
    return pos;
}
function spawnBonusFood(){
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * 20) * 20,
            y: Math.floor(Math.random() * 20) * 20
        };
    } while (
        snake.some(part => part.x === pos.x && part.y === pos.y) ||
        (pos.x === food.x && pos.y === food.y)
    );
    bonusFood = pos;

    // hilang setelah 7000ms = 7 detik
    bonusTimer = setTimeout(()=>{
        bonusFood = null;
    }, 7000);
}

// DRAW SNAKE
// Menggambar kepala ular sebagai kotak merah, badan ular sebagai kotak hijau 20x20 px
function drawSnake(){
    snake.forEach((part, index)=>{
        if(index === 0){
            ctx.fillStyle = "cyan";    // kepala
        } else {
            ctx.fillStyle = "green";  // badan
        }
        ctx.fillRect(part.x, part.y, 20, 20);
    });
}

// DRAW FOOD
// Menggambar makanan biasa sebagai kotak merah 20x20 px
function drawFood(){
    ctx.fillStyle="red";
    ctx.fillRect(food.x,food.y,20,20);
}
// Menggambar makanan bonus sebagai kotak orange 30x30 px
function drawBonusFood(){
    if(!bonusFood) return;
    ctx.fillStyle = "orange";
    ctx.fillRect(bonusFood.x, bonusFood.y, 30, 30); // lebih besar
}

// DRAW SCORE
function drawScore(){
    document.getElementById("scoreDisplay").innerText = 
        "Score : " + score + "  |  " + level;
    ctx.font="12px Arial";
    ctx.fillStyle="gray";
    ctx.fillText("P = Pause | R = Restart", 130, 390);
}

// MOVE SNAKE
// Menggerakkan ular satu langkah ke arah (dx, dy)
// Level 1-4 : ular menembus dinding (muncul di sisi berlawanan)
// Level 5   : ular MATI jika keluar batas canvas
function moveSnake(){
    let head = {
        x:snake[0].x + dx,
        y:snake[0].y + dy
    };
    if(level !== "Level 5"){
        // Wrap-around: tembus dinding, muncul di sisi lain
        if(head.x >= canvas.width) head.x = 0;
        if(head.x < 0) head.x = canvas.width - 20;
        if(head.y >= canvas.height) head.y = 0;
        if(head.y < 0) head.y = canvas.height - 20;
    } else {
        // Level 5: keluar batas = game over
        if(
            head.x < 0 ||
            head.x >= canvas.width ||
            head.y < 0 ||
            head.y >= canvas.height
        ){
            gameOver = true;
        }
    }
    snake.unshift(head);
    snake.pop();
}

// CHECK FOOD
// Mendeteksi apakah kepala ular mengenai makanan biasa.
// Jika ya: ular memanjang, skor +1, makanan baru di-spawn,
// dan setiap kelipatan 15 skor, bonus food muncul
function checkFood(){
    if(
        snake[0].x === food.x &&
        snake[0].y === food.y
    ){
        snake.push({});
        food = generateFood();
        score += 1;
        playSound("eat");
        updateLevel();

        // spawn bonus hanya saat makan & score kelipatan 15 & belum ada bonus
        if(score % 15 === 0 && !bonusFood){
            clearTimeout(bonusTimer);
            spawnBonusFood();
        }
    }
}
// Mendeteksi apakah kepala ular mengenai makanan bonus
// Area deteksi 30x30 px sesuai ukuran bonus food yang lebih besar
// Jika kena: skor +5
function checkBonusFood(){
    if(!bonusFood) return;
    if(
        snake[0].x >= bonusFood.x && snake[0].x < bonusFood.x + 30 &&
        snake[0].y >= bonusFood.y && snake[0].y < bonusFood.y + 30
    ){
        score += 5;
        playSound("eat");
        clearTimeout(bonusTimer);
        bonusFood = null;
        document.getElementById("scoreDisplay").innerText =
            "Score : " + score + "  |   " + level;
    }
}
// UPDATE LEVEL
// Menentukan level & kecepatan berdasarkan skor
function updateLevel(){
    if(score <= 21){
        if(level !== "Level 1") showLevelTransition("Level 1");
        level = "Level 1";
        gameSpeed = 250;
    }
    else if(score <= 31){
        if(level !== "Level 2") showLevelTransition("Level 2");
        level = "Level 2";
        gameSpeed = 200;
    }
    else if(score <= 41){
        if(level !== "Level 3") showLevelTransition("Level 3");
        level = "Level 3";
        gameSpeed = 150;
    }
    else if(score <= 51){
        if(level !== "Level 4") showLevelTransition("Level 4");
        level = "Level 4";
        gameSpeed = 100;
    }
    else{
        if(level !== "Level 5") showLevelTransition("Level 5");
        level = "Level 5";
        gameSpeed = 90;
    }
}

// LEVEL TRANSITION
// Menampilkan popup level baru dan mem-pause game sementara
// Game dilanjutkan setelah pemain klik tombol "Next Level"
function showLevelTransition(newLevel){
    pauseLevel = true; // Hentikan game loop
    playSound("levelup"); // Mainkan suara naik level
    levelPanel.classList.remove("hidden"); 
    //levelText.innerText = "LEVEL " + newLevel;
    //scoreText.innerText = "Score: " + score;
}

// NEXT LEVEL BUTTON
// Menutup popup level dan melanjutkan game loop
nextLevelBtn.addEventListener("click",()=>{
    pauseLevel = false;
    levelPanel.classList.add("hidden");
    clearTimeout(loopTimeout);
    loopTimeout = null;
    gameLoop();
});

// COLLISION BODY
// Mendeteksi apakah kepala ular menabrak tubuhnya sendiri.
// Loop mulai dari index 1 (bukan kepala) untuk perbandingan.
function checkCollision(){
    const head = snake[0];
    for(let i=1;i<snake.length;i++){
        if(head.x === snake[i].x && head.y === snake[i].y){
            gameOver = true; // Kepala menabrak tubuh, game over
        }
    }
}

// GAME OVER
// Menampilkan teks "GAME OVER" dan instruksi restart
function drawGameOver(){
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2, 180);
    ctx.font = "14px Arial";
    ctx.fillStyle = "#ccc";
    ctx.fillText("Skor Akhir : " + score + "  |  " + level, canvas.width / 2, 210);
    ctx.font = "13px Arial";
    ctx.fillStyle = "#aaa";
    ctx.fillText("Tekan R untuk restart", canvas.width / 2, 235);
    ctx.textAlign = "left"; // reset biar ga ngaruh ke elemen lain
}
// PAUSED
// Menampilkan overlay gelap semi-transparan + teks PAUSED
function drawPaused(){
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText("PAUSED", 140, 210);
}

// START SCREEN
// layar awal
function drawStartScreen(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Press Space to Play", 110, 200);
}

// RESTART
// Mereset semua state ke kondisi awal dan memulai ulang game loop
function restartGame(){
    clearTimeout(loopTimeout);
    loopTimeout = null;
    snake = [{x:200, y:200}];
    dx = 20;
    dy = 0;
    food = generateFood();
    bonusFood = null;
    clearTimeout(bonusTimer);
    bonusTimer = null;
    score = 0;
    level = "Level 1";
    gameSpeed = 250;
    gameOver = false;
    gameOverSoundPlayed = false;
    paused = false;
    pauseLevel = false;
    gameStarted = true;
    levelPanel.classList.add("hidden");
    gameLoop();
}

// KEYBOARD
document.addEventListener("keydown",(event)=>{
    const key = event.key;

    // SPACE: Mulai game dari layar awal
    if(key === " "){
        if(!gameStarted){
            gameStarted = true;
            gameLoop();
            return;
        }
    }

    // P: Pause
    if(key === "p" || key === "P"){
        if(gameOver || pauseLevel) return;
        paused = !paused;
        if(!paused){
            clearTimeout(loopTimeout);
            loopTimeout = null;
            gameLoop();
        }
        return;
    }

    // R: Restart game kapan saja
    if(key === "r" || key === "R"){
        restartGame();
        return;
    }

    // Arrow Keys: Ubah arah ular
    // Syarat: tidak boleh berbalik arah berlawanan (dy===0 / dx===0)
    // ATAS
    if(key==="ArrowUp" && dy===0){   // Tidak bisa naik jika sedang turun
        dx=0;
        dy=-20;
    }
    // BAWAH
    else if(key==="ArrowDown" && dy===0){  // Tidak bisa turun jika sedang naik
        dx=0;
        dy=20;
    }
    // KIRI
    else if(key==="ArrowLeft" && dx===0){ // Tidak bisa kiri jika sedang kanan
        dx=-20;
        dy=0;
    }
    // KANAN
    else if(key==="ArrowRight" && dx===0){ // Tidak bisa kanan jika sedang kiri
        dx=20;
        dy=0;
    }
});

// GAME LOOP
function gameLoop(){
    // Belum mulai, tampilkan start screen
    if(!gameStarted){
        drawStartScreen();
        return;
    }
    // Sedang di level transition popup, tunggu klik Next Level
    if(pauseLevel) return;
    // Sedang di-pause manual, tampilkan overlay paused
    if(paused){ drawPaused(); return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Bersihkan canvas setiap frame

    if(gameOver){
        // Putar suara gameover sekali, lalu tampilkan layar game over
        if(!gameOverSoundPlayed){
            playSound("gameover");
            gameOverSoundPlayed = true;
        }
        drawGameOver();
        return;
    }

    // Update posisi & deteksi
    moveSnake();
    checkFood();
    checkCollision();
    checkBonusFood();
    // Gambar semua elemen ke canvas
    drawSnake();
    drawFood();
    drawBonusFood();
    drawScore();

    loopTimeout = setTimeout(gameLoop, gameSpeed);
}

// MULAI
drawStartScreen();