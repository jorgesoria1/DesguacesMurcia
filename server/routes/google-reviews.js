/**
 * Google Reviews API routes
 */

import { googleReviews } from '../google-reviews.js';
import { db } from '../db.js';
import { googleReviewsConfig, googleReviews as googleReviewsTable } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export function setupGoogleReviewsRoutes(app) {
  
  // Get Google reviews for the business
  app.get('/api/google-reviews', async (req, res) => {
    try {
      // Get configuration from database
      const config = await db.select()
        .from(googleReviewsConfig)
        .limit(1);
      
      const settings = config[0] || {
        businessName: 'Desguace Murcia',
        location: 'Murcia, España',
        apiKey: null,
        placeId: null,
        enabled: false
      };
      
      // Use API key from database configuration first
      const apiKey = settings.apiKey || process.env.GOOGLE_API_KEY;
      
      console.log(`🔍 Fetching Google reviews for: ${settings.businessName} in ${settings.location}`);
      console.log(`🔑 API Key source: ${settings.apiKey ? 'Database config' : 'Environment variable'}`);
      
      if (!settings.enabled && !process.env.GOOGLE_API_KEY) {
        return res.json({
          success: false,
          error: 'Google Reviews not configured',
          message: 'Please configure Google Places API key in admin panel',
          reviews: []
        });
      }
      
      if (!apiKey) {
        return res.json({
          success: false,
          error: 'No API key available',
          message: 'Google Places API key not found in environment or database',
          reviews: []
        });
      }
      
      const result = await googleReviews.fetchReviews(
        settings.businessName, 
        settings.location, 
        apiKey,
        settings.placeId
      );
      
      // Handle both old format (array) and new format (object with reviews)
      const reviews = Array.isArray(result) ? result : (result?.reviews || []);
      const globalRating = result?.globalRating || 0;
      const totalReviews = result?.totalReviews || 0;
      const businessName = result?.businessName || settings.businessName;
      
      res.json({
        success: true,
        business: businessName,
        location: settings.location,
        reviews: reviews,
        total: reviews.length,
        globalRating: globalRating,
        totalReviews: totalReviews,
        cached: googleReviews.getCacheStats(),
        highRatingCount: reviews.filter(r => r.rating >= 4).length
      });
      
    } catch (error) {
      console.error('❌ Error in Google reviews endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching reviews',
        message: error.message,
        reviews: []
      });
    }
  });

  // Refresh reviews cache
  app.post('/api/google-reviews/refresh', async (req, res) => {
    try {
      // Get configuration from database
      const config = await db.select()
        .from(googleReviewsConfig)
        .limit(1);
      
      const settings = config[0] || {
        businessName: 'Desguace Murcia',
        location: 'Murcia, España'
      };
      
      const apiKey = (settings && settings.apiKey) || process.env.GOOGLE_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Google Reviews not configured',
          message: 'Google Places API key not found in environment or database'
        });
      }
      
      // Clear all cache to force fresh fetch with only authentic Google reviews
      googleReviews.cache.clear();
      console.log('🧹 Forced cache clear - fetching only authentic Google reviews');
      
      // Fetch fresh reviews
      const reviews = await googleReviews.fetchReviews(
        settings.businessName, 
        settings.location, 
        apiKey,
        settings.placeId
      );
      
      res.json({
        success: true,
        message: 'Reviews refreshed successfully',
        business: settings.businessName,
        reviews: reviews,
        total: reviews.length
      });
      
    } catch (error) {
      console.error('❌ Error refreshing reviews:', error);
      res.status(500).json({
        success: false,
        error: 'Error refreshing reviews',
        message: error.message
      });
    }
  });

  // Get Google Reviews configuration
  app.get('/api/google-reviews/config', async (req, res) => {
    try {
      const config = await db.select()
        .from(googleReviewsConfig)
        .limit(1);
      
      if (config.length === 0) {
        // Create default configuration
        const defaultConfig = {
          businessName: 'Desguace Murcia',
          location: 'Murcia, España',
          apiProvider: 'google_places',
          enabled: false,
          minRating: 4,
          maxReviews: 6,
          cacheHours: 24
        };
        
        const inserted = await db.insert(googleReviewsConfig)
          .values(defaultConfig)
          .returning();
        
        return res.json({
          success: true,
          config: inserted[0]
        });
      }
      
      res.json({
        success: true,
        config: config[0]
      });
      
    } catch (error) {
      console.error('❌ Error getting Google Reviews config:', error);
      res.status(500).json({
        success: false,
        error: 'Error getting configuration',
        message: error.message
      });
    }
  });

  // Update Google Reviews configuration
  app.post('/api/google-reviews/config', async (req, res) => {
    try {
      const { businessName, placeId, location, apiKey, enabled, minRating, maxReviews, cacheHours } = req.body;
      
      // Get existing config
      const existing = await db.select()
        .from(googleReviewsConfig)
        .limit(1);
      
      const updateData = {
        businessName: businessName || 'Desguace Murcia',
        placeId: placeId || null,
        location: location || 'Murcia, España',
        apiProvider: 'google_places',
        apiKey: apiKey || null,
        enabled: enabled !== undefined ? enabled : false,
        minRating: minRating || 4,
        maxReviews: maxReviews || 10,
        cacheHours: cacheHours || 24,
        lastUpdate: new Date()
      };
      
      let result;
      
      if (existing.length === 0) {
        // Insert new config
        result = await db.insert(googleReviewsConfig)
          .values(updateData)
          .returning();
      } else {
        // Update existing config
        result = await db.update(googleReviewsConfig)
          .set(updateData)
          .where(eq(googleReviewsConfig.id, existing[0].id))
          .returning();
      }
      
      // Clear cache when configuration changes
      googleReviews.cache.clear();
      
      res.json({
        success: true,
        message: 'Configuration saved successfully',
        config: result[0]
      });
      
    } catch (error) {
      console.error('❌ Error saving Google Reviews config:', error);
      res.status(500).json({
        success: false,
        error: 'Error saving configuration',
        message: error.message
      });
    }
  });

  // Test Google Reviews configuration
  app.post('/api/google-reviews/test', async (req, res) => {
    try {
      const { businessName, placeId, location, apiKey } = req.body;
      
      // Use provided API key or fallback to environment variable
      const actualApiKey = apiKey || process.env.GOOGLE_API_KEY;
      
      if (!actualApiKey) {
        return res.status(400).json({
          success: false,
          error: 'API key required for testing',
          message: 'Please provide API key in request body or set GOOGLE_API_KEY environment variable'
        });
      }
      
      console.log(`🧪 Testing Google Reviews API for: ${businessName || 'Desguace Murcia'}`);
      console.log(`🔑 Using API key from: ${apiKey ? 'request body' : 'environment variable'}`);
      
      // Clear all cache before testing to get fresh results
      googleReviews.cache.clear();
      console.log(`🧹 Cache cleared for testing`);
      
      const reviews = await googleReviews.fetchFromGooglePlaces(
        businessName || 'Desguace Murcia',
        location || 'Murcia, España',
        actualApiKey,
        placeId
      );
      
      // Handle both old format (array) and new format (object with reviews)
      const reviewsArray = Array.isArray(reviews) ? reviews : (reviews?.reviews || []);
      const globalRating = reviews?.globalRating || 0;
      const totalReviews = reviews?.totalReviews || 0;
      
      res.json({
        success: true,
        message: `Successfully fetched ${reviewsArray.length} reviews`,
        business: businessName || 'Desguace Murcia',
        reviews: reviewsArray.slice(0, 3), // Show first 3 for preview
        total: reviewsArray.length,
        globalRating: globalRating,
        totalReviews: totalReviews
      });
      
      // Save the API key to configuration after successful test
      if (apiKey && reviewsArray.length > 0) {
        try {
          const existing = await db.select().from(googleReviewsConfig).limit(1);
          
          const updateData = {
            apiKey: apiKey,
            businessName: businessName || 'Desguace Murcia S.L.',
            location: location || 'Murcia, España',
            apiProvider: 'google_places',
            enabled: true,
            lastUpdate: new Date()
          };
          
          if (existing.length === 0) {
            await db.insert(googleReviewsConfig).values(updateData);
          } else {
            await db.update(googleReviewsConfig)
              .set(updateData)
              .where(eq(googleReviewsConfig.id, existing[0].id));
          }
          
          console.log('✅ Configuration saved after successful test');
        } catch (error) {
          console.error('❌ Error saving configuration:', error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error testing Google Reviews API:', error);
      res.status(500).json({
        success: false,
        error: 'Test failed',
        message: error.message
      });
    }
  });

  // Debug endpoint to check API key status
  app.get('/api/google-reviews/debug', async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      
      res.json({
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'Not found',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Debug failed',
        message: error.message
      });
    }
  });

  console.log('✅ Google Reviews routes registered');
}