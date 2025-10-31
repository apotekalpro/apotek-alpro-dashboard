/**
 * Google Review Automation Script
 * 
 * This script automates the daily sync of Google Reviews:
 * 1. Fetches outlets from Google Sheets
 * 2. Gets review data from Google Maps using Puppeteer (headless browser)
 * 3. Stores results in Supabase
 * 
 * Schedule: Daily at 1:00 AM
 * 
 * Setup Instructions:
 * 1. Install dependencies: npm install @supabase/supabase-js node-fetch puppeteer
 * 2. Set environment variables:
 *    - SUPABASE_URL=your_supabase_url
 *    - SUPABASE_KEY=your_supabase_service_key
 * 3. Deploy to cron service (GitHub Actions, Vercel Cron, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

// Configuration
const GOOGLE_SHEETS_ID = '1nTSZFKFZRt1owO-hKUk2lkzvlGxcyrBTC47yDTiu1YQ'; // Public sheet
const SHEET_NAME = 'Sheet1';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables: SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch outlets from Google Sheets
 */
async function fetchOutletsFromGoogleSheets() {
    try {
        console.log('📊 Fetching outlets from Google Sheets...');
        
        // Try direct fetch first (GitHub Actions can access directly)
        const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
        console.log('📍 CSV URL:', csvUrl);
        
        let response;
        let csvText;
        
        try {
            // Try direct fetch (works in server environment like GitHub Actions)
            response = await fetch(csvUrl);
            csvText = await response.text();
            console.log('✅ Direct fetch successful');
        } catch (directError) {
            console.log('⚠️ Direct fetch failed, trying with CORS proxy...');
            // Fallback to CORS proxy (needed for browser environment)
            response = await fetch(CORS_PROXY + encodeURIComponent(csvUrl));
            csvText = await response.text();
            console.log('✅ CORS proxy fetch successful');
        }
        
        console.log('✅ CSV data fetched, length:', csvText.length);
        console.log('📄 First 200 chars:', csvText.substring(0, 200));
        
        // Parse CSV
        const lines = csvText.split('\n');
        console.log('📋 Total lines:', lines.length);
        
        const outlets = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
            
            // Column indices for public sheet: A=Name, B=Status, C=Link
            const name = cols[0]; // Column A (index 0)
            const status = cols[1]; // Column B (index 1)
            const link = cols[2]; // Column C (index 2)
            
            // Debug first few rows
            if (i <= 3) {
                console.log(`📝 Row ${i}: name="${name}", status="${status}", link="${link}"`);
            }
            
            // Skip CLOSED outlets
            if (status && status.toUpperCase() === 'CLOSED') {
                console.log(`⏭️ Skipping CLOSED outlet: ${name}`);
                continue;
            }
            
            // Validate
            if (!name || !link) {
                if (i <= 5) console.log(`⚠️ Row ${i} missing name or link`);
                continue;
            }
            if (!link.includes('google.com/maps') && !link.includes('maps.app.goo.gl') && !link.includes('goo.gl')) {
                if (i <= 5) console.log(`⚠️ Row ${i} invalid link format: ${link}`);
                continue;
            }
            
            outlets.push({ name, link, status: status || 'ACTIVE' });
        }
        
        console.log(`✅ Found ${outlets.length} active outlets`);
        return outlets;
        
    } catch (error) {
        console.error('❌ Error fetching from Google Sheets:', error);
        throw error;
    }
}

/**
 * Fetch review data for a single outlet using Puppeteer
 */
