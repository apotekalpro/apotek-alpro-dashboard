/**
 * Test script to verify rating extraction works correctly
 * Run: node test-rating-extraction.js
 */

import puppeteer from 'puppeteer';

// Test outlets (from the user's screenshot examples)
const testOutlets = [
    {
        name: 'APOTEK ALPRO Belleza',
        link: 'https://maps.app.goo.gl/example1', // Replace with actual link
        expectedRating: 5.0,
        expectedReviewCount: 95
    },
    {
        name: 'APOTEK ALPRO SUTERA UTAMA',
        link: 'https://maps.app.goo.gl/example2', // Replace with actual link
        expectedReviewCount: 192
    }
];

async function testRatingExtraction(outlet, browser) {
    const page = await browser.newPage();
    
    try {
        console.log(`\n🔍 Testing: ${outlet.name}`);
        console.log(`   Link: ${outlet.link}`);
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to the Google Maps page
        console.log('   Loading page...');
        await page.goto(outlet.link, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for content to load
        await page.waitForTimeout(2000);
        
        // Extract data
        const result = await page.evaluate(() => {
            let reviewCount = 0;
            let rating = 0.0;
            
            // Strategy 1: Find rating and review count in aria-labels
            const elements = document.querySelectorAll('[aria-label]');
            for (const el of elements) {
                const label = el.getAttribute('aria-label');
                if (!label) continue;
                
                // Pattern: "4.5 stars 123 reviews"
                const match = label.match(/([\d,\.]+)\s*(?:stars?|bintang)\s+([\d,\.]+)\s*(?:reviews?|ulasan)/i);
                if (match) {
                    rating = parseFloat(match[1].replace(',', '.'));
                    reviewCount = parseInt(match[2].replace(/[,\.]/g, ''));
                    break;
                }
            }
            
            // Strategy 2: Look in structured data
            if (rating === 0 || reviewCount === 0) {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data.aggregateRating) {
                            if (rating === 0) rating = parseFloat(data.aggregateRating.ratingValue || 0);
                            if (reviewCount === 0) reviewCount = parseInt(data.aggregateRating.reviewCount || 0);
                        }
                    } catch (e) {}
                }
            }
            
            return { reviewCount, rating };
        });
        
        // Display results
        console.log(`   ✅ Extracted: ${result.reviewCount} reviews, ${result.rating} rating`);
        
        if (outlet.expectedRating) {
            const ratingMatch = Math.abs(result.rating - outlet.expectedRating) < 0.1;
            console.log(`   ${ratingMatch ? '✅' : '❌'} Expected rating: ${outlet.expectedRating}, Got: ${result.rating}`);
        }
        
        if (outlet.expectedReviewCount) {
            const countMatch = result.reviewCount === outlet.expectedReviewCount;
            console.log(`   ${countMatch ? '✅' : '⚠️'} Expected reviews: ${outlet.expectedReviewCount}, Got: ${result.reviewCount}`);
        }
        
        await page.close();
        return result;
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        await page.close();
        return { reviewCount: 0, rating: 0, error: error.message };
    }
}

async function main() {
    console.log('🚀 Starting Rating Extraction Test');
    console.log('⚠️  Note: Update test outlets with actual Google Maps links');
    console.log('');
    
    let browser;
    
    try {
        console.log('🌐 Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        console.log('✅ Browser launched');
        
        // Test each outlet
        for (const outlet of testOutlets) {
            await testRatingExtraction(outlet, browser);
        }
        
        console.log('\n✅ All tests completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🌐 Browser closed');
        }
    }
}

main();
