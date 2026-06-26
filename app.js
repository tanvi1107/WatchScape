// KRONOS APEX - Interactive Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const TOTAL_FRAMES = 300;
    const FRAME_DIRECTORY = 'ezgif-4957466ffa28f479-jpg';
    const FRAME_PREFIX = 'ezgif-frame-';
    const FRAME_EXTENSION = '.jpg';

    // Elements
    const canvas = document.getElementById('watch-canvas');
    const ctx = canvas.getContext('2d');
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const heroSection = document.getElementById('hero-scroll');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // Preloaded Images Cache
    const preloadedImages = [];
    let loadedImagesCount = 0;

    // Animation States
    let currentFrame = 1;
    let targetFrame = 1;
    let isLooping = false;

    // --- 1. PRELOADING FRAMES ---
    function preloadFrames() {
        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            const img = new Image();
            const paddedNum = String(i).padStart(3, '0');
            img.src = `${FRAME_DIRECTORY}/${FRAME_PREFIX}${paddedNum}${FRAME_EXTENSION}`;
            
            img.onload = () => {
                loadedImagesCount++;
                updateLoadingProgress();
            };

            img.onerror = () => {
                console.error(`Failed to load image frame: ${img.src}`);
                // Continue loading sequence even if a frame fails
                loadedImagesCount++;
                updateLoadingProgress();
            };

            preloadedImages.push(img);
        }
    }

    function updateLoadingProgress() {
        const percentage = Math.round((loadedImagesCount / TOTAL_FRAMES) * 100);
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;

        if (loadedImagesCount === TOTAL_FRAMES) {
            // Once all frames are preloaded, fade out the preloader
            setTimeout(() => {
                preloader.classList.add('fade-out');
                initApp();
            }, 500);
        }
    }

    // --- 2. CANVAS DRAWING LOGIC (COVER ASPECT FIT) ---
    function drawFrame(img) {
        if (!img || !img.complete) return;

        // Size canvas buffer to display size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const imgWidth = img.naturalWidth || 1280;
        const imgHeight = img.naturalHeight || 720;
        const imgRatio = imgWidth / imgHeight;
        const canvasRatio = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
            // Screen is wider than image (landscape cropped height)
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            // Screen is taller than image (portrait cropped width)
            drawWidth = canvas.height * imgRatio;
            drawHeight = canvas.height;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    // --- 3. TEXT OVERLAY TRIGGERS ---
    function updateTextOverlays(frame) {
        // Define active ranges for the texts:
        // Frame 1 to 65: Slide 1
        // Frame 80 to 145: Slide 2
        // Frame 160 to 225: Slide 3
        // Frame 240 to 300: Slide 4
        const activeId = 
            (frame >= 1 && frame <= 65) ? 'text-frame-1' :
            (frame >= 80 && frame <= 145) ? 'text-frame-2' :
            (frame >= 160 && frame <= 225) ? 'text-frame-3' :
            (frame >= 240 && frame <= 300) ? 'text-frame-4' : null;

        document.querySelectorAll('.overlay-text').forEach(overlay => {
            if (overlay.id === activeId) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        });
    }

    // --- 4. INITIALIZATION (GSAP SCROLLTRIGGER PINNING) ---
    function initApp() {
        // Draw the initial frame
        drawFrame(preloadedImages[0]);
        updateTextOverlays(1);

        // Register ScrollTrigger plugin
        gsap.registerPlugin(ScrollTrigger);

        // State object for GSAP to animate
        const watchState = { frame: 1 };

        // Dynamically calculate scroll height based on frame count (15px of scroll per frame)
        const scrollDistancePerFrame = 15;
        const totalScrollDistance = TOTAL_FRAMES * scrollDistancePerFrame;

        // Animate frame property mapped to ScrollTrigger pin & scrub
        gsap.to(watchState, {
            frame: TOTAL_FRAMES,
            ease: "none",
            scrollTrigger: {
                trigger: ".hero-scroll-container",
                start: "top top",
                end: () => `+=${totalScrollDistance}`,
                scrub: 0.5, // Dynamic lerp for smooth scrollbar tracking (0.5s catch-up)
                pin: true,  // Pins the entire hero container during animation
                anticipatePin: 1,
                onUpdate: (self) => {
                    const roundedFrame = Math.round(watchState.frame);
                    const clampedFrame = Math.max(1, Math.min(TOTAL_FRAMES, roundedFrame));
                    
                    // Render the frame to the canvas
                    drawFrame(preloadedImages[clampedFrame - 1]);
                    
                    // Update typography overlays
                    updateTextOverlays(clampedFrame);
                }
            }
        });

        // Listen for window resize to redraw current frame correctly
        window.addEventListener('resize', () => {
            const roundedFrame = Math.round(watchState.frame);
            const clampedFrame = Math.max(1, Math.min(TOTAL_FRAMES, roundedFrame));
            drawFrame(preloadedImages[clampedFrame - 1]);
        });
    }

    // --- 7. MOBILE MENU TOGGLE ---
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('mobile-active');
            
            // Toggle hamburger icon animation states
            if (mobileToggle.classList.contains('active')) {
                document.body.style.overflow = 'hidden'; // Lock background scroll
            } else {
                document.body.style.overflow = '';
            }
        });
    }

    // Close mobile menu on links click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            navMenu.classList.remove('mobile-active');
            document.body.style.overflow = '';
        });
    });

    // Start loading sequence
    preloadFrames();
});
