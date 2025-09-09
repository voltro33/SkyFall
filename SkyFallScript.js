const GAME_CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    basket: {
        width: 25,
        height: 25,
        speed: 8
    },
    objects: {
        minRadius: 8,
        maxRadius: 20,
        fallSpeed: 3,
        slideSpeed: 2,
        spawnInterval: 1200
    },
    powerUps: {
        spawnChance: 0.1,
        duration: 5000
    },
    particles: {
        count: 50,
        speed: 2
    }
};

let gameState = {
    isPlaying: false,
    isPaused: false,
    score: 0,
    lives: 3,
    time: 0,
    objectsAvoided: 0,
    speedMultiplier: 1,
    powerUpActive: null,
    powerUpEndTime: 0,
    fastWaveActive: false,
    fastWaveCountdown: 20,
    nextFastWave: 20,
    objectSpawnMultiplier: 1,
    baseSpeedMultiplier: 1,
    targetSpeedMultiplier: 1,
    speedBoostActive: false,
    speedBoostLevel: 0,
    speedBoostTimer: 0
};

// Game Objects
let canvas, ctx;
let basket;
let fallingObjects = [];
let slidingObjects = [];
let powerUps = [];
let particles = [];
let backgroundParticles = [];
let audioSystem;

let gameTimer;
let objectSpawnTimer;
let powerUpSpawnTimer;

class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.init();
    }
    
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    play(soundName) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch(soundName) {
            case 'collect':
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
                
            case 'collision':
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;
                
            case 'powerUp':
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.2);
                break;
                
            case 'gameOver':
                oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.5);
                break;
        }
    }
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    setupResponsiveCanvas();
    
    basket = {
        x: canvas.width / 2 - GAME_CONFIG.basket.width / 2,
        y: canvas.height - GAME_CONFIG.basket.height - 20,
        width: GAME_CONFIG.basket.width,
        height: GAME_CONFIG.basket.height,
    dx: 0,
        dy: 0,
        trail: [],
        isMoving: false,
        moveTimer: 0,
        originalWidth: GAME_CONFIG.basket.width,
        originalHeight: GAME_CONFIG.basket.height
    };
    
    audioSystem = new AudioSystem();
    
    createBackgroundParticles();
    
    setupEventListeners();
    
    updateUI();
}

function setupResponsiveCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    

    const scaleX = containerWidth / GAME_CONFIG.canvas.width;
    const scaleY = containerHeight / GAME_CONFIG.canvas.height;
    const scale = Math.min(scaleX, scaleY, 1);
    

    canvas.width = GAME_CONFIG.canvas.width;
    canvas.height = GAME_CONFIG.canvas.height;
    canvas.style.width = (GAME_CONFIG.canvas.width * scale) + 'px';
    canvas.style.height = (GAME_CONFIG.canvas.height * scale) + 'px';
}


function setupEventListeners() {

    document.addEventListener('keydown', (e) => {
        if (!gameState.isPlaying) return;
        
        switch(e.code) {
            case 'ArrowLeft':
                basket.dx = -GAME_CONFIG.basket.speed;
                break;
            case 'ArrowRight':
                basket.dx = GAME_CONFIG.basket.speed;
                break;
            case 'ArrowUp':
                basket.dy = -GAME_CONFIG.basket.speed;
                break;
            case 'ArrowDown':
                basket.dy = GAME_CONFIG.basket.speed;
                break;
            case 'Space':
                e.preventDefault();
                activateSpeedBoost();
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (!gameState.isPlaying) return;
        
        switch(e.code) {
            case 'ArrowLeft':
            case 'ArrowRight':
                basket.dx = 0;
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                basket.dy = 0;
                break;
        }
    });
    

    canvas.addEventListener('mousemove', (e) => {
        if (!gameState.isPlaying) return;
        
    const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

    basket.x = mouseX - basket.width / 2;
    basket.y = mouseY - basket.height / 2;


        basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
        basket.y = Math.max(0, Math.min(canvas.height - basket.height, basket.y));
    });
    
    canvas.addEventListener('click', handleTouchpadClick);
    

    canvas.addEventListener('touchmove', (e) => {
        if (!gameState.isPlaying) return;
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const touch = e.touches[0];
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        
        basket.x = touchX - basket.width / 2;
        basket.y = touchY - basket.height / 2;
        

        basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
        basket.y = Math.max(0, Math.min(canvas.height - basket.height, basket.y));
    });
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchpadClick(e);
    });
}