async function fetchReviewData(outlet, browser, index = 0) {
    const page = await browser.newPage();
    
    try {
        console.log(`  🔍 [${index + 1}] Fetching reviews for: ${outlet.name}`);
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to the Google Maps page
        await page.goto(outlet.link, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait a bit for dynamic content to load
        await page.waitForTimeout(2000);
        
        // Extract review count and rating using page.evaluate
        const reviewData = await page.evaluate(() => {
            let reviewCount = 0;
            let rating = 0.0;
            
            // Strategy 1: Find rating and review count in aria-labels (most reliable)
            const elements = document.querySelectorAll('[aria-label]');
            for (const el of elements) {
                const label = el.getAttribute('aria-label');
                if (!label) continue;
                
                // Pattern: "4.5 stars 123 reviews" or "4,5 stars 123 reviews" (Indonesian format)
                const match = label.match(/([\d,\.]+)\s*(?:stars?|bintang)\s+([\d,\.]+)\s*(?:reviews?|ulasan)/i);
                if (match) {
                    rating = parseFloat(match[1].replace(',', '.'));
                    reviewCount = parseInt(match[2].replace(/[,\.]/g, ''));
                    break;
                }
                
                // Pattern: "Rated 4.5 out of 5" or similar
                const ratingMatch = label.match(/(?:rated|rating|nilai)\s+([\d,\.]+)\s*(?:out of|dari)?\s*5/i);
                if (ratingMatch && rating === 0) {
                    rating = parseFloat(ratingMatch[1].replace(',', '.'));
                }
                
                // Pattern: "123 reviews" or "123 ulasan"
                const reviewMatch = label.match(/([\d,\.]+)\s*(?:reviews?|ulasan)/i);
                if (reviewMatch && reviewCount === 0) {
                    reviewCount = parseInt(reviewMatch[1].replace(/[,\.]/g, ''));
                }
            }
            
            // Strategy 2: Look in structured data (JSON-LD)
            if (rating === 0 || reviewCount === 0) {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        
                        // Check for aggregateRating
                        if (data.aggregateRating) {
                            if (rating === 0 && data.aggregateRating.ratingValue) {
                                rating = parseFloat(data.aggregateRating.ratingValue);
                            }
                            if (reviewCount === 0 && data.aggregateRating.reviewCount) {
                                reviewCount = parseInt(data.aggregateRating.reviewCount);
                            }
                        }
                        
                        // Check for nested objects
                        if (Array.isArray(data)) {
                            for (const item of data) {
                                if (item.aggregateRating) {
                                    if (rating === 0 && item.aggregateRating.ratingValue) {
                                        rating = parseFloat(item.aggregateRating.ratingValue);
                                    }
                                    if (reviewCount === 0 && item.aggregateRating.reviewCount) {
                                        reviewCount = parseInt(item.aggregateRating.reviewCount);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore JSON parse errors
                    }
                }
            }
            
            // Strategy 3: Look for rating and review text on page
            if (rating === 0 || reviewCount === 0) {
                const bodyText = document.body.innerText;
                
                // Look for patterns like "4.5★ (123)"
                const pattern1 = bodyText.match(/([\d,\.]+)\s*[★⭐]\s*\(([\d,\.]+)\)/);
                if (pattern1) {
                    if (rating === 0) rating = parseFloat(pattern1[1].replace(',', '.'));
                    if (reviewCount === 0) reviewCount = parseInt(pattern1[2].replace(/[,\.]/g, ''));
                }
                
                // Look for patterns like "4.5 (123 reviews)"
                const pattern2 = bodyText.match(/([\d,\.]+)\s*\(([\d,\.]+)\s*(?:reviews?|ulasan)/i);
                if (pattern2) {
                    if (rating === 0) rating = parseFloat(pattern2[1].replace(',', '.'));
                    if (reviewCount === 0) reviewCount = parseInt(pattern2[2].replace(/[,\.]/g, ''));
                }
            }
            
            // Strategy 4: Look for specific Google Maps classes (may change, but worth trying)
            if (rating === 0) {
                const ratingElements = document.querySelectorAll('[role="img"]');
                for (const el of ratingElements) {
                    const ariaLabel = el.getAttribute('aria-label');
                    if (ariaLabel && ariaLabel.includes('star')) {
                        const match = ariaLabel.match(/([\d,\.]+)\s*star/i);
                        if (match) {
                            rating = parseFloat(match[1].replace(',', '.'));
                            break;
                        }
                    }
                }
            }
            
            // Validate rating range
            if (rating > 0 && (rating < 1.0 || rating > 5.0)) {
                rating = 0; // Invalid rating
            }
            
            return { reviewCount, rating };
        });
        
        // Log results
        if (reviewData.reviewCount > 0 && reviewData.rating === 0) {
            console.log(`  ⚠️ ${outlet.name}: ${reviewData.reviewCount} reviews but NO RATING extracted`);
        } else if (reviewData.reviewCount === 0 && reviewData.rating > 0) {
            console.log(`  ⚠️ ${outlet.name}: Rating ${reviewData.rating} but NO REVIEW COUNT extracted`);
        } else if (reviewData.reviewCount === 0 && reviewData.rating === 0) {
            console.log(`  ⚠️ ${outlet.name}: NO DATA extracted (might be a new listing or incorrect link)`);
        } else {
            console.log(`  ✅ ${outlet.name}: ${reviewData.reviewCount} reviews, ${reviewData.rating} rating`);
        }
        
        await page.close();
        
        return {
            ...outlet,
            reviewCount: reviewData.reviewCount,
            rating: reviewData.rating,
            lastChecked: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`  ❌ Error fetching reviews for ${outlet.name}:`, error.message);
        await page.close();
        
        return {
            ...outlet,
            reviewCount: 0,
            rating: 0,
            lastChecked: new Date().toISOString(),
            error: error.message
        };
    }
}

// Removed parseGoogleMapsHTML function - now using Puppeteer for reliable extraction

/**
 * Save outlets to Supabase
 */
async function saveToSupabase(outlets) {
    try {
        console.log('💾 Saving to Supabase...');
        
        // Create review data
        const reviewsData = outlets.map(outlet => ({
            outlet_name: outlet.name,
            google_maps_link: outlet.link,
            review_count: outlet.reviewCount || 0,
            rating: outlet.rating || 0,
            last_checked: outlet.lastChecked,
            status: 'success',
            updated_at: new Date().toISOString()
        }));
        
        // Remove duplicates based on outlet_name (keep the last occurrence)
        const uniqueReviews = {};
        for (const review of reviewsData) {
            uniqueReviews[review.outlet_name] = review;
        }
        const deduplicatedData = Object.values(uniqueReviews);
        
        const duplicateCount = reviewsData.length - deduplicatedData.length;
        if (duplicateCount > 0) {
            console.log(`⚠️  Removed ${duplicateCount} duplicate outlet(s) from batch`);
        }
        
        console.log(`📊 Upserting ${deduplicatedData.length} unique outlets...`);
        
        // Upsert to Supabase in a single batch (duplicates removed)
        const { data, error } = await supabase
            .from('google_reviews')
            .upsert(deduplicatedData, { 
                onConflict: 'outlet_name',
                ignoreDuplicates: false  // Update existing records
            });
        
        if (error) throw error;
        
        console.log(`✅ Successfully saved ${deduplicatedData.length} outlets to Supabase`);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
    }
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main automation function
 */
async function main() {
    console.log('🚀 Starting Google Review Automation (Puppeteer Edition)');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log('');
    
    let browser;
    
    try {
        // Step 1: Launch Puppeteer browser
        console.log('🌐 Launching headless browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ]
        });
        console.log('✅ Browser launched successfully');
        console.log('');
        
        // Step 2: Fetch outlets from Google Sheets
        const outlets = await fetchOutletsFromGoogleSheets();
        console.log('');
        
        // Step 3: Fetch reviews for each outlet
        console.log('📊 Fetching reviews for all outlets...');
        const outletsWithReviews = [];
        
        for (let i = 0; i < outlets.length; i++) {
            const outlet = outlets[i];
            const outletWithReview = await fetchReviewData(outlet, browser, i);
            outletsWithReviews.push(outletWithReview);
            
            // Delay between requests to avoid rate limiting
            if (i < outlets.length - 1) {
                await sleep(DELAY_BETWEEN_REQUESTS);
            }
        }
        console.log('');
        
        // Step 4: Save to Supabase
        await saveToSupabase(outletsWithReviews);
        console.log('');
        
        // Summary
        const totalReviews = outletsWithReviews.reduce((sum, o) => sum + o.reviewCount, 0);
        const outletsWithRatings = outletsWithReviews.filter(o => o.rating > 0);
        const avgRating = outletsWithRatings.length > 0 
            ? outletsWithRatings.reduce((sum, o) => sum + o.rating, 0) / outletsWithRatings.length 
            : 0;
        
        console.log('✅ Automation completed successfully!');
        console.log('📊 Summary:');
        console.log(`   • Total Outlets: ${outletsWithReviews.length}`);
        console.log(`   • Outlets with Ratings: ${outletsWithRatings.length}`);
        console.log(`   • Total Reviews: ${totalReviews}`);
        console.log(`   • Average Rating: ${avgRating > 0 ? avgRating.toFixed(2) : 'N/A'}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Automation failed:', error);
        process.exit(1);
    } finally {
        // Close browser
        if (browser) {
            await browser.close();
            console.log('🌐 Browser closed');
        }
    }
}

// Run the main function
main();
