/* ==========================================================================
   LOVE LETTER JOURNEY — MAIN APPLICATION BRAIN
   Features: Scene transitions, Canvas particles, Web Audio Synth, Touch Drag & Drop
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Preload interactive PNG assets in JS
    const imagesToPreload = [
        "assets/female_idle.png",
        "assets/male_idle.png",
        "assets/female_punch.png",
        "assets/male_knocked.png",
        "assets/male_kneeling.png",
        "assets/female_blush.png"
    ];
    imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
    });

    // ==========================================
    // AUDIO SYNTHESIZER (NATIVE WEB AUDIO API)
    // ==========================================
    class SoundSynth {
        constructor() {
            this.ctx = null;
        }

        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        playPop(freq = 180, duration = 0.12) {
            this.init();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        }

        playChime() {
            this.init();
            const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Sweet arpeggio)
            const now = this.ctx.currentTime;

            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, now + (idx * 0.08));

                gain.gain.setValueAtTime(0, now + (idx * 0.08));
                gain.gain.linearRampToValueAtTime(0.2, now + (idx * 0.08) + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.08) + 0.5);

                osc.start(now + (idx * 0.08));
                osc.stop(now + (idx * 0.08) + 0.6);
            });
        }

        playPunch() {
            this.init();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(250, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.25);

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.3);

            // Add a small noise layer for impact
            try {
                const bufferSize = this.ctx.sampleRate * 0.15;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

                noise.connect(noiseGain);
                noiseGain.connect(this.ctx.destination);
                noise.start();
            } catch (e) { /* Fallback if noise buffer creation fails */ }
        }

        playUnlock() {
            this.init();
            const now = this.ctx.currentTime;
            // Short mechanical click
            this.playPop(300, 0.04);

            // Ascending romantic chime sequence
            setTimeout(() => {
                const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 to C6 scale
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (idx * 0.06));

                    gain.gain.setValueAtTime(0, this.ctx.currentTime + (idx * 0.06));
                    gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + (idx * 0.06) + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (idx * 0.06) + 0.6);

                    osc.start(this.ctx.currentTime + (idx * 0.06));
                    osc.stop(this.ctx.currentTime + (idx * 0.06) + 0.7);
                });
            }, 80);
        }
    }

    const synth = new SoundSynth();

    // ==========================================
    // CANVAS PARTICLE SYSTEM (INTERACTIVE FX)
    // ==========================================
    const canvas = document.getElementById("effect-canvas");
    const ctx = canvas.getContext("2d");

    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    class Particle {
        constructor(x, y, type = "heart") {
            this.x = x;
            this.y = y;
            this.type = type; // "heart", "petal", "sparkle"
            this.size = Math.random() * 12 + 6;
            this.speedX = Math.random() * 6 - 3;
            this.speedY = Math.random() * -6 - 2;
            this.gravity = 0.08;
            this.opacity = 1;
            this.decay = Math.random() * 0.015 + 0.01;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = Math.random() * 0.08 - 0.04;

            // Soft romantic pastel colors
            const colors = ["#FF4D6D", "#FF7AA2", "#7EC8FF", "#FFE6EC", "#FFF8F8"];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.speedY += this.gravity;
            this.rotation += this.rotSpeed;
            this.opacity -= this.decay;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;

            if (this.type === "heart") {
                // Draw vector heart shape
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(-this.size / 2, -this.size / 2, -this.size, -this.size / 4, -this.size, this.size / 4);
                ctx.bezierCurveTo(-this.size, this.size, 0, this.size * 1.3, 0, this.size * 1.6);
                ctx.bezierCurveTo(0, this.size * 1.3, this.size, this.size, this.size, this.size / 4);
                ctx.bezierCurveTo(this.size, -this.size / 4, this.size / 2, -this.size / 2, 0, 0);
                ctx.fill();
            } else if (this.type === "petal") {
                // Tulip/Lily flower petals
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.quadraticCurveTo(-this.size / 2, -this.size / 2, 0, this.size);
                ctx.quadraticCurveTo(this.size / 2, -this.size / 2, 0, -this.size);
                ctx.fill();
            } else {
                // Sparkle
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    ctx.lineTo(0, -this.size);
                    ctx.lineTo(this.size / 3, -this.size / 3);
                    ctx.rotate(Math.PI / 2);
                }
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function spawnBurst(x, y, count = 20, type = "heart") {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, type));
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].opacity <= 0) {
                particles.splice(i, 1);
            }
        }
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // ==========================================
    // SCENE ROUTING SYSTEM
    // ==========================================
    function transitionToScene(currentId, nextId) {
        const currentScene = document.getElementById(currentId);
        const nextScene = document.getElementById(nextId);

        currentScene.classList.add("exit");
        currentScene.classList.remove("active");

        setTimeout(() => {
            currentScene.classList.remove("exit");
            nextScene.classList.add("active");

            // Trigger specific scene entry initialization callback
            onSceneActive(nextId);
        }, 800); // Perfectly synced with index.css slow transition timing
    }

    // ==========================================
    // GLOBAL FLOATING BACKGROUND ITEMS
    // ==========================================
    const floatingContainer = document.getElementById("floating-container");
    const floatingElements = ["❤️", "💙", "🌷", "💮", "✨", "🌸"];

    function createFloatingAsset() {
        const item = document.createElement("div");
        item.className = "floating-item";
        item.innerText = floatingElements[Math.floor(Math.random() * floatingElements.length)];

        item.style.left = Math.random() * 100 + "%";
        item.style.fontSize = (Math.random() * 20 + 15) + "px";
        item.style.animationDuration = (Math.random() * 6 + 8) + "s";

        floatingContainer.appendChild(item);

        // Remove item after animation completes
        setTimeout(() => {
            item.remove();
        }, 14000);
    }

    // Continuously spawn decorations
    setInterval(createFloatingAsset, 2200);

    // ==========================================
    // SCENE LOGICS & WORKFLOWS
    // ==========================================

    // Unique data messages for Scene 2 Envelopes (4 Envelopes)
    const envelopeMessages = [
        "i'll choose you in a room full of people ❤️ ",
        "you are my fav notification now without me realising.....",
        "i love to hear your gossips and rant even your man hatter yaps",
        "i would give you the last peice of my momos and even save the best part of my icecream for you❤️"
    ];

    let openedEnvelopes = new Set();

    // Scene 3 apology script lines
    const apologyLines = [
        "Wait, before we go any further... I have to confess something. 🌸\n\n",
        "i know i sometimes ragebait you on purpose\n",
        "I'm sorry and my heart holds nothing but love and adoration for you.\n\n",
        "your acchawwws , your hawww , gud boi , heinn, cute ",
        " I love when you are real to me without any social filters",
        "I love going by my work with your chat wide open on my phone",
        " ❤️✨"
    ];

    // Scene 4 Chibi couple state coordinates
    let scene4State = 1; // 1 = Glow female, 2 = Glow male, 3 = Complete

    // Scene 5 Tap properties
    let growTaps = 0;
    const maxGrowTaps = 100;
    const growingDialogues = [
        { taps: 10, text: "Look at you..." },
        { taps: 40, text: "Still making my heart bigger..." },
        { taps: 80, text: "even when your mood is off. ❤️" }
    ];

    // Scene 7 final letter copy
    const finalLetterCopy =
        "To the most beautiful headache in my life❤️ \n\n" +
        "Vanshikaaa,\n\n" +

        "First of all...\n\n" +

        "Sorry\n" +
        "Sorry for the things I know I did\n" +
        "Sorry for the things I dont know I did\n" +
        "Sorry for the things I will realize later that I did\n" +
        "Sorry for the things I accidentally do while trying to do the right thing\n\n" +

        "And just to be safe...\n\n" +

        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +
        "SORRY\n" +

        "now before you think this is a post-fight apology letter...\n\n" +

        "no no no \n\n" +

        "this is a pre sorry......\n\n" +

        "A pre-sorry for any future moment when my brain stops working properly\n" +
        "A pre-sorry for the days when I'm annoying\n" +
        "A pre-sorry for the times I forget something important\n" +
        "A pre-sorry for every dumb mistake that Future Me is probably planning right now\n\n" +

        "I hope you know that even when I mess up my feelings for you don't change.\n\n" +

        "I didn't make this because everything is perfect\n" +
        "I made it because you're important enough for me to spend time creating something just for you...\n\n" +

        "This has to be worth at least a small discount on my punishment\n" +
        "and i also wish to get more of your muwahhhh and less of your kuch ny aur by\n" +
        "now give me your biggest smile.........\n" +
        "❤️❤️";

    function onSceneActive(sceneId) {
        if (sceneId === "scene-3") {
            startScene3Typewriter();
        } else if (sceneId === "scene-4") {
            initScene4Characters();
        } else if (sceneId === "scene-5") {
            initScene5Growing();
        } else if (sceneId === "scene-7") {
            startScene7Letter();
        }
    }

    // ------------------------------------------
    // SCENE 1: LANDING MECHANICS
    // ------------------------------------------
    const btnOpenIt = document.getElementById("btn-open-it");
    const landingHeart = document.getElementById("landing-heart");

    btnOpenIt.addEventListener("click", () => {
        synth.playChime();

        // Spawn burst on the heart
        const rect = landingHeart.getBoundingClientRect();
        spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 35, "heart");

        // Transition
        transitionToScene("scene-1", "scene-2");
    });

    // ------------------------------------------
    // SCENE 2: US SO FAR (ENVELOPES)
    // ------------------------------------------
    const envelopeItems = document.querySelectorAll(".envelope-item");
    const modal = document.getElementById("envelope-modal");
    const modalClose = document.getElementById("modal-close-btn");
    const modalText = document.getElementById("envelope-message-text");
    const scene2Unlock = document.getElementById("scene2-unlock");
    const btnGotoScene3 = document.getElementById("btn-goto-scene3");

    envelopeItems.forEach(item => {
        item.addEventListener("click", () => {
            const idx = parseInt(item.getAttribute("data-index"));
            openedEnvelopes.add(idx);

            // Visual feedback
            const card = item.querySelector(".envelope-card");
            card.classList.add("opened");

            // Sound
            synth.playChime();

            // Particle effect
            const imgRect = card.getBoundingClientRect();
            spawnBurst(imgRect.left + imgRect.width / 2, imgRect.top + imgRect.height / 2, 10, "sparkle");

            // Show Message in overlay
            setTimeout(() => {
                modalText.innerText = envelopeMessages[idx];
                modal.classList.add("active");
            }, 550); // Small delay to let the paper sliding CSS animation complete!

            // Check completion threshold (4 envelopes)
            if (openedEnvelopes.size === 4) {
                setTimeout(() => {
                    scene2Unlock.classList.remove("hidden");
                }, 1000);
            }
        });
    });

    modalClose.addEventListener("click", () => {
        modal.classList.remove("active");
        synth.playPop(200, 0.08);
    });

    // Tap outside modal content to close
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("active");
        }
    });

    btnGotoScene3.addEventListener("click", () => {
        synth.playPop(180, 0.1);
        transitionToScene("scene-2", "scene-3");
    });

    // ------------------------------------------
    // SCENE 3: APOLOGY TYPEWRITER & SVG LOADER
    // ------------------------------------------
    const apologyBox = document.getElementById("apology-typewriter-box");
    const apologyTextContainer = document.getElementById("apology-text");
    const heartLiquid = document.getElementById("heart-liquid");
    const heartLabel = document.getElementById("heart-loader-label");
    const heartSparkles = document.getElementById("heart-loader-sparkles");
    const heartLoaderWrapper = document.getElementById("heart-loader-wrapper");

    let isScene3Running = false;

    function startScene3Typewriter() {
        if (isScene3Running) return;
        isScene3Running = true;

        apologyTextContainer.innerText = "";
        heartLiquid.setAttribute("y", "100"); // Start empty
        heartLabel.innerText = "Processing oopsies... 0%";
        heartLoaderWrapper.classList.remove("heart-clickable-btn");
        heartSparkles.classList.add("hidden");

        let currentLine = 0;
        let currentChar = 0;
        let totalLength = apologyLines.reduce((acc, l) => acc + l.length, 0);
        let charsTyped = 0;

        function type() {
            if (currentLine < apologyLines.length) {
                const line = apologyLines[currentLine];
                if (currentChar < line.length) {
                    apologyTextContainer.innerText += line[currentChar];
                    currentChar++;
                    charsTyped++;

                    // Calc progress fraction
                    const progress = charsTyped / totalLength;
                    const fillLevel = 100 - (progress * 90); // Liquid rect y starts at 100 (empty) and goes to 10 (full)
                    heartLiquid.setAttribute("y", fillLevel.toString());

                    heartLabel.innerText = `Processing oopsies... ${Math.min(100, Math.floor(progress * 100))}%`;

                    // Scrolling down automatically
                    apologyBox.scrollTop = apologyBox.scrollHeight;

                    // Play tiny clicking sound periodically
                    if (charsTyped % 5 === 0) {
                        synth.playPop(600 + Math.random() * 200, 0.03);
                    }

                    setTimeout(type, 35);
                } else {
                    currentLine++;
                    currentChar = 0;
                    setTimeout(type, 300);
                }
            } else {
                // Complete
                heartLiquid.setAttribute("y", "10");
                heartLabel.innerText = "Touch Me ❤️";
                heartSparkles.classList.remove("hidden");
                heartLoaderWrapper.classList.add("heart-clickable-btn");

                // Sound fanfare
                synth.playChime();

                const loaderRect = heartLiquid.getBoundingClientRect();
                spawnBurst(loaderRect.left + 45, loaderRect.top + 45, 20, "sparkle");
            }
        }
        setTimeout(type, 500);
    }

    heartLoaderWrapper.addEventListener("click", () => {
        if (!heartLoaderWrapper.classList.contains("heart-clickable-btn")) return;
        synth.playChime();
        const rect = heartLoaderWrapper.getBoundingClientRect();
        spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "heart");
        transitionToScene("scene-3", "scene-4");
    });

    // ------------------------------------------
    // SCENE 4: MINIATURE COUPLE GARDEN INTERACTIVE
    // ------------------------------------------
    const femaleWrap = document.getElementById("char-female-wrap");
    const maleWrap = document.getElementById("char-male-wrap");
    const femaleSprite = document.getElementById("sprite-female");
    const maleSprite = document.getElementById("sprite-male");
    const coupleInstruction = document.getElementById("couple-instruction");
    const powEffect = document.getElementById("pow-effect");
    const scene4Unlock = document.getElementById("scene4-unlock");
    const btnGotoScene5 = document.getElementById("btn-goto-scene5");

    const labelFemale = document.getElementById("label-female");
    const labelMale = document.getElementById("label-male");

    function initScene4Characters() {
        scene4State = 1;
        femaleWrap.className = "character-wrapper female-character glow-effect";
        maleWrap.className = "character-wrapper male-character";
        femaleSprite.src = "assets/female_idle.png";
        maleSprite.src = "assets/male_idle.png";

        // Setup initial labels
        labelFemale.classList.remove("hidden");
        labelMale.classList.add("hidden");

        coupleInstruction.innerText = "Tap them to share your affection ✨";
        scene4Unlock.classList.add("hidden");
        powEffect.classList.add("hidden");
    }

    femaleWrap.addEventListener("click", () => {
        if (scene4State !== 1) return;
        scene4State = 1.5; // lock taps

        // Hide girl's floating text immediately
        labelFemale.classList.add("hidden");

        // Play punch sequence
        femaleWrap.classList.remove("glow-effect");
        femaleWrap.classList.add("punch-action");
        femaleSprite.src = "assets/female_punch.png";

        // Sound retro comic punch
        synth.playPunch();

        // Male knocked back
        setTimeout(() => {
            maleWrap.classList.add("knocked-action");
            maleSprite.src = "assets/male_knocked.png";

            // Show POW comic popup
            powEffect.classList.remove("hidden");
            const rect = powEffect.getBoundingClientRect();
            spawnBurst(rect.left + 40, rect.top + 40, 12, "sparkle");
        }, 120);

        // Reset positions & advance state
        setTimeout(() => {
            powEffect.classList.add("hidden");
            femaleWrap.classList.remove("punch-action");
            femaleSprite.src = "assets/female_idle.png";
        }, 600);

        setTimeout(() => {
            maleWrap.classList.remove("knocked-action");
            maleSprite.src = "assets/male_idle.png";

            // Transition to State 2: glow male
            scene4State = 2;
            maleWrap.classList.add("glow-effect-male");

            // Show boy's floating text
            labelMale.classList.remove("hidden");
        }, 1400);
    });

    maleWrap.addEventListener("click", () => {
        if (scene4State !== 2) return;
        scene4State = 3; // complete state

        maleWrap.classList.remove("glow-effect-male");

        // Hide boy's floating text
        labelMale.classList.add("hidden");

        // Kneeling action
        maleWrap.classList.add("kneeling-action");
        maleSprite.src = "assets/male_kneeling.png";

        // Blushing action for girl
        femaleWrap.classList.add("blush-action");
        femaleSprite.src = "assets/female_blush.png";

        // Play chime sound
        synth.playChime();

        // Spawn tons of floating hearts!
        const stageRect = document.querySelector(".characters-container").getBoundingClientRect();
        spawnBurst(stageRect.left + stageRect.width / 3, stageRect.top + 50, 15, "heart");
        spawnBurst(stageRect.left + (stageRect.width * 2 / 3), stageRect.top + 50, 15, "petal");

        coupleInstruction.innerText = "Hearts aligned in the garden! 🌸";

        setTimeout(() => {
            scene4Unlock.classList.remove("hidden");
        }, 600);
    });

    btnGotoScene5.addEventListener("click", () => {
        synth.playPop(160, 0.12);
        transitionToScene("scene-4", "scene-5");
    });

    // ------------------------------------------
    // SCENE 5: GROWING HEART & LOCK (CONSOLIDATED)
    // ------------------------------------------
    const interactHeart = document.getElementById("interactive-grow-heart");
    const countBadge = document.getElementById("tap-counter");
    const dialogueBox = document.getElementById("growing-dialogue-box");
    const dialogueText = document.getElementById("growing-dialogue-text");
    const tapInstructionText = document.getElementById("tap-instruction-text");
    const dragKey = document.getElementById("draggable-key");
    const dropLock = document.getElementById("lock-dropzone");

    let isKeyUnlocked = false;

    function initScene5Growing() {
        growTaps = 0;
        countBadge.innerText = "0 / 100";
        interactHeart.style.fontSize = "40px";
        interactHeart.style.opacity = "1";
        interactHeart.style.pointerEvents = "auto";
        interactHeart.classList.remove("fade-out");

        dialogueBox.classList.add("hidden");
        tapInstructionText.innerText = "Keep tapping ❤️";

        // Reset key drag coordinates and hide
        isKeyUnlocked = false;
        dragKey.classList.add("hidden");
        dragKey.classList.remove("animate-slide-up");
        dragKey.style.transform = "none";
        dragKey.style.transition = "none";
        dragKey.style.opacity = "1";

        // Hide lock target
        dropLock.classList.add("hidden");
        dropLock.style.transition = "none";
        dropLock.style.transform = "scale(1) rotate(0deg)";
        dropLock.style.opacity = "1";
        dropLock.classList.remove("drag-hover");
    }

    interactHeart.addEventListener("click", (e) => {
        if (growTaps >= maxGrowTaps) return;
        growTaps++;

        countBadge.innerText = `${growTaps} / 100`;

        // Increase scale font sizes dynamically
        const newSize = 40 + (growTaps * 0.9); // Grows smoothly up to 130px
        interactHeart.style.fontSize = `${newSize}px`;

        // Sound
        synth.playPop(200 + (growTaps * 4), 0.1);

        // Spawn a heart sparkle
        spawnBurst(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2, 2, "heart");

        // Dialogue checkpoints
        const milestone = growingDialogues.find(d => d.taps === growTaps);
        if (milestone) {
            dialogueText.innerText = milestone.text;
            dialogueBox.classList.remove("hidden");
            synth.playChime();
        }

        // Taps complete event
        if (growTaps === maxGrowTaps) {
            interactHeart.style.pointerEvents = "none";
            tapInstructionText.innerText = "Amazing. ❤️";
            dialogueBox.classList.add("hidden");

            // Morph Heart into Lock!
            setTimeout(() => {
                interactHeart.classList.add("fade-out");

                setTimeout(() => {
                    // Spring pop lock target
                    dropLock.classList.remove("hidden");

                    // Slide in key from below dialogue box!
                    dragKey.classList.remove("hidden");
                    dragKey.classList.add("animate-slide-up");

                    tapInstructionText.innerText = "Drag the golden key to the heart lock 🗝️";
                    synth.playChime();

                    const lockRect = dropLock.getBoundingClientRect();
                    spawnBurst(lockRect.left + lockRect.width / 2, lockRect.top + lockRect.height / 2, 25, "sparkle");
                }, 400);
            }, 1000);
        }
    });

    btnGotoScene5.addEventListener("click", () => {
        synth.playPop(160, 0.1);
    });

    // Pointer Events dragging for both desktop and mobile
    let isDragging = false;
    let pointerStartX = 0;
    let pointerStartY = 0;

    dragKey.addEventListener("pointerdown", (e) => {
        if (isKeyUnlocked) return;
        isDragging = true;
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;

        // Clear key transition to follow touch/mouse movement smoothly
        dragKey.style.transition = "none";
        
        // Capture pointer so moves outside key bounds are tracked
        dragKey.setPointerCapture(e.pointerId);

        synth.playPop(250, 0.05);
        e.preventDefault();
    });

    dragKey.addEventListener("pointermove", (e) => {
        if (!isDragging || isKeyUnlocked) return;
        const diffX = e.clientX - pointerStartX;
        const diffY = e.clientY - pointerStartY;

        // Use CSS translate relative to static position to prevent jumping
        dragKey.style.transform = `translate(${diffX}px, ${diffY}px)`;

        // Check if cursor/finger overlaps Lock drop zone
        if (checkOverlap(dragKey, dropLock)) {
            dropLock.classList.add("drag-hover");
        } else {
            dropLock.classList.remove("drag-hover");
        }
        e.preventDefault();
    });

    dragKey.addEventListener("pointerup", (e) => {
        if (!isDragging) return;
        isDragging = false;
        dragKey.releasePointerCapture(e.pointerId);

        if (checkOverlap(dragKey, dropLock)) {
            triggerUnlockSequence();
        } else {
            // Return back to starting position smoothly via transform transition
            dragKey.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            dragKey.style.transform = "translate(0px, 0px)";
            synth.playPop(120, 0.08);
        }
    });

    dragKey.addEventListener("pointercancel", (e) => {
        if (!isDragging) return;
        isDragging = false;
        dragKey.releasePointerCapture(e.pointerId);
        dragKey.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        dragKey.style.transform = "translate(0px, 0px)";
    });

    function checkOverlap(elem1, elem2) {
        const r1 = elem1.getBoundingClientRect();
        const r2 = elem2.getBoundingClientRect();

        // Check simple intersecting box overlap
        return !(r1.right < r2.left ||
            r1.left > r2.right ||
            r1.bottom < r2.top ||
            r1.top > r2.bottom);
    }

    function triggerUnlockSequence() {
        isKeyUnlocked = true;
        dropLock.classList.remove("drag-hover");

        // Position key precisely in the keyhole
        dragKey.style.position = "absolute";
        const lockRect = dropLock.getBoundingClientRect();

        // Hide key and lock visually by applying unlocks, triggers sparks
        synth.playUnlock();

        // Flower petal explosion in canvas!
        spawnBurst(lockRect.left + lockRect.width / 2, lockRect.top + lockRect.height / 2, 45, "petal");
        spawnBurst(lockRect.left + lockRect.width / 2, lockRect.top + lockRect.height / 2, 25, "sparkle");

        // Lock spins and zooms away
        dropLock.style.transition = "transform 0.8s ease-in, opacity 0.8s ease";
        dropLock.style.transform = "scale(0) rotate(180deg)";
        dropLock.style.opacity = "0";
        dragKey.style.opacity = "0";

        setTimeout(() => {
            transitionToScene("scene-5", "scene-7");
        }, 900);
    }

    // ------------------------------------------
    // SCENE 7: FINAL APOLOGY LETTER
    // ------------------------------------------
    const letterTypewriter = document.getElementById("final-letter-typewriter");
    const replayWrapper = document.getElementById("replay-btn-wrapper");
    const btnReplay = document.getElementById("btn-replay");

    let isLetterRunning = false;

    function startScene7Letter() {
        if (isLetterRunning) return;
        isLetterRunning = true;

        letterTypewriter.innerText = "";
        replayWrapper.classList.add("hidden");

        let charIdx = 0;
        const letterScroll = document.querySelector(".final-letter-scrollable");

        function typeLetter() {
            if (charIdx < finalLetterCopy.length) {
                letterTypewriter.innerText += finalLetterCopy[charIdx];
                charIdx++;

                // Scroll down letter box automatically
                letterScroll.scrollTop = letterScroll.scrollHeight;

                if (charIdx % 6 === 0) {
                    synth.playPop(550 + Math.random() * 150, 0.02);
                }
                setTimeout(typeLetter, 45);
            } else {
                // Completed typing
                isLetterRunning = false;
                replayWrapper.classList.remove("hidden");
                synth.playChime();

                const letterRect = letterTypewriter.getBoundingClientRect();
                spawnBurst(letterRect.left + letterRect.width / 2, letterRect.top + 100, 20, "heart");
            }
        }
        setTimeout(typeLetter, 500);
    }

    // ------------------------------------------
    // RESET & REPLAY SYSTEM
    // ------------------------------------------
    btnReplay.addEventListener("click", () => {
        synth.playChime();

        // Reset Scene 2 Env States
        openedEnvelopes.clear();
        envelopeItems.forEach(item => {
            const card = item.querySelector(".envelope-card");
            card.classList.remove("opened");
        });
        scene2Unlock.classList.add("hidden");

        // Reset Scene 3
        isScene3Running = false;

        // Reset Scene 4 Chibi state
        scene4State = 1;
        femaleWrap.classList.remove("blush-action");
        maleWrap.classList.remove("kneeling-action");

        // Reset Scene 5 taps
        growTaps = 0;

        // Reset Scene 6 Lock
        dropLock.style.transition = "none";
        dropLock.style.transform = "scale(1) rotate(0deg)";
        dropLock.style.opacity = "1";
        dragKey.style.transform = "none";
        dragKey.style.transition = "none";
        dragKey.style.opacity = "1";

        // Transition back to Landing (Scene 1)
        transitionToScene("scene-7", "scene-1");
    });

});