// Start game
function startGame() {

    document.getElementById('startMenu').classList.add('hidden');
    

    gameState = {
        isPlaying: true,
        isPaused: false,
        score: 0,
        lives: 3,
        time: 0,
        objectsAvoided: 0,
        speedMultiplier: 1,
        powerUpActive: null,
        powerUpEndTime: 0,
        fastWaveActive: false,
        fastWaveCountdown: 20,
        nextFastWave: 20,
        objectSpawnMultiplier: 1,
        baseSpeedMultiplier: 1,
        targetSpeedMultiplier: 1,
        speedBoostActive: false,
        speedBoostLevel: 0,
        speedBoostTimer: 0
    };
    

    fallingObjects = [];
    slidingObjects = [];
    powerUps = [];
    particles = [];
    

    basket.x = canvas.width / 2 - basket.width / 2;
    basket.y = canvas.height - basket.height - 20;
    basket.trail = [];
    basket.isMoving = false;
    basket.moveTimer = 0;
    

    updateUI();
    

    gameLoop();
    
    // Start timers
    updateGameTimer();
    updateObjectSpawnTimer();
}


function gameLoop() {
    if (!gameState.isPlaying) return;
    

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    

    updateBasket();
    updateObjects();
    updateParticles();
    

    drawBasket();
    drawObjects();
    drawParticles();
    

    if (gameState.powerUpActive) {
        drawPowerUpIndicator();
    }
    

    requestAnimationFrame(gameLoop);
}


function createBackgroundParticles() {
    backgroundParticles = [];
    for (let i = 0; i < GAME_CONFIG.particles.count; i++) {
        backgroundParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.1
        });
    }
}


function animateBackgroundParticles() {
    backgroundParticles.forEach(particle => {
        particle.y += particle.speed;
        if (particle.y > canvas.height) {
            particle.y = -particle.size;
            particle.x = Math.random() * canvas.width;
        }
    });
    
    requestAnimationFrame(animateBackgroundParticles);
}


function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}


function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    

    backgroundParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}


function drawBasket() {
    // Draw trail
    basket.trail.forEach((point, index) => {
        const alpha = index / basket.trail.length;
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    

    ctx.save();
    ctx.fillStyle = '#3498db';
    ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(basket.x + 2, basket.y + 2, basket.width - 4, basket.height - 4);
    

    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.strokeRect(basket.x, basket.y, basket.width, basket.height);
    
    ctx.restore();
}


function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            size: Math.random() * 3 + 1,
            color: color,
            life: 30,
            maxLife: 30
        });
    }
}


function createExplosion(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 15,
            dy: (Math.random() - 0.5) * 15,
            size: Math.random() * 4 + 2,
            color: '#e74c3c',
            life: 40,
            maxLife: 40
        });
    }
}


function createShieldEffect(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            size: Math.random() * 3 + 1,
            color: '#3498db',
            life: 25,
            maxLife: 25
        });
    }
}


function detectCollision(obj, basket) {
    return obj.x + obj.radius >= basket.x &&
           obj.x - obj.radius <= basket.x + basket.width &&
           obj.y + obj.radius >= basket.y &&
           obj.y - obj.radius <= basket.y + basket.height;
}


