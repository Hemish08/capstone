// ── STUPID FILE CONVERTER ANIMAL MAGIC ──
// This file controls the beautiful animated fish pond in the background!
// It uses math and drawings to make fish swim around your mouse.

// Step 1: Find the invisible canvas where we will draw our fish pond
const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');

// Step 2: Make sure the pond is always exactly the size of the computer screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize(); // Set it right away!

// Let's keep track of where the user's mouse cursor is!
let mouse = { x: canvas.width / 2, y: canvas.height / 2, active: false };

// If the mouse leaves or moves fast, tell the fish to "Scatter!"
function scatterFishes() {
    fishes.forEach(f => {
        f.speedBoost = 3.0; // Swim super fast!
        // Turn around randomly 
        f.angle += (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * Math.PI / 2);
        f.wanderAngle = f.angle;
    });
}

// We need to keep track of when you lift your finger on a phone!
let lastTouchTime = 0;

// When you first touch the screen, immediately summon the fish to your finger!
window.addEventListener('touchstart', (e) => {
    let t = e.touches[0];
    mouse.x = t.clientX; mouse.y = t.clientY;
    mouse.active = true;
}, { passive: true });

// Watch where the mouse moves
window.addEventListener('mousemove', (e) => {
    // Mobile browsers send a fake "ghost" mouse event 300ms after you lift your finger!
    // We block it here so the fish don't get permanently stuck on your dropdown menus.
    if (Date.now() - lastTouchTime < 1000) return;

    const margin = 5;
    // Did the mouse leave the screen entirely?
    if (e.clientX <= margin || e.clientX >= window.innerWidth - margin ||
        e.clientY <= margin || e.clientY >= window.innerHeight - margin) {
        if (mouse.active) { mouse.active = false; scatterFishes(); }
    } else {
        // The mouse is on the screen! Tell the fish where it is.
        mouse.x = e.clientX; mouse.y = e.clientY;
        if (!mouse.active) mouse.active = true;
    }
});

// Also watch where fingers touch on phones!
window.addEventListener('touchmove', (e) => {
    let t = e.touches[0];
    const margin = 5;
    if (t.clientX <= margin || t.clientX >= window.innerWidth - margin ||
        t.clientY <= margin || t.clientY >= window.innerHeight - margin) {
        if (mouse.active) { mouse.active = false; scatterFishes(); }
    } else {
        mouse.x = t.clientX; mouse.y = t.clientY;
        if (!mouse.active) mouse.active = true;
    }
}, { passive: true });

// If the mouse leaves the browser window, scatter!
document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) { if (mouse.active) { mouse.active = false; scatterFishes(); } }
});
window.addEventListener('mouseleave', () => { if (mouse.active) { mouse.active = false; scatterFishes(); }});
window.addEventListener('touchend', () => { 
    lastTouchTime = Date.now(); // Remember exactly when the finger lifted!
    if (mouse.active) { mouse.active = false; scatterFishes(); }
});
window.addEventListener('touchcancel', () => { 
    lastTouchTime = Date.now();
    if (mouse.active) { mouse.active = false; scatterFishes(); }
});
window.addEventListener('blur', () => { if (mouse.active) { mouse.active = false; scatterFishes(); }});

// ── THE FISH BLUEPRINT ──
// This describes how every single fish is built and how it moves.
class Fish {
    constructor(x, y, baseColor, spotColors, sizeMultiplier, followSpeed, numSpots, isGiant = false) {
        // A fish body is made of 12 invisible dots connected together like a snake
        this.segmentCount = 12;
        this.segmentLength = 6 * sizeMultiplier;
        this.segments = [];
        for (let i = 0; i < this.segmentCount; i++) {
            this.segments.push({ x: x, y: y, angle: 0 });
        }
        
        // Coloring and size settings
        this.baseColor = baseColor;
        this.sizeMultiplier = sizeMultiplier;
        this.isGiant = isGiant; // Is this the giant boss fish?
        
        this.x = x; this.y = y;
        this.angle = Math.random() * Math.PI * 2; // Face a random direction
        this.speed = followSpeed;
        this.speedBoost = 1.0;
        this.wanderAngle = this.angle;
        this.swingPhase = Math.random() * Math.PI * 2; // Helps the tail wiggle naturally
        
        // Paint random colorful spots on its back
        this.spots = [];
        for (let i = 0; i < numSpots; i++) {
            let segIdx = 1 + Math.floor(Math.random() * 7);
            let angleOffset = (Math.random() - 0.5) * Math.PI;
            let distOffset = Math.random() * (4 * sizeMultiplier);
            let radius = (3 * sizeMultiplier) + Math.random() * (5 * sizeMultiplier);
            let color = spotColors[Math.floor(Math.random() * spotColors.length)];
            if (this.isGiant) radius *= 1.8;
            this.spots.push({ segmentIndex: segIdx, angleOffset, distOffset, radius, color });
        }
    }

