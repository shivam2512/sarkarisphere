/**
 * API Configuration for JobSphere Portal
 * ----------------------------------------
 * Free APIs (no key needed):
 *   - Remotive      → Remote/Tech jobs
 *   - Arbeitnow     → EU + Remote jobs
 *   - DevITjobs     → IT/Dev jobs
 *
 * Free APIs (key needed — sign up once, free tier):
 *   - Adzuna        → All categories (250 req/day free)
 *   - JSearch       → Google Jobs aggregator via RapidAPI (500 req/month free)
 *
 * To activate Adzuna:
 *   1. Sign up at https://developer.adzuna.com/
 *   2. Replace ADZUNA_APP_ID and ADZUNA_APP_KEY below
 *
 * To activate JSearch:
 *   1. Sign up at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 *   2. Replace JSEARCH_API_KEY below
 */

const API_CONFIG = {
  // ─── Adzuna (India + Global, all categories) ───────────────────────────────
  adzuna: {
    enabled: false,
    appId: 'YOUR_ADZUNA_APP_ID',
    appKey: 'YOUR_ADZUNA_APP_KEY',
    baseUrl: 'https://api.adzuna.com/v1/api/jobs',
    country: 'in',
    resultsPerPage: 20
  },

  // ─── Remotive (Remote/Tech — completely free, no key) ─────────────────────
  remotive: {
    enabled: false,
    baseUrl: 'https://remotive.com/api/remote-jobs',
    limit: 30
  },

  // ─── Arbeitnow (EU + Remote — completely free, no key) ────────────────────
  arbeitnow: {
    enabled: false,
    baseUrl: 'https://www.arbeitnow.com/api/job-board-api',
  },

  // ─── JSearch via RapidAPI (Google Jobs data) ──────────────────────────────
  jsearch: {
    enabled: false,
    apiKey: 'YOUR_JSEARCH_RAPIDAPI_KEY',
    baseUrl: 'https://jsearch.p.rapidapi.com/search',
    host: 'jsearch.p.rapidapi.com',
  },

  // ─── Government Jobs (Scraped/RSS sources) ────────────────────────────────
  // Using CORS proxy to fetch RSS feeds for Indian govt job boards
  govtRss: {
    enabled: true,
    corsProxy: 'https://corsproxy.io/?',
    feeds: [
      { name: 'Sarkari Naukri', url: 'https://www.jagranjosh.com/rss/josh/sarkari-naukri', category: 'all' },
      { name: 'UPSC Vacancies', url: 'https://www.upsc.gov.in/rss_feeds/rss_vacancies.xml', category: 'upsc' }
    ]
  },

  // ─── Cache settings ────────────────────────────────────────────────────────
  cache: {
    ttlMinutes: 30,        // Refresh data every 30 minutes
    storageKey: 'sarkarisphere_cache_v7',
  }
};

// Job categories displayed on the portal
const JOB_CATEGORIES = [
  {
    id: 'all',
    label: 'All Govt Jobs',
    icon: '🇮🇳',
    color: '#6366f1',
    description: 'Browse all government positions'
  },
  {
    id: 'upsc',
    label: 'UPSC / Civil Services',
    icon: '🏛️',
    color: '#f59e0b',
    description: 'IAS, IPS, IFS, NDA, CDS'
  },
  {
    id: 'ssc',
    label: 'SSC & State PSC',
    icon: '📜',
    color: '#06b6d4',
    description: 'CGL, CHSL, State Public Service Commissions'
  },
  {
    id: 'banking',
    label: 'Banking / IBPS',
    icon: '🏦',
    color: '#10b981',
    description: 'SBI PO, IBPS, RBI, Clerk'
  },
  {
    id: 'railways',
    label: 'Railways (RRB)',
    icon: '🚂',
    color: '#f43f5e',
    description: 'NTPC, Group D, ALP'
  },
  {
    id: 'defense',
    label: 'Defense & Police',
    icon: '🛡️',
    color: '#ec4899',
    description: 'Army, Navy, Air Force, State Police'
  },
  {
    id: 'result',
    label: 'Results',
    icon: '📋',
    color: '#22c55e',
    description: 'Latest exam results declared'
  },
  {
    id: 'admitcard',
    label: 'Admit Cards',
    icon: '🎫',
    color: '#f97316',
    description: 'Download hall tickets'
  },
  {
    id: 'psu',
    label: 'PSU & Others',
    icon: '🏭',
    color: '#8b5cf6',
    description: 'ONGC, BHEL, NTPC, Teaching'
  }
];

// Affiliate link configurations for revenue
const AFFILIATE_CONFIG = {
  coursera: {
    baseUrl: 'https://www.coursera.org',
    affiliateParam: '?utm_source=jobsphere&utm_medium=affiliate',
    courses: {
      data: '/specializations/ibm-data-science',
    }
  },
  udemy: {
    baseUrl: 'https://www.udemy.com',
    affiliateParam: '?affiliate_id=YOUR_UDEMY_AFFILIATE_ID',
  },
  linkedin: {
    baseUrl: 'https://www.linkedin.com/learning',
    affiliateParam: '',
  }
};

// Google AdSense configuration
const ADSENSE_CONFIG = {
  publisherId: 'ca-pub-XXXXXXXXXXXXXXXXX',  // Replace with your AdSense publisher ID
  slots: {
    headerBanner:  '1234567890',
    sidebarAd:     '0987654321',
    inFeedAd:      '1122334455',
    footerBanner:  '5566778899',
  },
  enabled: false,  // Set to true after AdSense approval
};