function getRandomColor() {
    const colors = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
        '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}


function spawnFallingObject() {
    const radius = GAME_CONFIG.objects.minRadius + Math.random() * (GAME_CONFIG.objects.maxRadius - GAME_CONFIG.objects.minRadius);
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const color = getRandomColor();
    

    let speedMultiplier = gameState.speedMultiplier;
    
    fallingObjects.push({
        x: x,
        y: -radius,
        radius: radius,
        color: color,
        dy: GAME_CONFIG.objects.fallSpeed * speedMultiplier,
        rotation: 0,
        pulse: 0
    });
}


function spawnSlidingObject() {
    const radius = GAME_CONFIG.objects.minRadius + Math.random() * (GAME_CONFIG.objects.maxRadius - GAME_CONFIG.objects.minRadius);
    const y = Math.random() * (canvas.height - radius * 2) + radius;
    const color = getRandomColor();
    

    let speedMultiplier = gameState.speedMultiplier;
    
    slidingObjects.push({
        x: -radius,
        y: y,
        radius: radius,
        color: color,
        dx: GAME_CONFIG.objects.slideSpeed * speedMultiplier,
        rotation: 0,
        pulse: 0
    });
}


function spawnPowerUp() {
    const x = Math.random() * (canvas.width - 30) + 15;
    const y = Math.random() * (canvas.height - 30) + 15;
    const types = ['shield', 'slow', 'multiply'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let color, icon;
    switch(type) {
        case 'shield':
            color = '#3498db';
            icon = '🛡';
            break;
        case 'slow':
            color = '#f39c12';
            icon = '⏰';
            break;
        case 'multiply':
            color = '#e74c3c';
            icon = '⭐';
            break;
    }
    
    powerUps.push({
        x: x,
        y: y,
        radius: 15,
        color: color,
        type: type,
        icon: icon,
        rotation: 0,
        pulse: 0
    });
}


function gameOver() {
    gameState.isPlaying = false;
    
    if (gameTimer) clearInterval(gameTimer);
    if (objectSpawnTimer) clearInterval(objectSpawnTimer);
    if (powerUpSpawnTimer) clearInterval(powerUpSpawnTimer);
    

    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalTime').textContent = gameState.time;
    document.getElementById('objectsAvoided').textContent = gameState.objectsAvoided;
    

    audioSystem.play('gameOver');
}


function restartGame() {
    document.getElementById('gameOver').classList.add('hidden');
    startGame();
}


function handleTouchpadClick(e) {
    if (!gameState.isPlaying) return;
    activateSpeedBoost();
}


function activateSpeedBoost() {
    if (!gameState.speedBoostActive) {
        gameState.speedBoostActive = true;
        gameState.speedBoostLevel = 0;
        gameState.speedBoostTimer = 0;
    }
}


function updateSpeedBoost() {
    if (gameState.speedBoostActive) {
        gameState.speedBoostTimer++;
        
        // Each boost level lasts 60 frames (about 1 second at 60fps)
        if (gameState.speedBoostTimer >= 60) {
            gameState.speedBoostLevel++;
            gameState.speedBoostTimer = 0;
            
            // Cycle through boost levels: 0 -> 1 -> 2 -> 3 -> back to 0
            if (gameState.speedBoostLevel > 3) {
                gameState.speedBoostActive = false;
                gameState.speedBoostLevel = 0;
            }
        }
    }
}

// Update game timer
function updateGameTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    
    gameTimer = setInterval(() => {
        if (!gameState.isPaused) {
            gameState.time++; // Time increases by 1 every second
            updateFastWaveSystem();
            updateGradualSpeed();
            updateSpeedBoost();
            updateUI();
        }
    }, 1000); // Always 1 second intervals
}

// Update gradual speed system
function updateGradualSpeed() {
    // Speed increases by 0.1 every second
    gameState.baseSpeedMultiplier = 1 + (gameState.time * 0.1);
    
    // Update actual speed multiplier (base + speed boost only, no fast wave speed bonus)
    let finalSpeed = gameState.baseSpeedMultiplier;
    
    if (gameState.speedBoostActive) {
        finalSpeed += gameState.speedBoostLevel; // Add 1x, 2x, 3x to current speed
    }
    
    gameState.speedMultiplier = finalSpeed;
}

// Update fast wave system
function updateFastWaveSystem() {
    if (gameState.fastWaveActive) {
        // Fast wave is active, count down to end
        gameState.fastWaveCountdown--;
        if (gameState.fastWaveCountdown <= 0) {
            // End fast wave - back to normal spawn rate
            gameState.fastWaveActive = false;
            gameState.objectSpawnMultiplier = 1;
            gameState.fastWaveCountdown = 20;
            gameState.nextFastWave = gameState.time + 20;
            document.getElementById('fastWaveIndicator').classList.remove('active');
            updateObjectSpawnTimer(); // Update spawn rate
        }
    } else {
        // Normal mode, count down to next fast wave
        gameState.fastWaveCountdown = gameState.nextFastWave - gameState.time;
        if (gameState.fastWaveCountdown <= 0) {
            // Start fast wave - 2x more objects
            gameState.fastWaveActive = true;
            gameState.objectSpawnMultiplier = 2;
            gameState.fastWaveCountdown = 10;
            document.getElementById('fastWaveIndicator').classList.add('active');
            audioSystem.play('powerUp'); // Play sound for fast wave start
            updateObjectSpawnTimer(); // Update spawn rate
        }
    }
}

// Update object spawn timer
function updateObjectSpawnTimer() {
    if (objectSpawnTimer) {
        clearInterval(objectSpawnTimer);
    }
    
    // Base spawn interval adjusted by object spawn multiplier (for fast waves)
    let spawnInterval = GAME_CONFIG.objects.spawnInterval / gameState.objectSpawnMultiplier;
    
    objectSpawnTimer = setInterval(() => {
        if (!gameState.isPaused) {
            spawnFallingObject();
            if (Math.random() < 0.3) {
                spawnSlidingObject();
            }
        }
    }, spawnInterval);
}

// Update objects
function updateObjects() {
    // Update falling objects
    fallingObjects.forEach((obj, index) => {
        obj.y += obj.dy;
        obj.rotation += 0.1;
        obj.pulse += 0.2;
        
        // Remove if off screen
        if (obj.y - obj.radius > canvas.height) {
            fallingObjects.splice(index, 1);
            gameState.objectsAvoided++;
            gameState.score += 10;
            createParticles(obj.x, obj.y, obj.color);
            audioSystem.play('collect');
        }
        
        // Check collision
        if (detectCollision(obj, basket)) {
            if (gameState.powerUpActive === 'shield') {
                fallingObjects.splice(index, 1);
                createShieldEffect(basket.x + basket.width/2, basket.y + basket.height/2);
            } else {
                gameState.lives--;
                fallingObjects.splice(index, 1);
                createExplosion(basket.x + basket.width/2, basket.y + basket.height/2);
                audioSystem.play('collision');
                
                if (gameState.lives <= 0) {
                    gameOver();
                }
            }
        }
    });
    
    // Update sliding objects
    slidingObjects.forEach((obj, index) => {
        obj.x += obj.dx;
        obj.rotation += 0.1;
        obj.pulse += 0.2;
        
        // Remove if off screen
        if (obj.x - obj.radius > canvas.width) {
            slidingObjects.splice(index, 1);
            gameState.objectsAvoided++;
            gameState.score += 10;
            createParticles(obj.x, obj.y, obj.color);
            audioSystem.play('collect');
        }
        
        // Check collision
        if (detectCollision(obj, basket)) {
            if (gameState.powerUpActive === 'shield') {
                slidingObjects.splice(index, 1);
                createShieldEffect(basket.x + basket.width/2, basket.y + basket.height/2);
            } else {
                gameState.lives--;
                slidingObjects.splice(index, 1);
                createExplosion(basket.x + basket.width/2, basket.y + basket.height/2);
                audioSystem.play('collision');
                
                if (gameState.lives <= 0) {
                    gameOver();
                }
            }
        }
    });
    
    // Update power-ups
    powerUps.forEach((powerUp, index) => {
        powerUp.rotation += 0.05;
        powerUp.pulse += 0.1;
        
        // Check collision with basket
        if (detectCollision(powerUp, basket)) {
            powerUps.splice(index, 1);
            activatePowerUp(powerUp.type);
            createParticles(powerUp.x, powerUp.y, '#FFD700');
            audioSystem.play('powerUp');
        }
    });
}

// Update basket
function updateBasket() {
    // Check if basket is moving
    const isCurrentlyMoving = basket.dx !== 0 || basket.dy !== 0;
    
    if (isCurrentlyMoving) {
        basket.isMoving = true;
        basket.moveTimer = 0;
        // Shrink basket when moving (even smaller)
        basket.width = basket.originalWidth * 0.5;
        basket.height = basket.originalHeight * 0.5;
    } else {
        basket.moveTimer++;
        // Return to normal size after 5 frames of not moving
        if (basket.moveTimer > 5) {
            basket.isMoving = false;
            basket.width = basket.originalWidth;
            basket.height = basket.originalHeight;
        }
    }
    
    // Add to trail
    basket.trail.push({ x: basket.x + basket.width/2, y: basket.y + basket.height/2 });
    if (basket.trail.length > 10) {
        basket.trail.shift();
    }
}

// Draw objects
function drawObjects() {
    // Draw falling objects
    fallingObjects.forEach(obj => {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotation);
        
        // Create pulsing effect
        const pulseScale = 1 + Math.sin(obj.pulse) * 0.1;
        ctx.scale(pulseScale, pulseScale);
        
        // Draw object
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(-obj.radius * 0.3, -obj.radius * 0.3, obj.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    
    // Draw sliding objects
    slidingObjects.forEach(obj => {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotation);
        
        // Create pulsing effect
        const pulseScale = 1 + Math.sin(obj.pulse) * 0.1;
        ctx.scale(pulseScale, pulseScale);
        
        // Draw object
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(-obj.radius * 0.3, -obj.radius * 0.3, obj.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    
    // Draw power-ups
    powerUps.forEach(powerUp => {
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        ctx.rotate(powerUp.rotation);
        
        // Create pulsing effect
        const pulseScale = 1 + Math.sin(powerUp.pulse) * 0.2;
        ctx.scale(pulseScale, pulseScale);
        
        // Draw power-up
        ctx.fillStyle = powerUp.color;
        ctx.beginPath();
        ctx.arc(0, 0, powerUp.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = powerUp.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        
        ctx.restore();
    });
}

// Draw power-up indicator
function drawPowerUpIndicator() {
    const timeLeft = Math.max(0, gameState.powerUpEndTime - Date.now());
    const progress = timeLeft / GAME_CONFIG.powerUps.duration;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(20, canvas.height - 25, 180, 10);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(20, canvas.height - 25, 180 * progress, 10);
    
    ctx.restore();
}

// Update UI
function updateUI() {
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('time').textContent = gameState.time;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('fastWaveCountdown').textContent = gameState.fastWaveCountdown;
    
    // Update speed level display
    document.getElementById('speedLevel').textContent = gameState.speedMultiplier.toFixed(1);
    
    // Update power-up timer
    if (gameState.powerUpActive) {
        const timeLeft = Math.max(0, Math.ceil((gameState.powerUpEndTime - Date.now()) / 1000));
        document.getElementById('powerupTimer').textContent = timeLeft;
    }
}

// Activate power-up
function activatePowerUp(type) {
    gameState.powerUpActive = type;
    gameState.powerUpEndTime = Date.now() + GAME_CONFIG.powerUps.duration;
    
    // Show power-up display
    showPowerUpDisplay(type);
    
    switch(type) {
        case 'shield':
            // Shield is handled in collision detection
            break;
        case 'slow':
            gameState.speedMultiplier *= 0.5;
            break;
        case 'multiply':
            gameState.score += 100;
            break;
    }
    
    // Remove power-up after duration
    setTimeout(() => {
        if (gameState.powerUpActive === type) {
            gameState.powerUpActive = null;
            hidePowerUpDisplay();
            if (type === 'slow') {
                gameState.speedMultiplier /= 0.5;
            }
        }
    }, GAME_CONFIG.powerUps.duration);
}

// Show power-up display
function showPowerUpDisplay(type) {
    const display = document.getElementById('powerupDisplay');
    const icon = document.getElementById('powerupIcon');
    const name = document.getElementById('powerupName');
    
    let iconSymbol, powerupName;
    switch(type) {
        case 'shield':
            iconSymbol = '🛡';
            powerupName = 'Shield';
            break;
        case 'slow':
            iconSymbol = '⏰';
            powerupName = 'Slow';
            break;
        case 'multiply':
            iconSymbol = '⭐';
            powerupName = 'Multiply';
            break;
    }
    
    icon.textContent = iconSymbol;
    name.textContent = powerupName;
    display.style.display = 'flex';
}

// Hide power-up display
function hidePowerUpDisplay() {
    const display = document.getElementById('powerupDisplay');
    display.style.display = 'none';
}

// Initialize game when page loads
window.addEventListener('load', initGame);