    // Step 3: MOVE the fish slightly every frame
    update() {
        let targetX = this.x; let targetY = this.y;
        let turnSpeed = this.isGiant ? 0.025 : 0.05;
        let swirlDist = this.isGiant ? 150 : 50;
        let swirlRadius = this.isGiant ? 100 : 50;
        let swirlJitter = this.isGiant ? 0.1 : 0.4;

        // If the mouse is moving, chase it!
        if (mouse.active) {
            let dx = mouse.x - this.x; let dy = mouse.y - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > swirlDist) { 
                targetX = mouse.x; targetY = mouse.y; // Swim straight at the mouse
            } else {
                // If we are close to the mouse, swirl around it happily
                this.wanderAngle += (Math.random() - 0.5) * swirlJitter;
                targetX = mouse.x + Math.cos(this.wanderAngle) * swirlRadius;
                targetY = mouse.y + Math.sin(this.wanderAngle) * swirlRadius;
            }
        } else {
            // No mouse? Just wander around slowly.
            this.wanderAngle += (Math.random() - 0.5) * 0.15;
            targetX = this.x + Math.cos(this.wanderAngle) * 100;
            targetY = this.y + Math.sin(this.wanderAngle) * 100;
        }

        // Figure out which way to turn
        let dx = targetX - this.x; let dy = targetY - this.y;
        let targetAngle = Math.atan2(dy, dx);
        let dAngle = targetAngle - this.angle;
        dAngle = Math.atan2(Math.sin(dAngle), Math.cos(dAngle));
        this.angle += dAngle * turnSpeed;

        // Slow down if we were sprinting
        if (this.speedBoost > 1.0) this.speedBoost -= 0.03; else this.speedBoost = 1.0;
        
        let moveSpeed = this.speed * this.speedBoost * (1 - Math.min(Math.abs(dAngle), 0.5));
        this.x += Math.cos(this.angle) * moveSpeed;
        this.y += Math.sin(this.angle) * moveSpeed;

        // Pac-Man rules: If fish swim off the edge of the screen, they reappear on the other side!
        const padding = 100 * this.sizeMultiplier;
        if (this.x < -padding) this.x = canvas.width + padding;
        if (this.x > canvas.width + padding) this.x = -padding;
        if (this.y < -padding) this.y = canvas.height + padding;
        if (this.y > canvas.height + padding) this.y = -padding;

        // Make the body segments follow the head like a snake
        this.segments[0].x = this.x; this.segments[0].y = this.y; this.segments[0].angle = this.angle;
        this.swingPhase += this.isGiant ? 0.12 : 0.25;

