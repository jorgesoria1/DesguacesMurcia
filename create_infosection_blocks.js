/**
 * Script to create homepage blocks for the InfoSection component
 * This will make the "¿Por qué elegirnos?" section editable through the CMS
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createInfoSectionBlocks() {
  console.log('🔄 Creating homepage blocks for InfoSection...');

  try {
    // First, clear existing "why_choose_us" blocks
    await pool.query(`DELETE FROM homepage_blocks WHERE block_type = 'why_choose_us'`);
    console.log('✅ Cleared existing why_choose_us blocks');

    // Create the section title block
    const titleBlock = {
      block_type: 'why_choose_us_title',
      title: '¿Por qué elegirnos?',
      subtitle: null,
      description: null,
      icon: null,
      image: null,
      button_text: null,
      button_url: null,
      sort_order: 0,
      is_active: true
    };

    await pool.query(`
      INSERT INTO homepage_blocks (block_type, title, subtitle, description, icon, image, button_text, button_url, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      titleBlock.block_type,
      titleBlock.title,
      titleBlock.subtitle,
      titleBlock.description,
      titleBlock.icon,
      titleBlock.image,
      titleBlock.button_text,
      titleBlock.button_url,
      titleBlock.sort_order,
      titleBlock.is_active
    ]);
    console.log('✅ Created title block');

    // Create the feature blocks
    const featureBlocks = [
      {
        block_type: 'why_choose_us',
        title: 'Calidad garantizada',
        subtitle: null,
        description: 'Todas nuestras piezas son verificadas por nuestros técnicos especializados antes de ser puestas a la venta.',
        icon: 'CheckCircle',
        image: null,
        button_text: null,
        button_url: null,
        sort_order: 1,
        is_active: true
      },
      {
        block_type: 'why_choose_us',
        title: 'Envío rápido',
        subtitle: null,
        description: 'Realizamos envíos a toda España en 24/48h para que tenga sus piezas lo antes posible.',
        icon: 'Truck',
        image: null,
        button_text: null,
        button_url: null,
        sort_order: 2,
        is_active: true
      },
      {
        block_type: 'why_choose_us',
        title: 'Precios competitivos',
        subtitle: null,
        description: 'Ofrecemos los mejores precios del mercado en piezas originales de segunda mano.',
        icon: 'EuroIcon',
        image: null,
        button_text: null,
        button_url: null,
        sort_order: 3,
        is_active: true
      },
      {
        block_type: 'why_choose_us',
        title: 'Atención personalizada',
        subtitle: null,
        description: 'Nuestro equipo está a su disposición para asesorarle en la elección de las piezas que necesita.',
        icon: 'Headphones',
        image: null,
        button_text: null,
        button_url: null,
        sort_order: 4,
        is_active: true
      }
    ];

    // Insert the image block
    const imageBlock = {
      block_type: 'why_choose_us_image',
      title: 'Imagen del desguace',
      subtitle: null,
      description: 'Nuestro desguace',
      icon: null,
      image: '/introduesguace.png',
      button_text: null,
      button_url: null,
      sort_order: 5,
      is_active: true
    };

    await pool.query(`
      INSERT INTO homepage_blocks (block_type, title, subtitle, description, icon, image, button_text, button_url, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      imageBlock.block_type,
      imageBlock.title,
      imageBlock.subtitle,
      imageBlock.description,
      imageBlock.icon,
      imageBlock.image,
      imageBlock.button_text,
      imageBlock.button_url,
      imageBlock.sort_order,
      imageBlock.is_active
    ]);
    console.log('✅ Created image block');

    // Insert feature blocks
    for (const block of featureBlocks) {
      await pool.query(`
        INSERT INTO homepage_blocks (block_type, title, subtitle, description, icon, image, button_text, button_url, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        block.block_type,
        block.title,
        block.subtitle,
        block.description,
        block.icon,
        block.image,
        block.button_text,
        block.button_url,
        block.sort_order,
        block.is_active
      ]);
    }
    console.log('✅ Created feature blocks');

    // Verify the blocks were created
    const result = await pool.query(`
      SELECT * FROM homepage_blocks 
      WHERE block_type IN ('why_choose_us', 'why_choose_us_title', 'why_choose_us_image')
      ORDER BY sort_order
    `);

    console.log(`\n📊 Created ${result.rows.length} homepage blocks:`);
    result.rows.forEach(block => {
      console.log(`  • ${block.title} (${block.block_type}) - Order: ${block.sort_order}`);
    });

    console.log('\n🎉 InfoSection blocks created successfully!');
    console.log('🔧 You can now manage these blocks through the CMS admin panel');

  } catch (error) {
    console.error('❌ Error creating InfoSection blocks:', error);
  } finally {
    await pool.end();
  }
}

// Execute the script
createInfoSectionBlocks();