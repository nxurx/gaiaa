/**
 * Google Maps Scraper Service
 * Extracts business data from Google Maps search results
 */

class GoogleMapsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (error) {
      throw new Error('Google Maps scraper dependency is not installed. Run npm install to install Puppeteer before scraping.');
    }

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid detection
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Scrape Google Maps for businesses
   * @param {Object} options - { keyword, industry, city, state, country, radius, maxResults }
   * @param {Function} onProgress - Callback for progress updates
   * @returns {Array} - Array of business objects
   */
  async scrape(options, onProgress) {
    const { keyword, industry, city, state, country, radius, maxResults = 50 } = options;
    
    try {
      await this.initialize();
      
      // Build search query
      const searchQuery = this.buildSearchQuery(keyword, industry, city, state, country, radius);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      onProgress?.({ type: 'navigating', message: `Navigating to Google Maps...` });
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await this.page.waitForSelector('[role="feed"]', { timeout: 15000 });
      
      const businesses = [];
      let previousHeight = 0;
      let noNewResultsCount = 0;
      const maxNoNewResults = 5;
      
      onProgress?.({ type: 'scraping', message: 'Starting to scrape results...' });
      
      while (businesses.length < maxResults && noNewResultsCount < maxNoNewResults) {
        // Scroll to load more results
        await this.page.evaluate(() => {
          const feed = document.querySelector('[role="feed"]');
          if (feed) {
            feed.scrollTop = feed.scrollHeight;
          }
        });
        
        // Wait for new content to load
        await this.page.waitForTimeout(2000);
        
        // Extract current results
        const newBusinesses = await this.extractBusinesses();
        
        // Add only new businesses
        const existingIds = new Set(businesses.map(b => b.name + b.address));
        const newItems = newBusinesses.filter(b => !existingIds.has(b.name + b.address));
        
        businesses.push(...newItems);
        
        onProgress?.({ 
          type: 'progress', 
          message: `Scraped ${businesses.length} businesses...`,
          count: businesses.length,
          total: maxResults
        });
        
        // Check if we got new results
        const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
          noNewResultsCount++;
        } else {
          noNewResultsCount = 0;
          previousHeight = currentHeight;
        }
        
        // Rate limiting
        await this.page.waitForTimeout(1000);
      }
      
      onProgress?.({ type: 'complete', message: `Scraping complete! Found ${businesses.length} businesses.` });
      
      return businesses.slice(0, maxResults);
      
    } catch (error) {
      onProgress?.({ type: 'error', message: `Error: ${error.message}` });
      throw error;
    } finally {
      await this.close();
    }
  }

  buildSearchQuery(keyword, industry, city, state, country, radius) {
    const parts = [];
    
    if (keyword) parts.push(keyword);
    if (industry) parts.push(industry);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country) parts.push(country);
    if (radius) parts.push(`within ${radius} miles`);
    
    return parts.join(' ') || 'businesses';
  }

  async extractBusinesses() {
    return await this.page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('[role="feed"] > div > div[role="article"]');
      
      cards.forEach(card => {
        try {
          const nameEl = card.querySelector('div.fontHeadlineSmall');
          const ratingEl = card.querySelector('span[aria-label*="stars"]');
          const reviewsEl = card.querySelector('span[aria-label*="reviews"]');
          const linkEl = card.querySelector('a');
          
          if (!nameEl) return;
          
          const name = nameEl.textContent?.trim() || '';
          const rating = ratingEl?.getAttribute('aria-label')?.match(/([\d.]+)/)?.[1] || '0';
          const reviews = reviewsEl?.getAttribute('aria-label')?.match(/([\d,]+)/)?.[1]?.replace(/,/g, '') || '0';
          const link = linkEl?.href || '';
          
          // Extract additional info from the card
          const infoText = card.textContent || '';
          
          // Try to extract phone number
          const phoneMatch = infoText.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
          const phone = phoneMatch ? phoneMatch[0] : '';
          
          // Try to extract address
          const addressMatch = infoText.match(/[\d]+\s+[\w\s]+,\s*[\w\s]+/);
          const address = addressMatch ? addressMatch[0] : '';
          
          // Try to extract website
          const websiteMatch = infoText.match(/https?:\/\/[^\s]+/);
          const website = websiteMatch ? websiteMatch[0] : '';
          const category = Array.from(card.querySelectorAll('span'))
            .map(node => node.textContent?.trim())
            .find(text => text && !text.match(/^\d/) && text.length > 2 && text.length < 60) || '';
          const emailMatch = infoText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
          const socialLinks = Array.from(card.querySelectorAll('a[href*="facebook"],a[href*="instagram"],a[href*="linkedin"],a[href*="x.com"],a[href*="twitter"]'))
            .map(anchor => anchor.href);
          
          if (name) {
            results.push({
              name,
              phone,
              website,
              address,
              rating,
              reviews: parseInt(reviews) || 0,
              category,
              email: emailMatch ? emailMatch[0] : '',
              socialLinks,
              link,
            });
          }
        } catch (e) {
          // Skip cards that fail to parse
        }
      });
      
      return results;
    });
  }
}

module.exports = GoogleMapsScraper;
