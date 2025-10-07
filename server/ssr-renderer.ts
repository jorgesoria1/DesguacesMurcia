// SSR Renderer for dynamic meta tags in HTML source
import fs from 'fs';
import path from 'path';

// Simple SSR implementation for meta tags only
export async function renderPageWithMeta(url: string, metaData: any) {
  try {
    // Read the built HTML template
    const indexPath = path.resolve('./dist/public/index.html');
    let htmlTemplate = '';
    
    try {
      htmlTemplate = fs.readFileSync(indexPath, 'utf8');
    } catch (error) {
      // Fallback to development template
      const devPath = path.resolve('./client/index.html');
      htmlTemplate = fs.readFileSync(devPath, 'utf8');
    }

    // Generate dynamic meta tags
    const dynamicMeta = generateMetaTags(metaData);
    
    // Replace placeholder meta tags with dynamic ones
    const finalHtml = htmlTemplate
      .replace(/<title>.*?<\/title>/, `<title>${metaData.title}</title>`)
      .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${metaData.description}"`)
      .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${metaData.title}"`)
      .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${metaData.description}"`)
      .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${metaData.url || `https://localhost:5000${url}`}"`)
      .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${metaData.title}"`)
      .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${metaData.description}"`);

    return finalHtml;
  } catch (error) {
    console.error('SSR Error:', error);
    throw error;
  }
}

function generateMetaTags(metaData: any): string {
  return `
    <title>${metaData.title}</title>
    <meta name="description" content="${metaData.description}" />
    <meta property="og:title" content="${metaData.title}" />
    <meta property="og:description" content="${metaData.description}" />
    <meta property="og:image" content="${metaData.image || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=630&fit=crop'}" />
    <meta property="og:url" content="${metaData.url}" />
    <meta name="twitter:title" content="${metaData.title}" />
    <meta name="twitter:description" content="${metaData.description}" />
    <meta name="twitter:image" content="${metaData.image || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=630&fit=crop'}" />
  `;
}