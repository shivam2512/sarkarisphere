/**
 * JobSphere Revenue Generation Module
 * Handles AdSense injection, Affiliate Links, and Premium Job Listings
 */

const RevenueManager = {
  
  init() {
    console.log('💰 Revenue Manager Initialized');
    this.injectAdSenseScript();
    this.renderAffiliateLinks();
    this.setupPremiumListing();
  },

  /**
   * 1. Google AdSense Integration
   */
  injectAdSenseScript() {
    if (!ADSENSE_CONFIG.enabled) return;

    // Inject the main AdSense script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.publisherId}`;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  },

  // Called when rendering job list to insert ads between jobs
  insertInFeedAds(container, everyNItems = 5) {
    if (!ADSENSE_CONFIG.enabled) return;
    
    const items = container.querySelectorAll('.job-card');
    items.forEach((item, index) => {
      if ((index + 1) % everyNItems === 0 && index !== items.length - 1) {
        const adWrapper = document.createElement('div');
        adWrapper.className = 'ad-slot ad-slot-banner fade-in';
        adWrapper.innerHTML = `
          <span class="ad-label">Advertisement</span>
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-format="fluid"
               data-ad-layout-key="-fb+5w+4e-db+86"
               data-ad-client="${ADSENSE_CONFIG.publisherId}"
               data-ad-slot="${ADSENSE_CONFIG.slots.inFeedAd}"></ins>
        `;
        item.parentNode.insertBefore(adWrapper, item.nextSibling);
        
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          console.error('AdSense push error', e);
        }
      }
    });
  },

  /**
   * 2. Affiliate Links (Sidebar)
   */
  renderAffiliateLinks() {
    const affiliateContainer = document.getElementById('affiliate-links');
    if (!affiliateContainer) return;

    // Hardcoded high-converting affiliate links
    const affiliateOffers = [
      {
        title: 'Master Data Science',
        sub: 'IBM Professional Certificate',
        icon: '📊',
        url: `${AFFILIATE_CONFIG.coursera.baseUrl}${AFFILIATE_CONFIG.coursera.courses.data}${AFFILIATE_CONFIG.coursera.affiliateParam}`
      },
      {
        title: 'Web Dev Bootcamp',
        sub: 'Learn Full-Stack on Udemy',
        icon: '💻',
        url: `${AFFILIATE_CONFIG.udemy.baseUrl}/course/the-web-developer-bootcamp/${AFFILIATE_CONFIG.udemy.affiliateParam}`
      },
      {
        title: 'Build a Pro Resume',
        sub: 'Get hired 2x faster',
        icon: '📝',
        url: 'https://resumebuilder.com/?utm_source=jobsphere_affiliate' // Example
      }
    ];

    affiliateOffers.forEach(offer => {
      const el = document.createElement('a');
      el.href = offer.url;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      el.className = 'affiliate-item';
      el.innerHTML = `
        <div class="affiliate-item-icon">${offer.icon}</div>
        <div class="affiliate-item-info">
          <div class="affiliate-item-title">${offer.title}</div>
          <div class="affiliate-item-sub">${offer.sub}</div>
        </div>
        <div class="affiliate-item-arrow">→</div>
      `;
      affiliateContainer.appendChild(el);
    });
  },

  /**
   * 3. Premium Listing / Post a Job Integration
   */
  setupPremiumListing() {
    const postJobForm = document.getElementById('post-job-form');
    const pricingCards = document.querySelectorAll('.pricing-card');
    
    if (!postJobForm) return;

    let selectedTier = 'premium'; // default

    pricingCards.forEach(card => {
      card.addEventListener('click', () => {
        pricingCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTier = card.dataset.tier;
      });
    });

    postJobForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const companyName = document.getElementById('pj-company').value;
      const jobTitle = document.getElementById('pj-title').value;
      
      if (!companyName || !jobTitle) {
        window.showToast('Please fill all required fields.', 'error');
        return;
      }

      // Simulate API call and Payment Gateway (e.g. Razorpay) redirect
      const btn = postJobForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span> Processing...';
      btn.disabled = true;

      setTimeout(() => {
        console.log(`Initiating payment for ${selectedTier} tier for ${companyName}`);
        
        // In a real app, you would make an API call to your backend to generate a Razorpay order ID here.
        // Since we are serverless for now, we show a success message and explain the next steps.
        
        window.showToast(`Redirecting to payment gateway for ${selectedTier.toUpperCase()} listing...`, 'success');
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
          postJobForm.reset();
          
          alert('Demo Mode: Payment gateway integration requires a backend. To generate real revenue, connect this form to Razorpay Payment Links or Stripe Checkout via a serverless function (e.g. Netlify Functions).');
        }, 1500);

      }, 1000);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  RevenueManager.init();
});