        for (let i = 1; i < this.segmentCount; i++) {
            let sdx = this.segments[i-1].x - this.segments[i].x;
            let sdy = this.segments[i-1].y - this.segments[i].y;
            let pAngle = Math.atan2(sdy, sdx);
            
            // Wiggle the tail left and right!
            let wiggle = 0;
            if (i > 2) wiggle = Math.sin(this.swingPhase - i * 0.3) * (this.isGiant ? 0.15 : 0.25);
            this.segments[i].angle = pAngle + wiggle;
            
            let targetSegX = this.segments[i-1].x - Math.cos(pAngle) * this.segmentLength;
            let targetSegY = this.segments[i-1].y - Math.sin(pAngle) * this.segmentLength;
            
            if (this.isGiant) {
                this.segments[i].x += (targetSegX - this.segments[i].x) * 0.8;
                this.segments[i].y += (targetSegY - this.segments[i].y) * 0.8;
            } else {
                this.segments[i].x = targetSegX;
                this.segments[i].y = targetSegY;
            }
        }
    }

    // Step 4: DRAW the fish on the screen
    draw() {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        
        // Draw the shadow underneath the fish inside the water
        this.traceBody();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.save(); ctx.translate(10 * this.sizeMultiplier, 10 * this.sizeMultiplier); ctx.fill(); ctx.restore();
        
        // Draw the solid colorful body
        this.traceBody(); ctx.fillStyle = this.baseColor; ctx.fill();
        ctx.save(); this.traceBody(); ctx.clip();
        
        // Draw the messy watercolor spots
        for (let spot of this.spots) {
            let seg = this.segments[spot.segmentIndex]; if (!seg) continue;
            let px = seg.x + Math.cos(seg.angle + Math.PI/2) * Math.cos(spot.angleOffset) * spot.distOffset;
            let py = seg.y + Math.sin(seg.angle + Math.PI/2) * Math.cos(spot.angleOffset) * spot.distOffset;
            ctx.beginPath(); 
            ctx.arc(px, py, spot.radius, 0, Math.PI * 2);
            ctx.fillStyle = spot.color; ctx.fill();
        }
        ctx.restore();
        
        // Attach the tail, fins, and eyes!
        this.drawTail(); this.drawPectoralFins(); this.drawEyes();
    }

    // Helps figure out how thick each piece of the fish body should be
    getSegmentWidth(index) {
        const widths = [8,12,14,14,12,10,8,6,5,4,3,2]; // Fat in the middle, thin fast tail
        return (widths[index] || 2) * this.sizeMultiplier;
    }

    traceBody() {
        ctx.beginPath();
        for (let i = 0; i < this.segmentCount; i++) {
            let p = this.segments[i]; let w = this.getSegmentWidth(i);
            let angle = p.angle + Math.PI/2;
            let rx = p.x + Math.cos(angle) * w; let ry = p.y + Math.sin(angle) * w;
            if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        for (let i = this.segmentCount - 1; i >= 0; i--) {
            let p = this.segments[i]; let w = this.getSegmentWidth(i);
            let angle = p.angle - Math.PI/2;
            let lx = p.x + Math.cos(angle) * w; let ly = p.y + Math.sin(angle) * w;
            ctx.lineTo(lx, ly);
        }
        ctx.closePath();
    }

    drawTail() {
        let tail = this.segments[this.segmentCount-1];
        let tailAngle = tail.angle; let tailSize = 18 * this.sizeMultiplier;
        ctx.fillStyle = this.baseColor; ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(tail.x - Math.cos(tailAngle-0.4)*tailSize, tail.y - Math.sin(tailAngle-0.4)*tailSize);
        ctx.lineTo(tail.x - Math.cos(tailAngle)*(tailSize*0.5), tail.y - Math.sin(tailAngle)*(tailSize*0.5));
        ctx.lineTo(tail.x - Math.cos(tailAngle+0.4)*tailSize, tail.y - Math.sin(tailAngle+0.4)*tailSize);
        ctx.closePath(); ctx.fill();
    }

    drawEyes() {
        let head = this.segments[0]; let angle = head.angle;
        let dist = 5 * this.sizeMultiplier; let eyeSize = 2 * this.sizeMultiplier;
        let exR = head.x + Math.cos(angle+0.8)*dist; let eyR = head.y + Math.sin(angle+0.8)*dist;
        let exL = head.x + Math.cos(angle-0.8)*dist; let eyL = head.y + Math.sin(angle-0.8)*dist;
        
        ctx.fillStyle = "white"; // The white of the eye
        ctx.beginPath(); ctx.arc(exR, eyR, eyeSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(exL, eyL, eyeSize, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = "black"; // The tiny black pupil
        ctx.beginPath(); ctx.arc(exR, eyR, eyeSize*0.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(exL, eyL, eyeSize*0.4, 0, Math.PI*2); ctx.fill();
    }

    drawPectoralFins() {
        let body = this.segments[2]; let angle = body.angle;
        let width = this.getSegmentWidth(2); let finLength = 12 * this.sizeMultiplier;
        ctx.fillStyle = this.baseColor;
        ctx.beginPath();
        let rx = body.x + Math.cos(angle+Math.PI/2)*(width-1); let ry = body.y + Math.sin(angle+Math.PI/2)*(width-1);
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(angle+2.0)*finLength, ry + Math.sin(angle+2.0)*finLength);
        ctx.lineTo(body.x + Math.cos(angle-0.5+Math.PI/2)*width, body.y + Math.sin(angle-0.5+Math.PI/2)*width);
        ctx.fill();
        ctx.beginPath();
        let lx = body.x + Math.cos(angle-Math.PI/2)*(width-1); let ly = body.y + Math.sin(angle-Math.PI/2)*(width-1);
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(angle-2.0)*finLength, ly + Math.sin(angle-2.0)*finLength);
        ctx.lineTo(body.x + Math.cos(angle+0.5-Math.PI/2)*width, body.y + Math.sin(angle+0.5-Math.PI/2)*width);
        ctx.fill();
    }
}

// ── LILYPAD BLUEPRINT ──
// Draws the pretty floating green leaves and pink flowers
class Lilypad {
    constructor(x, y, radius) {
        this.x = x; this.y = y; this.radius = radius;
        this.angle = Math.random() * Math.PI * 2;
        this.driftX = (Math.random()-0.5)*0.3; this.driftY = (Math.random()-0.5)*0.3;
    }
    update() {
        // Slowly spin and float across the pond
        this.x += this.driftX; this.y += this.driftY; this.angle += 0.002;
        
        // Wrap around Pac-Man style
        if (this.x < -this.radius) this.x = canvas.width + this.radius;
        if (this.x > canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = canvas.height + this.radius;
        if (this.y > canvas.height + this.radius) this.y = -this.radius;
    }
    draw() {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.arc(this.x+8,this.y+8,this.radius,this.angle,this.angle+Math.PI*1.8); ctx.lineTo(this.x+8,this.y+8); ctx.fill();
        
        // Green leaf
        ctx.fillStyle = '#1d5e23';
        ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,this.angle,this.angle+Math.PI*1.8); ctx.lineTo(this.x,this.y); ctx.fill();
        
        // White flower petals
        let flowerRadius = this.radius * 0.55;
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            let pAngle = this.angle + i*(Math.PI/2);
            let fx = this.x+Math.cos(pAngle)*flowerRadius; let fy = this.y+Math.sin(pAngle)*flowerRadius;
            let innerAngle = pAngle+(Math.PI/4);
            let ix = this.x+Math.cos(innerAngle)*(flowerRadius*0.3); let iy = this.y+Math.sin(innerAngle)*(flowerRadius*0.3);
            if (i===0) ctx.moveTo(fx,fy); else ctx.lineTo(fx,fy);
            ctx.lineTo(ix,iy);
        }
        ctx.closePath(); ctx.fill();
        
        // Pink flower center
        ctx.fillStyle = '#f09ebb';
        ctx.beginPath(); ctx.arc(this.x,this.y,flowerRadius*0.45,0,Math.PI*2); ctx.fill();
    }
}

