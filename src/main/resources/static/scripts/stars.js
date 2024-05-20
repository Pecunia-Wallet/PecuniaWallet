const canvas = document.querySelector("canvas#background");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = [];
const layers = 3;
const speeds = [0.25, 0.15, 0.07];
const angles = [0, Math.PI / 4, Math.PI / 8];
const starColor = "249, 247, 247";
let backgroundColor = "#0d0e17";

function setBackgroundColor(color) {
    backgroundColor = color;
    canvas.style.backgroundColor = color;
}

function generateStars() {
    for (let i = 0; i < Math.min(200, Math.max(70, window.innerWidth * 0.07)); i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * (1.7 - 2) + 1.7;
        const layer = Math.floor(Math.random() * layers);
        const brightness = Math.random() * 0.5 + 0.5;
        const blinkInterval = Math.random() * 2000 + 500;
        const shape = Math.random() < 0.5 ? "circle" : "rhombus";
        stars.push({ x, y, size, layer, brightness, blinkInterval, shape, angle: angles[layer] });
    }
}

function moveStars() {
    stars.forEach(star => {
        const speed = speeds[star.layer];
        star.y -= speed * Math.cos(star.angle);
        if (star.y < -star.size) {
            star.y = canvas.height + star.size;
        }
    });
}

function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
        const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size);
        gradient.addColorStop(0, `rgba(${starColor}, ${star.brightness})`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (star.shape === "circle") {
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        } else if (star.shape === "rhombus") {
            drawRhombus(ctx, star.x, star.y, star.size);
        }
        ctx.fill();
    });
}

function drawRhombus(ctx, x, y, size) {
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
}

function update() {
    moveStars();
    drawStars();
    requestAnimationFrame(update);
}

function blinkStars() {
    stars.forEach(star => {
        if (Date.now() % star.blinkInterval < 100) {
            star.brightness = Math.random() * 0.5 + 0.5;
        } else {
            star.brightness = 1;
        }
    });
}

generateStars();
update();
setInterval(blinkStars, 300);
setBackgroundColor(backgroundColor);

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = [];
    generateStars();
});
