/**
 * Complete CMS System Initialization Script
 * Creates all necessary data and configurations for the CMS
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initializeCMSSystem() {
  console.log('🚀 Inicializando sistema CMS completo...');

  try {
    // 1. Verificar y crear tablas si no existen
    await createTablesIfNotExists();
    
    // 2. Insertar páginas iniciales
    await insertInitialPages();
    
    // 3. Insertar bloques del footer
    await insertFooterBlocks();
    
    // 4. Insertar configuraciones del sitio
    await insertSiteSettings();
    
    // 5. Verificar configuración
    await verifyConfiguration();
    
    console.log('✅ Sistema CMS inicializado exitosamente');
    
  } catch (error) {
    console.error('❌ Error al inicializar CMS:', error);
    throw error;
  }
}

async function createTablesIfNotExists() {
  console.log('📋 Creando tablas del CMS...');
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS "pages" (
      "id" serial PRIMARY KEY NOT NULL,
      "slug" varchar(255) NOT NULL UNIQUE,
      "title" varchar(255) NOT NULL,
      "meta_description" text,
      "content" text NOT NULL,
      "is_published" boolean DEFAULT true NOT NULL,
      "is_editable" boolean DEFAULT true NOT NULL,
      "page_type" varchar(50) DEFAULT 'static' NOT NULL,
      "form_config" json,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );`,
    
    `CREATE TABLE IF NOT EXISTS "footer_blocks" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar(255) NOT NULL,
      "content" text NOT NULL,
      "block_type" varchar(50) DEFAULT 'text' NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );`,
    
    `CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar(255) NOT NULL UNIQUE,
      "value" text NOT NULL,
      "description" text,
      "type" varchar(50) DEFAULT 'text' NOT NULL,
      "category" varchar(100) DEFAULT 'general' NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );`
  ];

  for (const query of queries) {
    await pool.query(query);
  }
  
  console.log('✅ Tablas creadas correctamente');
}

async function insertInitialPages() {
  console.log('📄 Insertando páginas iniciales...');
  
  const pages = [
    {
      slug: 'contacto',
      title: 'Contacto',
      metaDescription: 'Contacta con nosotros para cualquier consulta sobre repuestos y vehículos',
      content: `<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Contacto</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 class="text-2xl font-semibold mb-4">¿Tienes alguna pregunta?</h2>
            <p class="text-lg mb-6">Estamos aquí para ayudarte. Ponte en contacto con nosotros y te responderemos lo antes posible.</p>
            
            <div class="space-y-4">
              <div class="flex items-center">
                <span class="font-semibold mr-2">📍 Dirección:</span>
                <span>Carretera Almuñecar, Km 1.5, 18640 Granada</span>
              </div>
              <div class="flex items-center">
                <span class="font-semibold mr-2">📞 Teléfono:</span>
                <span>958 790 858</span>
              </div>
              <div class="flex items-center">
                <span class="font-semibold mr-2">✉️ Email:</span>
                <span>info@desguacesmurcia.com</span>
              </div>
              <div class="flex items-center">
                <span class="font-semibold mr-2">🕒 Horario:</span>
                <span>Lunes a Viernes: 9:00-18:00, Sábados: 9:00-14:00</span>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3 class="text-xl font-semibold mb-4">Formulario de Contacto</h3>
            <p class="text-gray-600">Utiliza nuestro formulario de contacto para enviarnos tu consulta directamente.</p>
          </div>
        </div>
      </div>`,
      pageType: 'contact',
      formConfig: {
        emailTo: 'info@desguacesmurcia.com',
        fields: [
          { name: 'name', label: 'Nombre', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Teléfono', type: 'tel', required: false },
          { name: 'message', label: 'Mensaje', type: 'textarea', required: true }
        ]
      }
    },
    {
      slug: 'tasamos-tu-vehiculo',
      title: 'Tasamos tu Vehículo',
      metaDescription: 'Obtén una tasación gratuita de tu vehículo al instante',
      content: `<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Tasamos tu Vehículo</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 class="text-2xl font-semibold mb-4">Valoración Profesional Gratuita</h2>
            <p class="text-lg mb-6">Obtén una tasación profesional de tu vehículo de forma rápida y gratuita. Nuestros expertos evaluarán tu automóvil y te darán el mejor precio del mercado.</p>
            
            <div class="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 class="font-semibold mb-2">¿Por qué elegirnos?</h3>
              <ul class="space-y-1 text-sm">
                <li>✅ Tasación gratuita e inmediata</li>
                <li>✅ Más de 20 años de experiencia</li>
                <li>✅ Precios competitivos del mercado</li>
                <li>✅ Proceso transparente y confiable</li>
                <li>✅ Pago inmediato al entregar</li>
              </ul>
            </div>
          </div>
          
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3 class="text-xl font-semibold mb-4">Formulario de Tasación</h3>
            <p class="text-gray-600">Completa el formulario con los datos de tu vehículo para recibir una tasación personalizada.</p>
          </div>
        </div>
      </div>`,
      pageType: 'value-vehicle',
      formConfig: {
        emailTo: 'tasaciones@desguacesmurcia.com',
        fields: [
          { name: 'marca', label: 'Marca', type: 'text', required: true },
          { name: 'modelo', label: 'Modelo', type: 'text', required: true },
          { name: 'año', label: 'Año', type: 'number', required: true },
          { name: 'kilometros', label: 'Kilómetros', type: 'number', required: true },
          { name: 'combustible', label: 'Combustible', type: 'select', options: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico'], required: true },
          { name: 'estado', label: 'Estado del vehículo', type: 'select', options: ['Excelente', 'Bueno', 'Regular', 'Malo'], required: true },
          { name: 'contactName', label: 'Nombre', type: 'text', required: true },
          { name: 'contactEmail', label: 'Email', type: 'email', required: true },
          { name: 'contactPhone', label: 'Teléfono', type: 'tel', required: true }
        ]
      }
    },
    {
      slug: 'nosotros',
      title: 'Nosotros',
      metaDescription: 'Conoce más sobre Desguaces Murcia, especialistas en repuestos de automóvil',
      content: `<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Nosotros</h1>
        <div class="prose prose-lg max-w-none">
          <p class="text-xl text-gray-600 mb-8">Somos especialistas en repuestos de automóvil con más de 20 años de experiencia en el sector.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 class="text-2xl font-semibold mb-4">Nuestra Historia</h2>
              <p>En Desguaces Murcia llevamos más de dos décadas dedicándonos al sector del automóvil, especializándonos en la venta de repuestos y piezas de segunda mano de alta calidad.</p>
              <p>Comenzamos como un pequeño negocio familiar y hemos crecido hasta convertirnos en una referencia en la región de Murcia.</p>
            </div>
            <div>
              <h2 class="text-2xl font-semibold mb-4">Nuestro Compromiso</h2>
              <p>Nos comprometemos a ofrecer piezas de automóvil de la más alta calidad al mejor precio del mercado, con garantía y un servicio personalizado.</p>
              <p>Cada pieza es cuidadosamente seleccionada y verificada por nuestro equipo de expertos.</p>
            </div>
          </div>
          
          <div class="bg-blue-50 p-6 rounded-lg mb-8">
            <h2 class="text-2xl font-semibold mb-4">¿Por qué elegirnos?</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul class="space-y-2">
                <li>✅ Más de 20 años de experiencia</li>
                <li>✅ Catálogo con miles de piezas</li>
                <li>✅ Garantía en todos nuestros productos</li>
                <li>✅ Precios competitivos</li>
              </ul>
              <ul class="space-y-2">
                <li>✅ Atención personalizada</li>
                <li>✅ Envíos a toda España</li>
                <li>✅ Sistema de búsqueda avanzado</li>
                <li>✅ Tasación gratuita de vehículos</li>
              </ul>
            </div>
          </div>
          
          <h2 class="text-2xl font-semibold mb-4">Nuestros Servicios</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 border rounded-lg">
              <h3 class="font-semibold mb-2">Venta de Repuestos</h3>
              <p class="text-sm text-gray-600">Amplio catálogo de piezas para todas las marcas</p>
            </div>
            <div class="text-center p-4 border rounded-lg">
              <h3 class="font-semibold mb-2">Tasación de Vehículos</h3>
              <p class="text-sm text-gray-600">Valuación gratuita y profesional</p>
            </div>
            <div class="text-center p-4 border rounded-lg">
              <h3 class="font-semibold mb-2">Envíos</h3>
              <p class="text-sm text-gray-600">Entrega rápida y segura</p>
            </div>
          </div>
        </div>
      </div>`,
      pageType: 'static'
    },
    {
      slug: 'aviso-legal',
      title: 'Aviso Legal',
      metaDescription: 'Aviso legal y condiciones de uso del sitio web',
      content: `<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Aviso Legal</h1>
        <div class="prose prose-lg max-w-none">
          <h2 class="text-2xl font-semibold mb-4">Información General</h2>
          <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, ponemos en su conocimiento los siguientes datos:</p>
          
          <div class="bg-gray-50 p-6 rounded-lg mb-6">
            <p><strong>Denominación social:</strong> Desguaces Murcia</p>
            <p><strong>Domicilio:</strong> Carretera Almuñecar, Km 1.5, 18640 Granada</p>
            <p><strong>CIF:</strong> B-12345678</p>
            <p><strong>Teléfono:</strong> 958 790 858</p>
            <p><strong>Email:</strong> info@desguacesmurcia.com</p>
          </div>
          
          <h2 class="text-2xl font-semibold mb-4">Objeto</h2>
          <p>El presente aviso legal regula el uso del sitio web desguacesmurcia.com, del que es titular Desguaces Murcia.</p>
          
          <h2 class="text-2xl font-semibold mb-4">Condiciones de Uso</h2>
          <p>El acceso y uso de este sitio web atribuye la condición de usuario del mismo e implica la aceptación plena de todas las cláusulas incluidas en este Aviso Legal.</p>
          
          <h2 class="text-2xl font-semibold mb-4">Responsabilidad</h2>
          <p>El usuario se compromete a hacer un uso adecuado de los contenidos y servicios que se ofrecen a través del sitio web y a no emplearlos para realizar actividades ilícitas.</p>
          
          <h2 class="text-2xl font-semibold mb-4">Propiedad Intelectual</h2>
          <p>Todos los contenidos del sitio web, incluyendo textos, fotografías, gráficos, imágenes, tecnología, software, links y demás contenidos audiovisuales o sonoros, son propiedad de Desguaces Murcia.</p>
        </div>
      </div>`,
      pageType: 'static'
    },
    {
      slug: 'politica-privacidad',
      title: 'Política de Privacidad',
      metaDescription: 'Política de privacidad y protección de datos personales',
      content: `<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Política de Privacidad</h1>
        <div class="prose prose-lg max-w-none">
          <p class="text-lg text-gray-600 mb-6">En cumplimiento del Reglamento General de Protección de Datos (RGPD), informamos sobre el tratamiento de sus datos personales.</p>
          
          <h2 class="text-2xl font-semibold mb-4">Responsable del Tratamiento</h2>
          <p>Desguaces Murcia es el responsable del tratamiento de sus datos personales.</p>
          
          <div class="bg-gray-50 p-6 rounded-lg mb-6">
            <p><strong>Denominación:</strong> Desguaces Murcia</p>
            <p><strong>Dirección:</strong> Carretera Almuñecar, Km 1.5, 18640 Granada</p>
            <p><strong>Email:</strong> info@desguacemurcia.com</p>
            <p><strong>Teléfono:</strong> 958 790 858</p>
          </div>
          
          <h2 class="text-2xl font-semibold mb-4">Finalidad del Tratamiento</h2>
          <p>Sus datos personales serán tratados para las siguientes finalidades:</p>
          <ul class="list-disc pl-6 mb-6">
            <li>Gestión de consultas y solicitudes de información</li>
            <li>Prestación de servicios solicitados</li>
            <li>Gestión de la relación comercial</li>
            <li>Envío de comunicaciones comerciales (previa autorización)</li>
          </ul>
          
          <h2 class="text-2xl font-semibold mb-4">Legitimación</h2>
          <p>La base legal para el tratamiento de sus datos es:</p>
          <ul class="list-disc pl-6 mb-6">
            <li>El consentimiento del interesado</li>
            <li>La ejecución de un contrato</li>
            <li>El cumplimiento de una obligación legal</li>
          </ul>
          
          <h2 class="text-2xl font-semibold mb-4">Conservación de los Datos</h2>
          <p>Los datos personales se conservarán durante el tiempo necesario para cumplir con la finalidad para la que fueron recabados y para determinar las posibles responsabilidades que se pudieran derivar de dicha finalidad y del tratamiento de los datos.</p>
          
          <h2 class="text-2xl font-semibold mb-4">Derechos del Interesado</h2>
          <p>Tiene derecho a:</p>
          <ul class="list-disc pl-6 mb-6">
            <li>Acceder a sus datos personales</li>
            <li>Rectificar los datos inexactos</li>
            <li>Suprimir los datos cuando ya no sean necesarios</li>
            <li>Oponerse al tratamiento</li>
            <li>Limitar el tratamiento</li>
            <li>Solicitar la portabilidad de los datos</li>
          </ul>
          
          <p>Para ejercer estos derechos, puede contactar con nosotros en: info@desguacesmurcia.com</p>
        </div>
      </div>`,
      pageType: 'static'
    }
  ];

  for (const page of pages) {
    try {
      await pool.query(`
        INSERT INTO pages (slug, title, meta_description, content, page_type, form_config, is_published, is_editable)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          meta_description = EXCLUDED.meta_description,
          content = EXCLUDED.content,
          page_type = EXCLUDED.page_type,
          form_config = EXCLUDED.form_config,
          updated_at = NOW()
      `, [
        page.slug,
        page.title,
        page.metaDescription,
        page.content,
        page.pageType,
        JSON.stringify(page.formConfig || null),
        true,
        true
      ]);
      console.log(`✅ Página "${page.title}" insertada/actualizada`);
    } catch (error) {
      console.error(`❌ Error al insertar página "${page.title}":`, error.message);
    }
  }
}

async function insertFooterBlocks() {
  console.log('🦶 Insertando bloques del footer...');
  
  const blocks = [
    {
      title: 'Información de la Empresa',
      content: JSON.stringify({
        company: 'Desguaces Murcia',
        address: 'Calle Principal 123',
        city: 'Murcia',
        postal: '30001',
        phone: '+34 968 123 456',
        email: 'info@desguacesmurcia.com'
      }),
      blockType: 'contact',
      sortOrder: 1
    },
    {
      title: 'Enlaces Útiles',
      content: JSON.stringify({
        links: [
          { text: 'Nosotros', url: '/nosotros' },
          { text: 'Contacto', url: '/contacto' },
          { text: 'Tasamos tu Vehículo', url: '/tasamos-tu-vehiculo' },
          { text: 'Catálogo de Piezas', url: '/parts' },
          { text: 'Catálogo de Vehículos', url: '/vehicles' }
        ]
      }),
      blockType: 'links',
      sortOrder: 2
    },
    {
      title: 'Legal',
      content: JSON.stringify({
        links: [
          { text: 'Aviso Legal', url: '/aviso-legal' },
          { text: 'Política de Privacidad', url: '/politica-privacidad' },
          { text: 'Términos y Condiciones', url: '/terminos-condiciones' }
        ]
      }),
      blockType: 'links',
      sortOrder: 3
    },
    {
      title: 'Horarios',
      content: '<p><strong>Lunes a Viernes:</strong> 9:00 - 18:00<br><strong>Sábados:</strong> 9:00 - 14:00<br><strong>Domingos:</strong> Cerrado</p>',
      blockType: 'text',
      sortOrder: 4
    }
  ];

  for (const block of blocks) {
    try {
      await pool.query(`
        INSERT INTO footer_blocks (title, content, block_type, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [
        block.title,
        block.content,
        block.blockType,
        block.sortOrder,
        true
      ]);
      console.log(`✅ Bloque "${block.title}" insertado`);
    } catch (error) {
      console.error(`❌ Error al insertar bloque "${block.title}":`, error.message);
    }
  }
}

async function insertSiteSettings() {
  console.log('⚙️ Insertando configuraciones del sitio...');
  
  const settings = [
    {
      key: 'site_name',
      value: 'Desguaces Murcia',
      description: 'Nombre del sitio web',
      type: 'text',
      category: 'general'
    },
    {
      key: 'site_description',
      value: 'Especialistas en repuestos de automóvil con más de 20 años de experiencia',
      description: 'Descripción del sitio',
      type: 'text',
      category: 'general'
    },
    {
      key: 'contact_email',
      value: 'info@desguacesmurcia.com',
      description: 'Email principal de contacto',
      type: 'email',
      category: 'contact'
    },
    {
      key: 'contact_phone',
      value: '+34 968 123 456',
      description: 'Teléfono de contacto',
      type: 'text',
      category: 'contact'
    },
    {
      key: 'contact_address',
      value: 'Calle Principal 123, 30001 Murcia',
      description: 'Dirección física',
      type: 'text',
      category: 'contact'
    },
    {
      key: 'form_contact_email',
      value: 'info@desguacesmurcia.com',
      description: 'Email donde llegan los formularios de contacto',
      type: 'email',
      category: 'forms'
    },
    {
      key: 'form_valuation_email',
      value: 'tasaciones@desguacesmurcia.com',
      description: 'Email donde llegan las tasaciones',
      type: 'email',
      category: 'forms'
    },
    {
      key: 'business_hours',
      value: JSON.stringify({
        monday: '9:00-18:00',
        tuesday: '9:00-18:00',
        wednesday: '9:00-18:00',
        thursday: '9:00-18:00',
        friday: '9:00-18:00',
        saturday: '9:00-14:00',
        sunday: 'closed'
      }),
      description: 'Horarios de atención',
      type: 'json',
      category: 'general'
    }
  ];

  for (const setting of settings) {
    try {
      await pool.query(`
        INSERT INTO site_settings (key, value, description, type, category)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          type = EXCLUDED.type,
          category = EXCLUDED.category,
          updated_at = NOW()
      `, [
        setting.key,
        setting.value,
        setting.description,
        setting.type,
        setting.category
      ]);
      console.log(`✅ Configuración "${setting.key}" insertada/actualizada`);
    } catch (error) {
      console.error(`❌ Error al insertar configuración "${setting.key}":`, error.message);
    }
  }
}

async function verifyConfiguration() {
  console.log('🔍 Verificando configuración del CMS...');
  
  // Verificar páginas
  const pagesResult = await pool.query('SELECT COUNT(*) as count FROM pages');
  console.log(`📄 Páginas creadas: ${pagesResult.rows[0].count}`);
  
  // Verificar bloques del footer
  const blocksResult = await pool.query('SELECT COUNT(*) as count FROM footer_blocks WHERE is_active = true');
  console.log(`🦶 Bloques del footer activos: ${blocksResult.rows[0].count}`);
  
  // Verificar configuraciones
  const settingsResult = await pool.query('SELECT COUNT(*) as count FROM site_settings');
  console.log(`⚙️ Configuraciones del sitio: ${settingsResult.rows[0].count}`);
  
  // Mostrar páginas disponibles
  const pages = await pool.query('SELECT slug, title, page_type FROM pages WHERE is_published = true');
  console.log('\n📋 Páginas disponibles:');
  pages.rows.forEach(page => {
    console.log(`  • /${page.slug} - ${page.title} (${page.page_type})`);
  });
}

// Ejecutar inicialización
initializeCMSSystem()
  .then(() => {
    console.log('\n🎉 Sistema CMS listo para usar!');
    console.log('📝 Accede al panel de administración en: /admin/cms');
    console.log('🌐 Páginas públicas disponibles en las URLs mostradas arriba');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });

export { initializeCMSSystem };