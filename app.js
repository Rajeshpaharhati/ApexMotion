/**
 * ApexMotion Manufacturing - Frontend Application Logic
 * Implements interactive menu, dark mode toggle, quote estimator, 
 * drag & drop CAD validation, and RFQ form handler.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Select elements
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const menuToggleBtn = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    /* ==========================================================================
       1. Mobile Navigation Menu
       ========================================================================== */
    const toggleMenu = () => {
        const isExpanded = menuToggleBtn.getAttribute('aria-expanded') === 'true';
        menuToggleBtn.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('active');
    };

    const closeMenu = () => {
        menuToggleBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('active');
    };

    menuToggleBtn.addEventListener('click', toggleMenu);
    navLinks.forEach(link => link.addEventListener('click', closeMenu));

    // Close menu when clicking outside of nav
    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !menuToggleBtn.contains(e.target) && navMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    /* ==========================================================================
       2. Light / Dark Mode Toggle
       ========================================================================== */
    // Initialize theme based on LocalStorage or system preferences
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    }

    themeToggleBtn.addEventListener('click', () => {
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            simulateAnalyticsEvent('ThemeToggle', 'DarkMode');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
            simulateAnalyticsEvent('ThemeToggle', 'LightMode');
        }
    });

    /* ==========================================================================
       3. Interactive CAD & Precision Quote Estimator
       ========================================================================== */
    // Inputs
    const compTypeSelect = document.getElementById('component-type');
    const matTypeSelect = document.getElementById('material-type');
    const toleranceBtns = document.querySelectorAll('.toggle-group .toggle-btn');
    const qtySlider = document.getElementById('quantity-range');
    const qtyValBadge = document.getElementById('quantity-val');
    const fileInput = document.getElementById('cad-file');
    const dropzone = document.getElementById('dropzone');
    const fileNameDisplay = document.getElementById('file-name-display');

    // Outputs
    const summaryComp = document.getElementById('summary-component');
    const summaryMat = document.getElementById('summary-material');
    const summaryTolerance = document.getElementById('summary-tolerance');
    const summaryQty = document.getElementById('summary-qty');
    const summaryUnit = document.getElementById('summary-unit-price');
    const summaryDiscount = document.getElementById('summary-discount');
    const summaryTotal = document.getElementById('summary-total-price');
    const summaryLeadTime = document.getElementById('summary-lead-time');

    // Configuration values for cost algorithm
    const pricingConfig = {
        baseCosts: {
            'xy-rails': 150.00,
            'gears-cams': 45.00,
            'custom-parts': 30.00
        },
        materials: {
            'aluminum': { label: 'Aluminum 6061-T6', multiplier: 1.0 },
            'steel': { label: 'Stainless Steel 316', multiplier: 1.5 },
            'titanium': { label: 'Titanium Grade 5', multiplier: 3.0 },
            'brass': { label: 'Alloy 360 Brass', multiplier: 1.2 },
            'delrin': { label: 'Delrin/Acetal Plastic', multiplier: 0.8 }
        },
        tolerances: {
            'standard': { label: 'Standard (±0.1mm)', multiplier: 1.0, extraLeadDays: 0 },
            'high': { label: 'High Precision (±0.01mm)', multiplier: 1.4, extraLeadDays: 2 },
            'ultra': { label: 'Ultra Precision (±0.005mm)', multiplier: 2.2, extraLeadDays: 5 }
        }
    };

    let selectedTolerance = 'high'; // default active state in HTML
    let uploadedFileName = '';

    // Handle tolerance level buttons
    toleranceBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toleranceBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
            const selectedBtn = e.currentTarget;
            selectedBtn.classList.add('active');
            selectedBtn.setAttribute('aria-checked', 'true');
            selectedTolerance = selectedBtn.dataset.value;
            calculateQuote();
        });
    });

    // Update quantity slider indicator
    qtySlider.addEventListener('input', (e) => {
        qtyValBadge.textContent = e.target.value;
        calculateQuote();
    });

    // Main calculation routine
    const calculateQuote = () => {
        const componentType = compTypeSelect.value;
        const materialType = matTypeSelect.value;
        const quantity = parseInt(qtySlider.value, 10);

        // Core formula logic
        const baseCost = pricingConfig.baseCosts[componentType];
        const materialMult = pricingConfig.materials[materialType].multiplier;
        const toleranceMult = pricingConfig.tolerances[selectedTolerance].multiplier;

        // Raw unit cost before batch discounts
        let rawUnitCost = baseCost * materialMult * toleranceMult;

        // Volume Discount structure
        let discountPercent = 0;
        if (quantity >= 10 && quantity < 50) {
            discountPercent = 0.05; // 5%
        } else if (quantity >= 50 && quantity < 200) {
            discountPercent = 0.15; // 15%
        } else if (quantity >= 200) {
            discountPercent = 0.25; // 25%
        }

        const discountedUnitCost = rawUnitCost * (1 - discountPercent);
        const totalEstimatedCost = discountedUnitCost * quantity;

        // Lead time calculation
        let baseLeadDays = 5;
        if (quantity > 100) baseLeadDays = 7;
        if (quantity > 500) baseLeadDays = 12;
        const totalLeadDaysMin = baseLeadDays + pricingConfig.tolerances[selectedTolerance].extraLeadDays;
        const totalLeadDaysMax = totalLeadDaysMin + 3;

        // Display results
        summaryComp.textContent = compTypeSelect.options[compTypeSelect.selectedIndex].text.split(' (')[0];
        summaryMat.textContent = pricingConfig.materials[materialType].label;
        summaryTolerance.textContent = pricingConfig.tolerances[selectedTolerance].label;
        summaryQty.textContent = `${quantity} unit${quantity > 1 ? 's' : ''}`;
        
        summaryUnit.textContent = `$${discountedUnitCost.toFixed(2)}`;
        summaryDiscount.textContent = discountPercent > 0 ? `-${(discountPercent * 100)}%` : '0%';
        summaryDiscount.parentElement.style.display = discountPercent > 0 ? 'flex' : 'none';
        
        summaryTotal.textContent = `$${totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        summaryLeadTime.textContent = `${totalLeadDaysMin}-${totalLeadDaysMax} Business Days`;
    };

    // Listeners for calculator drop-downs
    compTypeSelect.addEventListener('change', calculateQuote);
    matTypeSelect.addEventListener('change', calculateQuote);

    // Initial load calculation
    calculateQuote();

    /* ==========================================================================
       4. Drag & Drop File Upload
       ========================================================================== */
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    // Handle files dropped
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    const handleFiles = (files) => {
        if (files.length > 0) {
            const file = files[0];
            const extension = file.name.split('.').pop().toLowerCase();
            const allowed = ['step', 'stp', 'iges', 'igs', 'zip'];
            
            if (allowed.includes(extension)) {
                uploadedFileName = file.name;
                fileNameDisplay.textContent = `Attached: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
                fileNameDisplay.style.color = 'var(--success)';
                simulateAnalyticsEvent('CADUpload', 'Success', extension);
            } else {
                uploadedFileName = '';
                fileNameDisplay.textContent = `Invalid file extension .${extension}. Please use .STEP, .STP, .IGS, or .ZIP`;
                fileNameDisplay.style.color = 'var(--error)';
            }
        }
    };

    /* ==========================================================================
       5. Product Selector Integration
       ========================================================================== */
    const productQuoteBtns = document.querySelectorAll('.select-product-btn');
    productQuoteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            preventDefaults(e);
            const targetProduct = btn.dataset.product;
            compTypeSelect.value = targetProduct;
            
            // Re-run estimator updates
            calculateQuote();
            
            // Scroll smoothly to estimator
            document.getElementById('estimator').scrollIntoView({ behavior: 'smooth' });
            
            // Trigger visual glow indicator on estimator
            const estControls = document.querySelector('.estimator-controls');
            estControls.style.boxShadow = '0 0 20px rgba(217, 119, 6, 0.4)';
            setTimeout(() => {
                estControls.style.boxShadow = '';
            }, 1200);

            simulateAnalyticsEvent('ProductSelected', 'ShowcaseSelect', targetProduct);
        });
    });

    /* ==========================================================================
       6. RFQ Spec Importer & Form Validation
       ========================================================================== */
    const applyQuoteBtn = document.getElementById('apply-quote-btn');
    const contactSpecsField = document.getElementById('contact-specs');
    const rfqForm = document.getElementById('rfq-form');
    const successModal = document.getElementById('success-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalOkBtn = document.getElementById('modal-ok-btn');
    const formToast = document.getElementById('form-toast');

    // Transfer specs from Estimator to RFQ contact details
    applyQuoteBtn.addEventListener('click', () => {
        const specSummary = `Category: ${summaryComp.textContent} | Material: ${summaryMat.textContent} | Tolerance: ${summaryTolerance.textContent} | Quantity: ${summaryQty.textContent} | Est. Price: ${summaryTotal.textContent} | Attached CAD: ${uploadedFileName || 'None'}`;
        contactSpecsField.value = specSummary;

        // Glow feedback
        contactSpecsField.style.borderColor = 'var(--primary)';
        contactSpecsField.style.boxShadow = '0 0 10px rgba(217, 119, 6, 0.3)';
        setTimeout(() => {
            contactSpecsField.style.borderColor = '';
            contactSpecsField.style.boxShadow = '';
        }, 1500);

        // Scroll to form
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        simulateAnalyticsEvent('ApplySpecsClick', 'EstimatorExport');
    });

    // Client-side validator helpers
    const showError = (inputEl, errorEl) => {
        inputEl.classList.add('invalid');
        errorEl.style.display = 'block';
    };

    const clearError = (inputEl, errorEl) => {
        inputEl.classList.remove('invalid');
        errorEl.style.display = 'none';
    };

    // Validations
    rfqForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;
        formToast.style.display = 'none';

        // Select validation fields
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const companyInput = document.getElementById('contact-company');
        const messageInput = document.getElementById('contact-message');

        const nameError = document.getElementById('name-error');
        const emailError = document.getElementById('email-error');
        const companyError = document.getElementById('company-error');
        const messageError = document.getElementById('message-error');

        // Check name
        if (!nameInput.value.trim()) {
            showError(nameInput, nameError);
            isValid = false;
        } else {
            clearError(nameInput, nameError);
        }

        // Check corporate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim() || !emailRegex.test(emailInput.value)) {
            showError(emailInput, emailError);
            isValid = false;
        } else {
            clearError(emailInput, emailError);
        }

        // Check company name
        if (!companyInput.value.trim()) {
            showError(companyInput, companyError);
            isValid = false;
        } else {
            clearError(companyInput, companyError);
        }

        // Check message
        if (!messageInput.value.trim()) {
            showError(messageInput, messageError);
            isValid = false;
        } else {
            clearError(messageInput, messageError);
        }

        if (!isValid) {
            formToast.textContent = 'Please correct the highlighted validation errors above.';
            formToast.className = 'form-toast error';
            formToast.style.display = 'block';
            simulateAnalyticsEvent('RFQFormSubmit', 'ValidationError');
            return;
        }

        // Simulate Submission API hit
        const submitBtn = rfqForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing Technical RFQ...';

        setTimeout(() => {
            // Success reset
            rfqForm.reset();
            fileNameDisplay.textContent = '';
            uploadedFileName = '';
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            // Show custom modal
            successModal.classList.add('open');
            simulateAnalyticsEvent('RFQFormSubmit', 'Success');
        }, 1500);
    });

    // Close Modal actions
    const closeModal = () => {
        successModal.classList.remove('open');
    };

    modalCloseBtn.addEventListener('click', closeModal);
    modalOkBtn.addEventListener('click', closeModal);
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) closeModal();
    });

    /* ==========================================================================
       7. SEO Tracking Simulators
       ========================================================================== */
    // Helper to simulate Google Tag Manager / Analytics events triggers
    function simulateAnalyticsEvent(eventName, action, label = '') {
        console.log(`[Google Analytics Simulation] Event: ${eventName} | Action: ${action} | Label: ${label}`);
        // In production, this would bridge to window.dataLayer.push({ event: ... })
    }
});
