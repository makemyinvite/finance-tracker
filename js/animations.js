/**
 * FinanceFlow - Animations
 * GSAP animations and effects (defensive implementation)
 */

const Animations = {
    isGsapAvailable: false,

    /**
     * Initialize animations
     */
    init() {
        // Check if GSAP is available
        this.isGsapAvailable = typeof gsap !== 'undefined';

        if (!this.isGsapAvailable) {
            console.warn('GSAP not loaded - animations disabled');
            // Make sure page is still visible
            this.ensureContentVisible();
            return;
        }

        try {
            this.setupPageTransitions();
            this.animateOnScroll();
            this.animateCards();
            this.animateCharts();
            this.animateLists();
            this.setupHoverEffects();
        } catch (error) {
            console.error('Animation initialization error:', error);
            this.ensureContentVisible();
        }
    },

    /**
     * Ensure all content is visible even if animations fail
     */
    ensureContentVisible() {
        // Make sure all animated elements are visible
        document.querySelectorAll('[data-animate], .reveal, .stagger-item').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.visibility = 'visible';
        });

        // Ensure main sections are visible (except sidebar on mobile - let CSS handle it)
        document.querySelectorAll('.top-header, .main-content, .dashboard-content').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.visibility = 'visible';
        });

        // Handle sidebar separately - don't override transform on mobile
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.opacity = '1';
            sidebar.style.visibility = 'visible';
            if (window.innerWidth > 768) {
                sidebar.style.transform = 'none';
            }
        }
    },

    /**
     * Setup page load transitions
     */
    setupPageTransitions() {
        if (!this.isGsapAvailable) return;

        try {
            // Add loaded class to body
            document.body.classList.add('page-loaded');

            // Animate sidebar (only on desktop)
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && window.innerWidth > 768) {
                gsap.from(sidebar, {
                    x: -100,
                    opacity: 0,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        sidebar.style.opacity = '1';
                        // Don't set transform to none - let CSS handle it
                    }
                });
            }

            // Animate header
            const header = document.querySelector('.top-header');
            if (header) {
                gsap.from(header, {
                    y: -50,
                    opacity: 0,
                    duration: 0.5,
                    delay: 0.2,
                    ease: 'power2.out',
                    onComplete: () => {
                        header.style.opacity = '1';
                        header.style.transform = 'none';
                    }
                });
            }

            // Animate main content
            const mainContent = document.querySelectorAll('.main-content > *:not(.top-header)');
            if (mainContent.length > 0) {
                gsap.from(mainContent, {
                    y: 30,
                    opacity: 0,
                    duration: 0.5,
                    delay: 0.3,
                    stagger: 0.1,
                    ease: 'power2.out',
                    onComplete: () => {
                        mainContent.forEach(el => {
                            el.style.opacity = '1';
                            el.style.transform = 'none';
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Page transition error:', error);
            this.ensureContentVisible();
        }
    },

    /**
     * Animate elements on scroll
     */
    animateOnScroll() {
        if (!this.isGsapAvailable) return;

        try {
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'none';
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Only observe elements that specifically want scroll animation
            document.querySelectorAll('.reveal').forEach(el => {
                observer.observe(el);
            });
        } catch (error) {
            console.error('Scroll animation error:', error);
            this.ensureContentVisible();
        }
    },

    /**
     * Animate summary cards
     */
    animateCards() {
        if (!this.isGsapAvailable) return;

        try {
            const cards = document.querySelectorAll('[data-animate="card"]');
            if (cards.length > 0) {
                // First ensure they're visible
                cards.forEach(card => {
                    card.style.visibility = 'visible';
                });

                gsap.from(cards, {
                    y: 30,
                    opacity: 0,
                    duration: 0.6,
                    stagger: 0.1,
                    delay: 0.4,
                    ease: 'power3.out',
                    onComplete: () => {
                        cards.forEach(card => {
                            card.style.opacity = '1';
                            card.style.transform = 'none';
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Card animation error:', error);
            document.querySelectorAll('[data-animate="card"]').forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'none';
            });
        }
    },

    /**
     * Animate charts
     */
    animateCharts() {
        if (!this.isGsapAvailable) return;

        try {
            const charts = document.querySelectorAll('[data-animate="chart"]');
            if (charts.length > 0) {
                charts.forEach(chart => {
                    chart.style.visibility = 'visible';
                });

                gsap.from(charts, {
                    scale: 0.95,
                    opacity: 0,
                    duration: 0.6,
                    stagger: 0.15,
                    delay: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        charts.forEach(chart => {
                            chart.style.opacity = '1';
                            chart.style.transform = 'none';
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Chart animation error:', error);
            document.querySelectorAll('[data-animate="chart"]').forEach(chart => {
                chart.style.opacity = '1';
                chart.style.transform = 'none';
            });
        }
    },

    /**
     * Animate lists
     */
    animateLists() {
        if (!this.isGsapAvailable) return;

        try {
            const lists = document.querySelectorAll('[data-animate="list"]');
            if (lists.length > 0) {
                lists.forEach(list => {
                    list.style.visibility = 'visible';
                });

                gsap.from(lists, {
                    x: -20,
                    opacity: 0,
                    duration: 0.5,
                    stagger: 0.1,
                    delay: 0.6,
                    ease: 'power2.out',
                    onComplete: () => {
                        lists.forEach(list => {
                            list.style.opacity = '1';
                            list.style.transform = 'none';
                        });
                    }
                });
            }

            // Animate list items with stagger
            document.querySelectorAll('.stagger-item').forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('animated');
                    item.style.opacity = '1';
                }, index * 50);
            });
        } catch (error) {
            console.error('List animation error:', error);
            document.querySelectorAll('[data-animate="list"], .stagger-item').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        }
    },

    /**
     * Setup hover effects
     */
    setupHoverEffects() {
        if (!this.isGsapAvailable) return;

        try {
            // Card hover animations
            document.querySelectorAll('.summary-card, .stat-card, .chart-card, .bank-card, .credit-card').forEach(card => {
                card.addEventListener('mouseenter', () => {
                    gsap.to(card, {
                        y: -4,
                        scale: 1.02,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });

                card.addEventListener('mouseleave', () => {
                    gsap.to(card, {
                        y: 0,
                        scale: 1,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            });

            // Button hover animations
            document.querySelectorAll('.btn').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    gsap.to(btn, {
                        scale: 1.05,
                        duration: 0.2,
                        ease: 'power2.out'
                    });
                });

                btn.addEventListener('mouseleave', () => {
                    gsap.to(btn, {
                        scale: 1,
                        duration: 0.2,
                        ease: 'power2.out'
                    });
                });
            });

            // Navigation link hover
            document.querySelectorAll('.nav-link').forEach(link => {
                const icon = link.querySelector('i');
                if (!icon) return;

                link.addEventListener('mouseenter', () => {
                    gsap.to(icon, {
                        scale: 1.2,
                        duration: 0.2,
                        ease: 'power2.out'
                    });
                });

                link.addEventListener('mouseleave', () => {
                    gsap.to(icon, {
                        scale: 1,
                        duration: 0.2,
                        ease: 'power2.out'
                    });
                });
            });
        } catch (error) {
            console.error('Hover effect error:', error);
        }
    },

    /**
     * Animate modal open
     */
    animateModalOpen(modal) {
        if (!this.isGsapAvailable || !modal) return;

        try {
            const content = modal.querySelector('.modal-content');
            const overlay = modal.querySelector('.modal-overlay');

            if (overlay) {
                gsap.fromTo(overlay,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.3 }
                );
            }

            if (content) {
                gsap.fromTo(content,
                    { opacity: 0, y: -30, scale: 0.95 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }
                );
            }
        } catch (error) {
            console.error('Modal open animation error:', error);
        }
    },

    /**
     * Animate modal close
     */
    animateModalClose(modal, callback) {
        if (!this.isGsapAvailable || !modal) {
            if (callback) callback();
            return;
        }

        try {
            const content = modal.querySelector('.modal-content');
            const overlay = modal.querySelector('.modal-overlay');

            if (content) {
                gsap.to(content, {
                    opacity: 0,
                    y: -20,
                    scale: 0.95,
                    duration: 0.2,
                    ease: 'power2.in'
                });
            }

            if (overlay) {
                gsap.to(overlay, {
                    opacity: 0,
                    duration: 0.2,
                    onComplete: callback
                });
            } else if (callback) {
                setTimeout(callback, 200);
            }
        } catch (error) {
            console.error('Modal close animation error:', error);
            if (callback) callback();
        }
    },

    /**
     * Animate toast notification
     */
    animateToast(toast) {
        if (!this.isGsapAvailable || !toast) return;

        try {
            gsap.fromTo(toast,
                { x: 100, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
            );
        } catch (error) {
            console.error('Toast animation error:', error);
            toast.style.opacity = '1';
        }
    },

    /**
     * Animate toast removal
     */
    animateToastRemove(toast, callback) {
        if (!this.isGsapAvailable || !toast) {
            if (callback) callback();
            return;
        }

        try {
            gsap.to(toast, {
                x: 100,
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: callback
            });
        } catch (error) {
            console.error('Toast remove animation error:', error);
            if (callback) callback();
        }
    },

    /**
     * Ripple effect
     */
    createRipple(event) {
        try {
            const button = event.currentTarget;
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();

            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                pointer-events: none;
            `;

            button.appendChild(ripple);

            if (this.isGsapAvailable) {
                gsap.to(ripple, {
                    scale: 4,
                    opacity: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    onComplete: () => ripple.remove()
                });
            } else {
                setTimeout(() => ripple.remove(), 600);
            }
        } catch (error) {
            console.error('Ripple effect error:', error);
        }
    },

    /**
     * Shake animation for errors
     */
    shake(element) {
        if (!element) return;

        try {
            if (this.isGsapAvailable) {
                gsap.to(element, {
                    x: [-5, 5, -5, 5, 0],
                    duration: 0.4,
                    ease: 'power2.inOut'
                });
            } else {
                element.classList.add('shake');
                setTimeout(() => element.classList.remove('shake'), 600);
            }
        } catch (error) {
            console.error('Shake animation error:', error);
        }
    },

    /**
     * Success checkmark animation
     */
    successAnimation(container) {
        if (!this.isGsapAvailable || !container) return;

        try {
            const checkmark = document.createElement('div');
            checkmark.innerHTML = `
                <svg class="checkmark" viewBox="0 0 52 52" style="width: 52px; height: 52px;">
                    <circle cx="26" cy="26" r="25" fill="none" stroke="#22c55e" stroke-width="2"/>
                    <path fill="none" stroke="#22c55e" stroke-width="3" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
            `;
            checkmark.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);';
            container.appendChild(checkmark);

            const svg = checkmark.querySelector('svg');
            const circle = svg.querySelector('circle');
            const path = svg.querySelector('path');

            gsap.set([circle, path], { strokeDasharray: 166, strokeDashoffset: 166 });

            gsap.timeline()
                .to(circle, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' })
                .to(path, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.inOut' });
        } catch (error) {
            console.error('Success animation error:', error);
        }
    },

    /**
     * Loading spinner animation
     */
    showLoader(container) {
        if (!container) return null;

        try {
            const loader = document.createElement('div');
            loader.className = 'loader-overlay';
            loader.innerHTML = '<div class="spinner"></div>';
            loader.style.cssText = `
                position: absolute;
                inset: 0;
                background: rgba(255, 255, 255, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
            `;
            container.style.position = 'relative';
            container.appendChild(loader);

            if (this.isGsapAvailable) {
                gsap.fromTo(loader, { opacity: 0 }, { opacity: 1, duration: 0.2 });
            }

            return loader;
        } catch (error) {
            console.error('Show loader error:', error);
            return null;
        }
    },

    /**
     * Hide loader
     */
    hideLoader(loader) {
        if (!loader) return;

        try {
            if (this.isGsapAvailable) {
                gsap.to(loader, {
                    opacity: 0,
                    duration: 0.2,
                    onComplete: () => loader.remove()
                });
            } else {
                loader.remove();
            }
        } catch (error) {
            console.error('Hide loader error:', error);
            loader.remove();
        }
    }
};

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if animations are enabled
    try {
        const settings = typeof Storage !== 'undefined' && Storage.getSettings ? Storage.getSettings() : {};
        if (settings.animations !== false) {
            // Small delay to ensure all content is loaded
            setTimeout(() => {
                Animations.init();
            }, 100);
        }
    } catch (error) {
        console.error('Animation settings error:', error);
        // Ensure content is visible even if there's an error
        Animations.ensureContentVisible();
    }
});

window.Animations = Animations;
