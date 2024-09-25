const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let basket = {
    x: canvas.width / 2 - 30,
    y: canvas.height - 30,
    width: 30,
    height: 30,
    dx: 0,
    dy: 0
};

let objects = [];
let objects2 = [];
let time = 0;
let speed = 10;
let boardSpeed = 1;
let objectInterval = 800;
let gameInterval;
let lives = 3;

document.addEventListener('keydown', moveBasket);
document.addEventListener('keyup', stopBasket);
canvas.addEventListener('mousemove', moveBasketWithMouse);

function moveBasketWithMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    basket.x = mouseX - basket.width / 2;
    basket.y = mouseY - basket.height / 2;

    if (basket.x < 0) {
        basket.x = 0;
    }
    if (basket.x + basket.width > canvas.width) {
        basket.x = canvas.width - basket.width;
    }
    if (basket.y < 0) {
        basket.y = 0;
    }
    if (basket.y + basket.height > canvas.height) {
        basket.y = canvas.height - basket.height;
    }
}

function drawBasket() {
    ctx.fillStyle = '#FF6347';
    ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
}

function moveBasket(e) {
    if (e.key === 'ArrowRight') {
        basket.dx = 7;
    } else if (e.key === 'ArrowLeft') {
        basket.dx = -7;
    } else if (e.key === 'ArrowDown') {
        basket.dy = 7;
    } else if (e.key === 'ArrowUp') {
        basket.dy = -7;
    }
}

function stopBasket() {
    basket.dx = 0;
    basket.dy = 0;
}

function updateBasket() {
    basket.x += basket.dx;
    basket.y += basket.dy;

    if (basket.x < 0) {
        basket.x = 0;
    }
    if (basket.x + basket.width > canvas.width) {
        basket.x = canvas.width - basket.width;
    }
    if (basket.y < 0) {
        basket.y = 0;
    }
    if (basket.y + basket.height > canvas.height) {
        basket.y = canvas.height - basket.height;
    }
}

function FallingObject(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.dy = speed;
    this.dx = speed;
}

FallingObject.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
};

FallingObject.prototype.update = function() {
    this.y += this.dy;
};

FallingObject.prototype.draw2 = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
};

FallingObject.prototype.update2 = function() {
    this.x += this.dx;
};

function generateObject() {
    const radius = 10 + Math.random() * 15;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const color = getRandomColor();
    objects.push(new FallingObject(x, 0, radius, color));
}

function generateObjectSlide() {
    const radius = 5 + Math.random() * 10;
    const y = Math.random() * (canvas.height - radius * 2) + radius;
    const color = getRandomColor();
    objects2.push(new FallingObject(0, y, radius, color));
}

function getRandomColor() {
    const colors = ['#FF4500', '#32CD32', '#1E90FF', '#FFD700', '#FF69B4'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function detectCollision(object) {
    return object.y + object.radius >= basket.y &&
           object.y - object.radius <= basket.y + basket.height &&
           object.x + object.radius >= basket.x &&
           object.x - object.radius <= basket.x + basket.width;
}

function detectCollisionSlide(object) {
    return object.x + object.radius >= basket.x &&
           object.x - object.radius <= basket.x + basket.width &&
           object.y + object.radius >= basket.y &&
           object.y - object.radius <= basket.y + basket.height;
}

function startTimer() {
    setInterval(() => {
        time += 1;
        document.getElementById('time').textContent = time + " Sec";
    }, 1000);
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateBasket();
    drawBasket();
    
    objects.forEach((object, index) => {
        object.update();
        object.draw();
        
        if (object.y - object.radius > canvas.height) {
            objects.splice(index, 1);
        }
        
        if (detectCollision(object)) {
            lives -= 1;
            document.getElementById('lives').textContent = lives;
            objects.splice(index, 1);
        }
    });

    objects2.forEach((object2, index) => {
        object2.update2();
        object2.draw2();
        
        if (object2.x - object2.radius > canvas.width) {
            objects2.splice(index, 1);
        }
        
        if (detectCollisionSlide(object2)) {
            lives -= 1;
            document.getElementById('lives').textContent = lives;
            objects2.splice(index, 1);
        }
    });

    if (lives <= 0) {
        clearInterval(objectIntervalFall);
        clearInterval(objectIntervalSlide);
        cancelAnimationFrame(gameInterval);
        alert("Game Over! You survived for " + time + " seconds.");
    } else {
        if(time > 10 && speed<12){
            speed += (time/10) * 1.3
        }
        requestAnimationFrame(update);
    }

   
}

let objectIntervalFall, objectIntervalSlide;

function startGame() {
    objectIntervalFall = setInterval(generateObject, objectInterval);
    objectIntervalSlide = setInterval(generateObjectSlide, objectInterval);
    startTimer();
    update();
}

function loadingScreen() {
    alert("You sure you want to play the world's best game?");
    startGame();
}

window.onload = startGame;