// ── WATER RIPPLES ──
// Makes circles appear in the water when fish swim fast!
class Ripple {
    constructor(x, y) { this.x=x; this.y=y; this.radius=2; this.opacity=0.4; }
    update() { this.radius+=0.8; this.opacity-=0.005; } // Ripple gets wider and fades away
    draw() {
        if (this.opacity<=0) return;
        ctx.strokeStyle=`rgba(255,255,255,${this.opacity})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.stroke();
    }
}

// ── CREATE THE POND LIFE ──

let mode = 'swarm'; // Should we spawn small fishes or the giant combined one?
const fishes = [];

// Beautiful vibrant colors for our Koi fishes!
const smallKoiVariations = [
    { base: '#ffffff', spots: ['#e04f38'] },
    { base: '#ffffff', spots: ['#222222'] },
    { base: '#e04f38', spots: ['#ffffff'] },
    { base: '#eab233', spots: ['#222222'] },
    { base: '#222222', spots: ['#e04f38'] },
];

// Toss fewer small fish on phone screens to keep it fast! 🐟
let numFishes = window.innerWidth < 768 ? 8 : 20;
for (let i = 0; i < numFishes; i++) {
    let type = smallKoiVariations[i % smallKoiVariations.length];
    let size = 0.5 + Math.random() * 0.6;
    let speed = 1.5 + Math.random();
    fishes.push(new Fish(Math.random()*canvas.width, Math.random()*canvas.height, type.base, type.spots, size, speed, 4+Math.floor(Math.random()*4), false));
}

// Create one GIANT fish for when they all combine 🐉
let giantFish = new Fish(canvas.width/2, canvas.height/2, '#ffffff', ['#e04f38','#222222','#eab233','#fb8b24'], 2.5, 2.0, 20, true);

// Drop 12 Lilypads onto the water 🌸
const lilies = [];
for (let i = 0; i < 12; i++) {
    lilies.push(new Lilypad(Math.random()*canvas.width, Math.random()*canvas.height, 20+Math.random()*25));
}
const ripples = [];


// ── MAGICAL MERGE LOGIC ──
// If all the small fish touch the mouse at the same time, they combine like Voltron 
// into one GIANT fish! If the mouse leaves, it breaks back apart.
function checkMergeLogic() {
    if (mode === 'swarm') {
        if (mouse.active) {
            let closeCount = 0;
            for (let f of fishes) {
                let dist = Math.hypot(f.x-mouse.x, f.y-mouse.y);
                if (dist < 100*f.sizeMultiplier) closeCount++;
            }
            if (closeCount > fishes.length * 0.8 && fishes.length > 0) {
                mode = 'merged'; // BOOM! They merged!
                giantFish.x = fishes[0].x; giantFish.y = fishes[0].y; giantFish.angle = fishes[0].angle;
                for (let i=0; i<giantFish.segmentCount; i++) {
                    giantFish.segments[i].x = fishes[0].segments[Math.min(i,fishes[0].segmentCount-1)].x;
                    giantFish.segments[i].y = fishes[0].segments[Math.min(i,fishes[0].segmentCount-1)].y;
                    giantFish.segments[i].angle = giantFish.angle;
                }
                // Big splash!
                for (let k=0; k<15; k++) ripples.push(new Ripple(giantFish.x+(Math.random()-0.5)*40, giantFish.y+(Math.random()-0.5)*40));
            }
        }
    } else if (mode === 'merged') {
        if (!mouse.active) {
            mode = 'swarm'; // Uh oh, mouse gone. Break apart!
            fishes.forEach(f => {
                f.x = giantFish.x+(Math.random()-0.5)*50;
                f.y = giantFish.y+(Math.random()-0.5)*50;
                f.angle = giantFish.angle+(Math.random()-0.5)*Math.PI;
                f.speedBoost = 2.5; // Swim away fast!
                for (let i=0; i<f.segmentCount; i++) { f.segments[i].x=f.x; f.segments[i].y=f.y; f.segments[i].angle=f.angle; }
            });
            // Little splashes!
            for (let k=0; k<18; k++) ripples.push(new Ripple(giantFish.x+(Math.random()-0.5)*100, giantFish.y+(Math.random()-0.5)*100));
        }
    }
}


// ── THE ULTIMATE ANIMATION LOOP ──
// This runs 60 times a second. It updates the drawing to look like a movie!
function animate() {
    // 1. Wipe the screen entirely clean with a squeegee
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Add random tiny ripples just for atmosphere
    if (Math.random() < 0.05) ripples.push(new Ripple(Math.random()*canvas.width, Math.random()*canvas.height));
    
    // 3. See if we should summon the giant fish
    checkMergeLogic();
    
    // 4. Create ripples when the fish swim
    if (mode === 'swarm') {
        if (Math.random() < 0.3 && fishes.length > 0) {
            let f = fishes[Math.floor(Math.random()*fishes.length)];
            let tail = f.segments[f.segmentCount-1];
            ripples.push(new Ripple(tail.x, tail.y));
        }
    } else {
        if (Math.random() < 0.2) {
            let tail = giantFish.segments[giantFish.segmentCount-1];
            ripples.push(new Ripple(tail.x, tail.y));
        }
    }
    
    // 5. Draw the ripples
    for (let i = ripples.length-1; i >= 0; i--) {
        ripples[i].update(); ripples[i].draw();
        if (ripples[i].opacity <= 0) ripples.splice(i, 1); // Delete old ripples so we don't crash
    }
    
    // 6. Draw the fishes (either lots of small ones, or one giant one)
    if (mode === 'swarm') {
        fishes.forEach(fish => { fish.update(); fish.draw(); });
    } else { 
        giantFish.update(); giantFish.draw(); 
    }
    
    // 7. Draw the pretty lilypads over everything else
    lilies.forEach(lily => { lily.update(); lily.draw(); });
    
    // 8. Tell the computer to run this again for the next movie frame!
    requestAnimationFrame(animate);
}

// Start the movie! 🎬
animate();