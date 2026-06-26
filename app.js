// KRONOS APEX - Interactive Application Logic

document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Configuration
    const TOTAL_FRAMES = 300;
    const FRAME_DIRECTORY = 'ezgif-4957466ffa28f479-jpg';
    const FRAME_PREFIX = 'ezgif-frame-';
    const FRAME_EXTENSION = '.jpg';

    // Elements
    const canvas = document.getElementById('watch-canvas');
    const ctx = canvas.getContext('2d');
    const preloader = document.getElementById('preloader');
    const loaderCircle = document.getElementById('loader-circle');
    const loaderPercentage = document.getElementById('loader-percentage');
    const heroSection = document.getElementById('hero-scroll');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // Preloaded Images Cache
    const preloadedImages = [];
    let loadedImagesCount = 0;

    // Smoothed Loading Progress States (Interpolation)
    let targetPercentage = 0;
    let displayedPercentage = 0;
    let progressLoopActive = true;

    // Animation States
    let currentFrame = 1;
    let targetFrame = 1;
    let isLooping = false;
    const watchState = { frame: 1 };

    // --- 1. PRELOADING FRAMES ---
    function preloadFrames() {
        // A. Splitting Preloader Title into Staggered Spans
        const titleEl = document.querySelector('.preloader-title');
        if (titleEl) {
            if (prefersReducedMotion) {
                titleEl.style.opacity = '1';
                titleEl.style.transform = 'none';
            } else {
                const letters = titleEl.textContent.trim().split('');
                titleEl.textContent = '';
                letters.forEach((char, index) => {
                    const span = document.createElement('span');
                    span.textContent = char;
                    span.style.display = 'inline-block';
                    span.style.opacity = '0';
                    span.style.transform = 'translate3d(0, 20px, 0)';
                    span.style.willChange = 'transform, opacity';
                    titleEl.appendChild(span);

                    gsap.to(span, {
                        opacity: 1,
                        y: 0,
                        duration: 1.2,
                        delay: 0.15 + (index * 0.08),
                        ease: "power4.out"
                    });
                });
            }
        }

        // B. Animate Preloader Subtitle
        const subtitleEl = document.querySelector('.preloader-subtitle');
        if (subtitleEl) {
            if (prefersReducedMotion) {
                subtitleEl.style.opacity = '1';
                subtitleEl.style.transform = 'none';
            } else {
                gsap.fromTo(subtitleEl,
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 1.2, delay: 0.7, ease: "power3.out" }
                );
            }
        }

        // Initialize cache array with Image objects synchronously to preserve order
        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            preloadedImages.push(new Image());
        }

        // Load the critical first frame immediately to draw FCP watch layout
        const firstImg = preloadedImages[0];
        const paddedNum = String(1).padStart(3, '0');
        firstImg.src = `${FRAME_DIRECTORY}/${FRAME_PREFIX}${paddedNum}${FRAME_EXTENSION}`;
        
        firstImg.onload = () => {
            loadedImagesCount++;
            updateLoadingProgress();
            
            // Draw the first frame immediately
            if (canvas) {
                const dpr = window.devicePixelRatio || 1;
                canvas.width = window.innerWidth * dpr;
                canvas.height = window.innerHeight * dpr;
                drawFrame(firstImg);
            }
            
            // Begin preloading the remaining 299 frames
            preloadRemainingFrames();
        };

        firstImg.onerror = () => {
            console.error("Failed to load critical first frame.");
            loadedImagesCount++;
            updateLoadingProgress();
            preloadRemainingFrames();
        };
    }

    function preloadRemainingFrames() {
        // Start the progress interpolation loop immediately
        requestAnimationFrame(updateProgressLoop);

        // Load in batches of 30 to avoid saturating the HTTP/2 connection pool
        // and keep the main thread responsive during initial load.
        const BATCH_SIZE = 30;
        let nextFrameIndex = 2; // Frame 1 already loaded

        function loadNextBatch() {
            const batchEnd = Math.min(nextFrameIndex + BATCH_SIZE - 1, TOTAL_FRAMES);
            let batchLoaded = 0;
            const batchCount = batchEnd - nextFrameIndex + 1;

            for (let i = nextFrameIndex; i <= batchEnd; i++) {
                const img = preloadedImages[i - 1];
                const paddedNum = String(i).padStart(3, '0');
                img.src = `${FRAME_DIRECTORY}/${FRAME_PREFIX}${paddedNum}${FRAME_EXTENSION}`;

                const onSettled = () => {
                    loadedImagesCount++;
                    updateLoadingProgress();
                    batchLoaded++;
                    if (batchLoaded === batchCount && nextFrameIndex <= TOTAL_FRAMES) {
                        loadNextBatch(); // Kick off next batch when this one finishes
                    }
                };

                img.onload = onSettled;
                img.onerror = () => {
                    console.error(`Failed to load image frame: ${img.src}`);
                    onSettled();
                };
            }

            nextFrameIndex = batchEnd + 1;
        }

        loadNextBatch();
    }

    function updateLoadingProgress() {
        targetPercentage = Math.round((loadedImagesCount / TOTAL_FRAMES) * 100);
    }

    // High-performance progress loop using linear interpolation (lerp)
    function updateProgressLoop() {
        if (!progressLoopActive) return;

        // Smoothly slide displayed progress towards target progress
        const percentageDiff = targetPercentage - displayedPercentage;
        
        if (percentageDiff > 0.1) {
            displayedPercentage += percentageDiff * 0.06; // Lerp smoothing factor
        } else {
            displayedPercentage = targetPercentage;
        }

        const roundedPercent = Math.round(displayedPercentage);

        // Update SVG circle stroke offset (circumference = 283)
        if (loaderCircle) {
            const offset = 283 - (roundedPercent / 100) * 283;
            loaderCircle.style.strokeDashoffset = offset;
        }

        // Update percentage text with zero padding
        if (loaderPercentage) {
            loaderPercentage.textContent = String(roundedPercent).padStart(2, '0');
        }

        // Only slide out if counter reaches 100% and files are completely loaded
        if (roundedPercent === 100 && loadedImagesCount === TOTAL_FRAMES) {
            progressLoopActive = false;

            // Coordinated luxury GSAP exit transition
            const exitTimeline = gsap.timeline();
            if (prefersReducedMotion) {
                exitTimeline
                    .to(".preloader-content", {
                        opacity: 0,
                        duration: 0.3
                    })
                    .to(preloader, {
                        opacity: 0,
                        duration: 0.3,
                        onComplete: () => {
                            preloader.style.display = 'none';
                            preloader.setAttribute('aria-hidden', 'true');
                            preloader.setAttribute('aria-busy', 'false');
                            // Same fix as non-reduced path: initApp() runs inside onComplete
                            // so ScrollTrigger sees the correct post-preloader document height.
                            initApp();
                        }
                    }, "-=0.1");
            } else {
                exitTimeline
                    .to(".preloader-content", {
                        opacity: 0,
                        y: -30,
                        scale: 0.95,
                        duration: 0.8,
                        ease: "power2.inOut"
                    })
                    .to(preloader, {
                        opacity: 0,
                        duration: 1.0,
                        ease: "power2.inOut",
                        onComplete: () => {
                            preloader.style.display = 'none';
                            preloader.setAttribute('aria-hidden', 'true');
                            preloader.setAttribute('aria-busy', 'false');
                            // initApp() is called here — AFTER preloader is fully removed from
                            // document flow — so ScrollTrigger measures the correct document height.
                            // Previously called mid-animation at "-=0.8" which caused pin spacers
                            // to be calculated against an incorrect (preloader-inflated) page height.
                            initApp();
                        }
                    }, "-=0.3");
            }
        } else {
            requestAnimationFrame(updateProgressLoop);
        }
    }

    // --- 2. CANVAS DRAWING LOGIC (COVER ASPECT FIT) ---
    let lastDrawnFrame = -1; // Frame deduplication cache
    let cachedCanvasWidth = 0;
    let cachedCanvasHeight = 0;

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const newWidth = window.innerWidth * dpr;
        const newHeight = window.innerHeight * dpr;

        // Skip resize if dimensions haven't actually changed (e.g., mobile URL bar toggling)
        if (newWidth === cachedCanvasWidth && newHeight === cachedCanvasHeight) return;

        canvas.width = newWidth;
        canvas.height = newHeight;
        cachedCanvasWidth = newWidth;
        cachedCanvasHeight = newHeight;
        lastDrawnFrame = -1; // Force redraw after resize
        
        // Redraw current active frame immediately on resize
        const currentActive = preloadedImages[Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(watchState.frame) - 1))];
        if (currentActive) {
            drawFrame(currentActive, true);
        }
    }

    function drawFrame(img, forceRedraw) {
        if (!img || !img.complete) return;

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
        
        // Apply high-quality image interpolation algorithms
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    // --- 3. INITIALIZATION (GSAP TIMELINE & SCROLLTRIGGER PINNING) ---
    function initApp() {
        // Size canvas and draw the initial frame
        resizeCanvas();

        // Register ScrollTrigger plugin
        gsap.registerPlugin(ScrollTrigger);

        // After ALL assets are loaded (fonts, images, etc.) force a full ScrollTrigger
        // recalculation. Google Fonts load asynchronously after DOMContentLoaded and can
        // shift element heights, which misaligns pin spacers calculated at initApp() time.
        // The double-rAF ensures this runs after the browser's own layout pass on 'load'.
        // invalidateOnRefresh:true on each pinned timeline re-evaluates dynamic end values.
        window.addEventListener('load', () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    ScrollTrigger.refresh(true);
                });
            });
        }, { once: true, passive: true });

        // Also refresh after a short delay to catch any deferred rendering
        // (e.g., content-paint, image decoding) that happens after 'load' fires.
        setTimeout(() => ScrollTrigger.refresh(true), 500);

        // Dynamically calculate scroll height based on frame count (15px of scroll per frame)
        const scrollDistancePerFrame = 15;
        const totalScrollDistance = TOTAL_FRAMES * scrollDistancePerFrame;

        // Detect device breakpoint
        const isMobile = window.innerWidth <= 768;

        // Set perspective for 3D mouse parallax on wrapper
        gsap.set(".canvas-sticky-wrapper", { perspective: 1500 });
        gsap.set(canvas, { filter: "blur(0px) contrast(1.06) brightness(1.02) saturate(1.04)" });

        // Set initial state for all text frames
        gsap.set(".overlay-text", { opacity: 0 });

        if (isMobile) {
            // Center all overlays vertically on mobile
            gsap.set(["#text-frame-1", "#text-frame-2", "#text-frame-3", "#text-frame-4"], {
                yPercent: -50,
                y: 40,
                clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)"
            });
        } else {
            // Desktop Asymmetrical Layouts
            gsap.set(["#text-frame-1", "#text-frame-4"], {
                yPercent: 0,
                y: 40,
                clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)"
            });
            gsap.set(["#text-frame-2", "#text-frame-3"], {
                yPercent: -50,
                y: 40,
                clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)"
            });
        }

        // --- 1. PREMIUM ENTRANCE ANIMATIONS (Runs once on load) ---
        const entranceTl = gsap.timeline();

        if (prefersReducedMotion) {
            entranceTl.fromTo(canvas, 
                { opacity: 0 },
                { opacity: 1, duration: 0.3 },
                0
            );
            entranceTl.to("#text-frame-1", {
                opacity: 1,
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                duration: 0.3
            }, 0.1);
            entranceTl.fromTo(".navbar",
                { opacity: 0 },
                { opacity: 1, duration: 0.3 },
                0.2
            );
            entranceTl.fromTo([".logo", ".nav-link", ".nav-cta"],
                { opacity: 0 },
                { opacity: 1, duration: 0.3, stagger: 0.02 },
                0.3
            );
        } else {
            // Canvas slides and zooms in smoothly
            entranceTl.fromTo(canvas, 
                { opacity: 0, scale: 1.15 },
                { opacity: 1, scale: 1, duration: 2.2, ease: "power4.out" },
                0
            );

            // Slide 1 (KRONOS APEX Title) slides up out of clipping mask
            entranceTl.to("#text-frame-1", {
                opacity: 1,
                y: 0,
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                duration: 1.8,
                ease: "power4.out"
            }, 0.5);

            // Cascading navbar entrance (reveals from top)
            entranceTl.fromTo(".navbar",
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" },
                0.8
            );
            entranceTl.fromTo([".logo", ".nav-link", ".nav-cta"],
                { opacity: 0, y: -10 },
                { opacity: 1, y: 0, duration: 1.0, stagger: 0.06, ease: "power3.out" },
                1.0
            );
        }

        // --- 2. SCROLL-DRIVEN TIMELINE (Locks scroll until complete) ---
        const scrollTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: ".hero-scroll-container",
                start: "top top",
                end: () => `+=${totalScrollDistance}`,
                scrub: 0.8,
                pin: true,
                anticipatePin: 1,
                // Recompute end value and pin spacer height on every ScrollTrigger.refresh() call.
                // Without this, a refresh after fonts/images load would not update the spacer size.
                invalidateOnRefresh: true
            }
        });

        // Frame sequence rotation
        scrollTimeline.to(watchState, {
            frame: TOTAL_FRAMES,
            ease: "none",
            duration: 1,
            onUpdate: () => {
                const roundedFrame = Math.round(watchState.frame);
                const clampedFrame = Math.max(1, Math.min(TOTAL_FRAMES, roundedFrame));
                // Deduplication: skip drawFrame if the frame index hasn't changed
                if (clampedFrame !== lastDrawnFrame) {
                    lastDrawnFrame = clampedFrame;
                    drawFrame(preloadedImages[clampedFrame - 1]);
                }
            }
        }, 0);

        // --- TEXT REVEAL KEYFRAMES ON SCROLL TIMELINE ---

        // Slide 1 transitions out (Frame progress 0.18 to 0.22)
        scrollTimeline.to("#text-frame-1", {
            opacity: 0,
            y: isMobile ? -60 : -40,
            yPercent: isMobile ? -50 : 0,
            clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
            ease: "power2.inOut",
            duration: 0.05
        }, 0.18);

        // Slide 2 (316L Steel) transitions in (0.23 to 0.28) and out (0.45 to 0.50)
        scrollTimeline.to("#text-frame-2", {
            opacity: 1,
            y: 0,
            yPercent: -50,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            ease: "power2.out",
            duration: 0.05
        }, 0.23);
        scrollTimeline.to("#text-frame-2", {
            opacity: 0,
            y: isMobile ? -60 : -40,
            yPercent: -50,
            clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
            ease: "power2.in",
            duration: 0.05
        }, 0.45);

        // Slide 3 (Caliber K-18) transitions in (0.51 to 0.56) and out (0.72 to 0.77)
        scrollTimeline.to("#text-frame-3", {
            opacity: 1,
            y: 0,
            yPercent: -50,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            ease: "power2.out",
            duration: 0.05
        }, 0.51);
        scrollTimeline.to("#text-frame-3", {
            opacity: 0,
            y: isMobile ? -60 : -40,
            yPercent: -50,
            clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
            ease: "power2.in",
            duration: 0.05
        }, 0.72);

        // Slide 4 (CTA) transitions in (0.78 to 0.83)
        scrollTimeline.to("#text-frame-4", {
            opacity: 1,
            y: 0,
            yPercent: isMobile ? -50 : 0,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            ease: "power2.out",
            duration: 0.05
        }, 0.78);

        // Hero exit transition — opacity + scale only (no scrubbed blur: paint-expensive)
        scrollTimeline.to(canvas, {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 0.97,
            ease: "power2.inOut",
            duration: 0.12
        }, 0.88);

        scrollTimeline.to(".scroll-overlays", {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 0.97,
            ease: "power2.inOut",
            duration: 0.12
        }, 0.88);

        // --- 3. SUBTLE MOUSE PARALLAX INTERACTION ---
        if (!isMobile && !prefersReducedMotion) {
            heroSection.addEventListener('mousemove', (e) => {
                const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
                const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

                gsap.to(canvas, {
                    x: x * -15, // Horizontal movement
                    y: y * -15, // Vertical movement
                    rotationY: x * 1.5, // Subtle 3D tilt
                    rotationX: y * -1.5,
                    duration: 1.2,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            }, { passive: true });

            heroSection.addEventListener('mouseleave', () => {
                gsap.to(canvas, {
                    x: 0,
                    y: 0,
                    rotationX: 0,
                    rotationY: 0,
                    duration: 1.5,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            }, { passive: true });
        }

        // Listen for window resize to redraw current frame correctly
        // Debounced at 200ms; skips no-op redraws if canvas dimensions are unchanged
        let resizeTimeout;
        let lastResizeW = window.innerWidth;
        let lastResizeH = window.innerHeight;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth !== lastResizeW || window.innerHeight !== lastResizeH) {
                    lastResizeW = window.innerWidth;
                    lastResizeH = window.innerHeight;
                    resizeCanvas();
                }
            }, 200);
        }, { passive: true });

        // Initialize advanced animations for all content sections
        initSectionAnimations();
    }

    // --- 5. SECTION ANIMATIONS (EDITORIAL ENTRIES, SCROLLTELLING, & COUNTERS) ---
    function initSectionAnimations() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Helper to adjust parameters for single tweens
        function motionParams(params) {
            if (!prefersReducedMotion) return params;
            const copy = { ...params };
            if (copy.y !== undefined) copy.y = 0;
            if (copy.x !== undefined) copy.x = 0;
            if (copy.yPercent !== undefined) copy.yPercent = 0;
            if (copy.xPercent !== undefined) copy.xPercent = 0;
            if (copy.scale !== undefined) delete copy.scale;
            if (copy.rotation !== undefined) delete copy.rotation;
            if (copy.clipPath !== undefined) delete copy.clipPath;
            if (copy.filter !== undefined) delete copy.filter;
            if (copy.duration !== undefined) copy.duration = 0.3;
            if (copy.stagger !== undefined) copy.stagger = 0.02;
            return copy;
        }

        // Helper to adjust parameters for fromTo tweens
        function motionParamsFromTo(fromParams, toParams) {
            if (!prefersReducedMotion) return [fromParams, toParams];
            
            const fromCopy = { ...fromParams };
            const toCopy = { ...toParams };
            
            if (fromCopy.y !== undefined) fromCopy.y = 0;
            if (fromCopy.x !== undefined) fromCopy.x = 0;
            if (fromCopy.yPercent !== undefined) fromCopy.yPercent = 0;
            if (fromCopy.xPercent !== undefined) fromCopy.xPercent = 0;
            if (fromCopy.scale !== undefined) delete fromCopy.scale;
            if (fromCopy.rotation !== undefined) delete fromCopy.rotation;
            if (fromCopy.clipPath !== undefined) delete fromCopy.clipPath;
            if (fromCopy.filter !== undefined) delete fromCopy.filter;
            
            if (toCopy.y !== undefined) toCopy.y = 0;
            if (toCopy.x !== undefined) toCopy.x = 0;
            if (toCopy.yPercent !== undefined) toCopy.yPercent = 0;
            if (toCopy.xPercent !== undefined) toCopy.xPercent = 0;
            if (toCopy.scale !== undefined) delete toCopy.scale;
            if (toCopy.rotation !== undefined) delete toCopy.rotation;
            if (toCopy.clipPath !== undefined) delete toCopy.clipPath;
            if (toCopy.filter !== undefined) delete toCopy.filter;
            if (toCopy.duration !== undefined) toCopy.duration = 0.3;
            if (toCopy.stagger !== undefined) toCopy.stagger = 0.02;
            
            return [fromCopy, toCopy];
        }

        // Subtle floating animation for the watch (looping infinitely)
        if (!prefersReducedMotion) {
            gsap.to(".watch-float-container", {
                y: -8,
                rotation: 1,
                duration: 4,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true
            });
        }

        // --- 1. FEATURES SECTION (ROLEX/APPLE STORIES PINNING & CONNECTORS) ---
        // Setup matchMedia responsive timeline
        const mm = gsap.matchMedia();

        // Desktop pinned scroll story
        mm.add("(min-width: 769px)", () => {
            // Header slide reveals
            gsap.from("#features .section-tag", motionParams({
                opacity: 0,
                y: 20,
                duration: 1.0,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#features",
                    start: "top 80%"
                }
            }));
            gsap.from("#features .section-title, #features .section-desc-luxury", motionParams({
                opacity: 0,
                y: 30,
                clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
                duration: 1.2,
                stagger: 0.15,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: "#features",
                    start: "top 75%"
                }
            }));

            // Master pinning timeline
            const craftStoryTimeline = gsap.timeline({
                scrollTrigger: {
                    trigger: "#features",
                    start: "top top",
                    end: () => `+=${window.innerHeight * 2.5}`, // Locks scroll for 2.5 screens
                    scrub: 0.8,
                    pin: true,
                    anticipatePin: 1,
                    // Recompute dynamic end value and pin spacer on every refresh call.
                    invalidateOnRefresh: true
                }
            });

            // Step 2: Watch Fades and Scales In
            craftStoryTimeline.fromTo(".watch-center-wrapper", 
                ...motionParamsFromTo(
                    { opacity: 0, scale: 0.6, xPercent: -50, yPercent: -50 },
                    { opacity: 1, scale: 1, xPercent: -50, yPercent: -50, duration: 1.0, ease: "power2.out" }
                )
            );

            // Step 3: Sapphire Crystal callout and watch highlight
            craftStoryTimeline.addLabel("sapphire");
            craftStoryTimeline.to(".watch-render-img", motionParams({
                scale: 1.25,
                rotation: -8,
                x: 20,
                y: 30,
                duration: 1.0,
                ease: "power2.inOut"
            }), "sapphire");
            craftStoryTimeline.to(".watch-glow", motionParams({
                scale: 1.3,
                opacity: 1.5,
                x: -30,
                y: -30,
                duration: 1.0,
                ease: "power2.inOut"
            }), "sapphire");
            craftStoryTimeline.fromTo("#line-sapphire", 
                ...motionParamsFromTo(
                    { strokeDashoffset: prefersReducedMotion ? 0 : 1000 }, 
                    { strokeDashoffset: 0, duration: 0.8, ease: "none" }
                ),
                "sapphire"
            );
            craftStoryTimeline.fromTo("#callout-sapphire", 
                ...motionParamsFromTo(
                    { opacity: 0, x: -25 }, 
                    { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }
                ), 
                "sapphire+=0.1"
            );
            craftStoryTimeline.fromTo("#callout-sapphire .callout-title", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "sapphire+=0.2"
            );
            craftStoryTimeline.fromTo("#callout-sapphire .callout-desc", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "sapphire+=0.4"
            );

            // Step 4: Titanium Case callout and watch highlight
            craftStoryTimeline.addLabel("case");
            craftStoryTimeline.to(".watch-render-img", motionParams({
                scale: 1.2,
                rotation: 12,
                x: -30,
                y: -10,
                duration: 1.0,
                ease: "power2.inOut"
            }), "case");
            craftStoryTimeline.to(".watch-glow", motionParams({
                scale: 1.25,
                opacity: 1.4,
                x: 35,
                y: -20,
                duration: 1.0,
                ease: "power2.inOut"
            }), "case");
            craftStoryTimeline.fromTo("#line-case", 
                ...motionParamsFromTo(
                    { strokeDashoffset: prefersReducedMotion ? 0 : 1000 }, 
                    { strokeDashoffset: 0, duration: 0.8, ease: "none" }
                ),
                "case"
            );
            craftStoryTimeline.fromTo("#callout-case", 
                ...motionParamsFromTo(
                    { opacity: 0, x: 25 }, 
                    { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }
                ), 
                "case+=0.1"
            );
            craftStoryTimeline.fromTo("#callout-case .callout-title", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "case+=0.2"
            );
            craftStoryTimeline.fromTo("#callout-case .callout-desc", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "case+=0.4"
            );

            // Step 5: Automatic Movement callout and watch highlight
            craftStoryTimeline.addLabel("movement");
            craftStoryTimeline.to(".watch-render-img", motionParams({
                scale: 1.35,
                rotation: -5,
                x: 0,
                y: 0,
                duration: 1.0,
                ease: "power2.inOut"
            }), "movement");
            craftStoryTimeline.to(".watch-glow", motionParams({
                scale: 1.45,
                opacity: 1.8,
                x: 0,
                y: -10,
                duration: 1.0,
                ease: "power2.inOut"
            }), "movement");
            craftStoryTimeline.fromTo("#line-movement", 
                ...motionParamsFromTo(
                    { strokeDashoffset: prefersReducedMotion ? 0 : 1000 }, 
                    { strokeDashoffset: 0, duration: 0.8, ease: "none" }
                ),
                "movement"
            );
            craftStoryTimeline.fromTo("#callout-movement", 
                ...motionParamsFromTo(
                    { opacity: 0, x: -25 }, 
                    { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }
                ), 
                "movement+=0.1"
            );
            craftStoryTimeline.fromTo("#callout-movement .callout-title", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "movement+=0.2"
            );
            craftStoryTimeline.fromTo("#callout-movement .callout-desc", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "movement+=0.4"
            );

            // Step 6: Premium Leather Strap callout and watch highlight
            craftStoryTimeline.addLabel("strap");
            craftStoryTimeline.to(".watch-render-img", motionParams({
                scale: 1.05,
                rotation: 0,
                x: 0,
                y: -55,
                duration: 1.0,
                ease: "power2.inOut"
            }), "strap");
            craftStoryTimeline.to(".watch-glow", motionParams({
                scale: 1.1,
                opacity: 1.1,
                x: 0,
                y: 50,
                duration: 1.0,
                ease: "power2.inOut"
            }), "strap");
            craftStoryTimeline.fromTo("#line-strap", 
                ...motionParamsFromTo(
                    { strokeDashoffset: prefersReducedMotion ? 0 : 1000 }, 
                    { strokeDashoffset: 0, duration: 0.8, ease: "none" }
                ),
                "strap"
            );
            craftStoryTimeline.fromTo("#callout-strap", 
                ...motionParamsFromTo(
                    { opacity: 0, x: 25 }, 
                    { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }
                ), 
                "strap+=0.1"
            );
            craftStoryTimeline.fromTo("#callout-strap .callout-title", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "strap+=0.2"
            );
            craftStoryTimeline.fromTo("#callout-strap .callout-desc", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 12 }, 
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                ), 
                "strap+=0.4"
            );

            // Step 7: Reset Watch and Show Explore CTA Button
            craftStoryTimeline.addLabel("cta");
            craftStoryTimeline.to(".watch-render-img", motionParams({
                scale: 1.0,
                rotation: 0,
                x: 0,
                y: 0,
                duration: 1.0,
                ease: "power2.inOut"
            }), "cta");
            craftStoryTimeline.to(".watch-glow", motionParams({
                scale: 1.0,
                opacity: 1.0,
                x: 0,
                y: 0,
                duration: 1.0,
                ease: "power2.inOut"
            }), "cta");
            craftStoryTimeline.fromTo(".craft-cta-wrapper", 
                ...motionParamsFromTo(
                    { opacity: 0, y: 25 },
                    { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }
                ),
                "cta"
            );
        });

        // Mobile natural scroll reveals
        mm.add("(max-width: 768px)", () => {
            // Header reveal
            gsap.from("#features .section-header > *", motionParams({
                opacity: 0,
                y: 20,
                stagger: 0.15,
                duration: 1.0,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#features",
                    start: "top 85%"
                }
            }));

            // Watch reveals
            gsap.fromTo(".watch-center-wrapper", 
                ...motionParamsFromTo(
                    { opacity: 0, scale: 0.85 },
                    { 
                        opacity: 1, 
                        scale: 1, 
                        duration: 1.2, 
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: ".watch-center-wrapper",
                            start: "top 80%"
                        }
                    }
                )
            );

            // Callout staggers
            gsap.from(".feature-callout", motionParams({
                opacity: 0,
                y: 35,
                duration: 1.0,
                stagger: 0.25,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: ".watch-center-wrapper",
                    start: "bottom 75%"
                }
            }));

            // CTA Button reveal
            gsap.from(".craft-cta-wrapper", motionParams({
                opacity: 0,
                y: 20,
                duration: 1.0,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: ".craft-cta-wrapper",
                    start: "top 90%"
                }
            }));
        });

        // --- 2. SPECIFICATIONS SECTION ---
        // Info reveal
        gsap.from("#specifications .section-tag", motionParams({
            opacity: 0,
            y: 20,
            duration: 1.0,
            ease: "power2.out",
            scrollTrigger: {
                trigger: "#specifications",
                start: "top 80%"
            }
        }));
        gsap.from("#specifications .section-title", motionParams({
            opacity: 0,
            y: 30,
            clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#specifications",
                start: "top 75%"
            }
        }));
        gsap.from(".specs-intro", motionParams({
            opacity: 0,
            y: 20,
            duration: 1.2,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".specs-intro",
                start: "top 85%"
            }
        }));

        // Spec list rows slide-up stagger
        gsap.from(".spec-list .spec-item", motionParams({
            opacity: 0,
            y: 20,
            duration: 1.0,
            stagger: 0.1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".spec-list",
                start: "top 80%"
            }
        }));

        // Specs visual box and internal accent elements
        gsap.from(".specs-visual", motionParams({
            opacity: 0,
            scale: 0.96,
            duration: 1.5,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".specs-visual",
                start: "top 80%"
            }
        }));
        gsap.from(".specs-accent-box > *", motionParams({
            opacity: 0,
            y: 20,
            duration: 1.2,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".specs-accent-box",
                start: "top 85%"
            }
        }));

        // --- 3. CRAFTSMANSHIP SECTION ---
        // Header and text
        gsap.from(".craft-content .section-tag", motionParams({
            opacity: 0,
            y: 20,
            duration: 1.0,
            ease: "power2.out",
            scrollTrigger: {
                trigger: "#craftsmanship",
                start: "top 80%"
            }
        }));
        gsap.from(".craft-title", motionParams({
            opacity: 0,
            y: 30,
            clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#craftsmanship",
                start: "top 75%"
            }
        }));
        gsap.from(".craft-text", motionParams({
            opacity: 0,
            y: 20,
            duration: 1.2,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".craft-text",
                start: "top 80%"
            }
        }));

        // Stats entrance & Counting numbers animation
        const statsTrigger = {
            trigger: ".craft-stats",
            start: "top 85%",
            onEnter: () => {
                // Count up animations
                animateNumberValue(".craft-stats .stat-item:nth-child(1) .stat-number", 185);
                animateNumberValue(".craft-stats .stat-item:nth-child(2) .stat-number", 25);
                animateNumberValue(".craft-stats .stat-item:nth-child(3) .stat-number", 300);
            }
        };

        gsap.from(".craft-stats .stat-item", motionParams({
            opacity: 0,
            y: 30,
            duration: 1.2,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: statsTrigger
        }));

        function animateNumberValue(selector, endValue) {
            const el = document.querySelector(selector);
            if (!el) return;
            if (prefersReducedMotion) {
                el.textContent = endValue;
                return;
            }
            const obj = { val: 0 };
            gsap.to(obj, {
                val: endValue,
                duration: 2.0,
                ease: "power3.out",
                onUpdate: () => {
                    el.textContent = Math.floor(obj.val);
                }
            });
        }

        // --- 4. ACQUIRE SECTION ---
        gsap.from(".acquire-card", motionParams({
            opacity: 0,
            y: 50,
            duration: 1.5,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#acquire",
                start: "top 75%"
            }
        }));
        
        gsap.from(".acquire-content > *:not(.acquire-form)", motionParams({
            opacity: 0,
            y: 20,
            duration: 1.2,
            stagger: 0.2,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".acquire-content",
                start: "top 80%"
            }
        }));

        gsap.from(".acquire-form .form-group", motionParams({
            opacity: 0,
            y: 15,
            duration: 1.0,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".acquire-form",
                start: "top 85%"
            }
        }));
        
        gsap.from(".acquire-form button", motionParams({
            opacity: 0,
            y: 15,
            duration: 1.0,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".acquire-form button",
                start: "top 90%"
            }
        }));

        // --- 5. PREMIUM SECTION-TO-SECTION TRANSITIONS ---
        // Initial state: all section containers start invisible, revealed by one-shot scroll tweens below
        gsap.set(["#features .container", "#specifications .container", "#craftsmanship .container", "#acquire .container"], {
            opacity: 0
        });
        if (!prefersReducedMotion) {
            gsap.set(["#features .container", "#specifications .container", "#craftsmanship .container", "#acquire .container"], {
                scale: 0.97,
                y: 20
            });
        }

        // 1. Entrance of Features Section (storytelling features)
        // One-shot tween triggered once on scroll enter — NOT scrubbed per tick
        gsap.fromTo("#features .container",
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 20 },
            {
                opacity: 1, scale: 1, y: 0,
                duration: prefersReducedMotion ? 0.3 : 0.9,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#features",
                    start: "top 90%",
                    once: true // Fires once, not scrubbed
                }
            }
        );

        // 2. Features Section -> Specifications Section Transition
        // One-shot: fires once as #specifications enters, no scrubbing
        gsap.fromTo("#specifications .container",
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 20 },
            {
                opacity: 1, scale: 1, y: 0,
                duration: prefersReducedMotion ? 0.3 : 0.9,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#specifications",
                    start: "top 85%",
                    once: true
                }
            }
        );

        // 3. Specifications Section -> Craftsmanship Section Transition
        gsap.fromTo("#craftsmanship .container",
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 20 },
            {
                opacity: 1, scale: 1, y: 0,
                duration: prefersReducedMotion ? 0.3 : 0.9,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#craftsmanship",
                    start: "top 85%",
                    once: true
                }
            }
        );

        // 4. Craftsmanship Section -> Acquire Section Transition
        gsap.fromTo("#acquire .container",
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 20 },
            {
                opacity: 1, scale: 1, y: 0,
                duration: prefersReducedMotion ? 0.3 : 0.9,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#acquire",
                    start: "top 85%",
                    once: true
                }
            }
        );

        // 5. Footer entrance
        gsap.fromTo(".footer",
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 30 },
            {
                opacity: 1, y: 0,
                duration: prefersReducedMotion ? 0.3 : 1.0,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: ".footer",
                    start: "top 90%",
                    once: true
                }
            }
        );
    }

    // --- 7. MOBILE MENU TOGGLE ---
    let focusTrapActive = false;
    let focusableElements = [];
    let firstFocusableEl = null;
    let lastFocusableEl = null;
    let previousActiveEl = null;

    function handleFocusTrap(e) {
        if (e.key === 'Tab' || e.keyCode === 9) {
            if (e.shiftKey) { /* Shift + Tab */
                if (document.activeElement === firstFocusableEl) {
                    lastFocusableEl.focus();
                    e.preventDefault();
                }
            } else { /* Tab */
                if (document.activeElement === lastFocusableEl) {
                    firstFocusableEl.focus();
                    e.preventDefault();
                }
            }
        }
        if (e.key === 'Escape' || e.keyCode === 27) {
            closeMobileMenu();
        }
    }

    function trapFocus(menuEl, toggleEl) {
        previousActiveEl = document.activeElement;
        
        // Find all focusable elements in menu + toggle button
        const menuLinks = Array.from(menuEl.querySelectorAll('a, button, [tabindex="0"]'));
        focusableElements = [toggleEl, ...menuLinks].filter(el => {
            return el.offsetWidth > 0 || el.offsetHeight > 0;
        });

        firstFocusableEl = focusableElements[0];
        lastFocusableEl = focusableElements[focusableElements.length - 1];

        if (focusableElements.length > 0) {
            document.addEventListener('keydown', handleFocusTrap);
            focusTrapActive = true;
            firstFocusableEl.focus();
        }
    }

    function untrapFocus() {
        if (focusTrapActive) {
            document.removeEventListener('keydown', handleFocusTrap);
            focusTrapActive = false;
            if (previousActiveEl) {
                previousActiveEl.focus();
            }
        }
    }

    function closeMobileMenu() {
        if (mobileToggle && mobileToggle.classList.contains('active')) {
            mobileToggle.classList.remove('active');
            mobileToggle.setAttribute('aria-expanded', 'false');
            navMenu.classList.remove('mobile-active');
            document.body.style.overflow = '';
            untrapFocus();
        }
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const isActive = mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('mobile-active');
            mobileToggle.setAttribute('aria-expanded', isActive);
            
            // Toggle hamburger icon animation states & trap focus
            if (isActive) {
                document.body.style.overflow = 'hidden'; // Lock background scroll
                trapFocus(navMenu, mobileToggle);
            } else {
                document.body.style.overflow = '';
                untrapFocus();
            }
        });
    }

    // Close mobile menu on links click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // --- 8. LUXURY MICRO-INTERACTIONS ---
    function initLuxuryInteractions() {
        if (prefersReducedMotion) return; // Skip custom cursor & hover scaling if reduced motion requested

        const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
        if (!hasFinePointer) return; // Skip on touch/mobile devices for natural system behaviors

        // 1. Inject Custom Cursor Elements
        const dot = document.createElement('div');
        dot.className = 'custom-cursor-dot';
        const ring = document.createElement('div');
        ring.className = 'custom-cursor-ring';
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        document.body.classList.add('custom-cursor-active');

        // Mouse tracking coordinates
        let mouseX = 0, mouseY = 0;
        let ringX = 0, ringY = 0;
        let isMoving = false;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            if (!isMoving) {
                isMoving = true;
                gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
            }
        });

        document.addEventListener('mouseleave', () => {
            isMoving = false;
            gsap.to([dot, ring], { opacity: 0, duration: 0.3 });
        });

        // High-performance RAF lerp loop for custom cursor ring
        // Idle throttle: pauses the RAF loop when cursor is stationary to save CPU/GPU
        let rafId = null;
        let cursorIdleTimeout = null;

        function updateCursorRing() {
            ringX += (mouseX - ringX) * 0.16;
            ringY += (mouseY - ringY) * 0.16;

            // Use translate3d for GPU acceleration
            dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
            ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

            rafId = requestAnimationFrame(updateCursorRing);
        }

        function startCursorLoop() {
            if (!rafId) {
                rafId = requestAnimationFrame(updateCursorRing);
            }
        }

        function scheduleCursorIdle() {
            clearTimeout(cursorIdleTimeout);
            cursorIdleTimeout = setTimeout(() => {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            }, 150); // Pause RAF after 150ms of no mouse movement
        }

        document.addEventListener('mousemove', startCursorLoop);
        document.addEventListener('mousemove', scheduleCursorIdle);
        startCursorLoop(); // Kick off on init

        // 2. Custom Cursor Hover Expansion
        // Select all interactive targets
        const hoverTargets = document.querySelectorAll('a, button, .mobile-menu-toggle, .form-input, .social-link, .footer-link');
        hoverTargets.forEach(target => {
            target.addEventListener('mouseenter', () => {
                ring.classList.add('cursor-hover');
                dot.classList.add('cursor-hover');
            });
            target.addEventListener('mouseleave', () => {
                ring.classList.remove('cursor-hover');
                dot.classList.remove('cursor-hover');
            });
        });

        // 3. Magnetic Buttons and Menu Triggers
        const magneticElements = document.querySelectorAll('.btn, .logo, .mobile-menu-toggle');
        magneticElements.forEach(elem => {
            let rect = null;
            
            elem.addEventListener('mouseenter', () => {
                rect = elem.getBoundingClientRect();
            });

            elem.addEventListener('mousemove', (e) => {
                if (!rect) rect = elem.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                // Attract the button towards the cursor
                gsap.to(elem, {
                    x: x * 0.35,
                    y: y * 0.35,
                    duration: 0.3,
                    ease: "power2.out"
                });

                // Parallax offset for internal text/icon for added depth
                const inner = elem.querySelector('span, p, .arrow');
                if (inner) {
                    gsap.to(inner, {
                        x: x * 0.15,
                        y: y * 0.15,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            });

            elem.addEventListener('mouseleave', () => {
                // Elastic return to original position
                gsap.to(elem, {
                    x: 0,
                    y: 0,
                    duration: 0.7,
                    ease: "elastic.out(1, 0.3)"
                });

                const inner = elem.querySelector('span, p, .arrow');
                if (inner) {
                    gsap.to(inner, {
                        x: 0,
                        y: 0,
                        duration: 0.7,
                        ease: "elastic.out(1, 0.3)"
                    });
                }
            });
        });

        // 4. Card 3D Tilt and Spotlight Glow
        const cards = document.querySelectorAll('.specs-visual, .acquire-card');
        cards.forEach(card => {
            // Inject dynamic card-glow child element
            const glow = document.createElement('div');
            glow.className = 'card-glow';
            card.appendChild(glow);

            // Set preserve-3d contexts
            gsap.set(card.parentElement, { perspective: 1000 });
            gsap.set(card, { transformStyle: "preserve-3d" });

            let rect = null;

            card.addEventListener('mouseenter', () => {
                rect = card.getBoundingClientRect();
            });

            card.addEventListener('mousemove', (e) => {
                if (!rect) rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Update CSS variables for radial gradient spotlight movement
                const xPercent = (x / rect.width) * 100;
                const yPercent = (y / rect.height) * 100;
                card.style.setProperty('--mouse-x', `${xPercent}%`);
                card.style.setProperty('--mouse-y', `${yPercent}%`);

                // 3D rotation values (subtle, maximum 8 degrees tilt)
                const rotateX = -((y / rect.height) - 0.5) * 8;
                const rotateY = ((x / rect.width) - 0.5) * 8;

                gsap.to(card, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    x: (x / rect.width - 0.5) * 6,
                    y: (y / rect.height - 0.5) * 6,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    x: 0,
                    y: 0,
                    duration: 0.8,
                    ease: "power2.out"
                });
            });
        });
    }

    // --- 9. LUXURY NAVIGATION EXPERIENCE ---
    function initLuxuryNavigation() {
        const navbar = document.querySelector('.navbar');
        
        // 1. Inject Scroll Progress Bar
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        document.body.appendChild(progressBar);

        // 2. Animate Scroll Progress Bar using GSAP ScrollTrigger
        // Uses scaleX (GPU-compositable) instead of width (triggers layout)
        gsap.registerPlugin(ScrollTrigger);
        
        gsap.to(progressBar, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
                trigger: "body",
                start: "top top",
                end: "bottom bottom",
                scrub: 0.3
            }
        });

        // 3. Navbar Shrink & Scrolled Detection
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        }, { passive: true });

        // Ensure active class on load if already scrolled
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        }

        // 4. ScrollTrigger Active Section Mapping
        const sections = ["#hero-scroll", "#features", "#specifications", "#craftsmanship"];
        const navLinks = document.querySelectorAll('.nav-link');

        sections.forEach(selector => {
            const section = document.querySelector(selector);
            if (!section) return;

            const link = document.querySelector(`.nav-link[href="${selector}"]`);
            if (!link) return;

            ScrollTrigger.create({
                trigger: section,
                start: "top 40%",
                end: "bottom 40%",
                onEnter: () => setActive(link),
                onEnterBack: () => setActive(link)
            });
        });

        function setActive(activeLink) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });
            activeLink.classList.add('active');
            activeLink.setAttribute('aria-current', 'page');
        }
    }

    // --- 10. SCROLLTRIGGER-AWARE SMOOTH ANCHOR SCROLLING ---
    function initScrollTriggerAwareScrolling() {
        const anchors = document.querySelectorAll('a[href^="#"]');
        
        anchors.forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#' || !href) return;
                
                const target = document.querySelector(href);
                if (!target) return;
                
                e.preventDefault();
                
                // Temporary trigger to calculate exact scrolled offset (with pin spacers included)
                const tempTrigger = ScrollTrigger.create({
                    trigger: target,
                    start: "top top"
                });
                
                const targetScrollPosition = tempTrigger.start;
                tempTrigger.kill(); // clean up immediately
                
                // Execute precise scroll alignment
                window.scrollTo({
                    top: targetScrollPosition,
                    behavior: 'smooth'
                });

                // Shift focus to the target section for screen readers & keyboard navigation
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            });
        });
    }

    initLuxuryInteractions();
    initLuxuryNavigation();
    initScrollTriggerAwareScrolling();

    // Start loading sequence
    preloadFrames();
});
