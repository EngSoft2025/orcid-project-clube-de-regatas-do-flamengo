
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

console.log('🚀 Iniciando ORCID Proxy Server...');
console.log('📦 Dependências carregadas:', {
  express: '✅',
  cors: '✅',
  'node-fetch': '✅',
  dotenv: '✅'
});

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🔧 Configuração inicial:`, {
  PORT,
  NODE_ENV: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString()
});

// Middleware com logs
console.log('⚙️ Configurando middlewares...');

app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`\n📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`🔍 Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`🌐 IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`📋 User-Agent: ${req.get('User-Agent') || 'N/A'}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`📤 [${new Date().toISOString()}] Resposta: ${res.statusCode} - ${duration}ms`);
    console.log(`📊 Response Headers:`, JSON.stringify(res.getHeaders(), null, 2));
  });
  
  next();
});

app.use(cors());
console.log('✅ CORS configurado');

app.use(express.json());
console.log('✅ JSON parser configurado');

app.use(express.urlencoded({ extended: true }));
console.log('✅ URL-encoded parser configurado');

// Serve static files (if you have any)
app.use(express.static('public'));
console.log('✅ Static files configurado (pasta public)');

// Root endpoint
app.get('/', (req, res) => {
  console.log('🏠 Acessando endpoint raiz');
  const response = {
    message: 'ORCID Proxy Server is running!',
    endpoints: {
      '/api/orcid/token': 'POST - Get access token',
      '/api/orcid/profile/:orcid': 'GET - Get ORCID profile',
      '/api/orcid/profile/:orcid/works': 'GET - Get ORCID works',
      '/api/orcid/profile/:orcid/work/:putCode': 'GET - Get individual work',
      '/api/orcid/profile/:orcid/fundings': 'GET - Get ORCID fundings',
      '/api/orcid/profile/:orcid/funding/:putCode': 'GET - Get individual funding'
    }
  };
  console.log('📋 Enviando resposta da raiz:', JSON.stringify(response, null, 2));
  res.json(response);
});

// Get ORCID Access Token
app.post('/api/orcid/token', async (req, res) => {
  console.log('\n🔑 === ENDPOINT: GET TOKEN ===');
  console.log('📥 Body recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { client_id, client_secret, grant_type = 'client_credentials', scope = '/read-public', code, redirect_uri } = req.body;

    console.log('🔍 Parâmetros extraídos:', {
      client_id: client_id ? `${client_id.substring(0, 8)}...` : 'AUSENTE',
      client_secret: client_secret ? `${client_secret.substring(0, 8)}...` : 'AUSENTE',
      grant_type,
      scope,
      code: code ? `${code.substring(0, 10)}...` : undefined,
      redirect_uri
    });

    if (!client_id || !client_secret) {
      console.log('❌ Validação falhou: client_id ou client_secret ausentes');
      return res.status(400).json({ 
        error: 'client_id and client_secret are required' 
      });
    }

    const tokenUrl = 'https://sandbox.orcid.org/oauth/token';
    console.log('🔗 URL do token:', tokenUrl);
    
    const body = new URLSearchParams({
      client_id,
      client_secret,
      grant_type
    });

    console.log('📋 Parâmetros base adicionados ao body');

    // Add additional parameters based on grant type
    if (grant_type === 'authorization_code') {
      console.log('🔄 Grant type: authorization_code - adicionando code e redirect_uri');
      if (!code || !redirect_uri) {
        console.log('❌ Validação falhou: code ou redirect_uri ausentes para authorization_code');
        return res.status(400).json({ 
          error: 'code and redirect_uri are required for authorization_code grant' 
        });
      }
      body.append('code', code);
      body.append('redirect_uri', redirect_uri);
      console.log('✅ Code e redirect_uri adicionados');
    } else {
      console.log('🔄 Grant type padrão - adicionando scope');
      body.append('scope', scope);
      console.log('✅ Scope adicionado:', scope);
    }

    console.log('📤 Enviando requisição para ORCID...');
    console.log('📋 Headers da requisição:', {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body
    });

    console.log('📥 Resposta recebida do ORCID:');
    console.log('📊 Status:', response.status, response.statusText);
    console.log('📋 Headers da resposta:', JSON.stringify([...response.headers.entries()], null, 2));

    const data = await response.json();
    console.log('📄 Dados da resposta:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Token obtido com sucesso');
      res.json(data);
    } else {
      console.log('❌ Erro ao obter token');
      res.status(response.status).json({ 
        error: 'Failed to get access token', 
        details: data 
      });
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint de token:');
    console.error('📋 Detalhes do erro:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
  console.log('🔚 === FIM ENDPOINT TOKEN ===\n');
});

// Get ORCID Profile
app.get('/api/orcid/profile/:orcid', async (req, res) => {
  console.log('\n👤 === ENDPOINT: GET PROFILE ===');
  console.log('📥 Parâmetros:', req.params);
  console.log('📋 Query params:', req.query);
  
  try {
    const { orcid } = req.params;
    const authHeader = req.headers.authorization;

    console.log('🔍 ORCID extraído:', orcid);
    console.log('🔑 Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUSENTE');

    if (!authHeader) {
      console.log('❌ Validação falhou: Authorization header ausente');
      return res.status(401).json({ 
        error: 'Authorization header is required' 
      });
    }

    // Validate ORCID format (basic validation)
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    console.log('🔍 Validando formato do ORCID...');
    console.log('📋 Regex:', orcidRegex.toString());
    console.log('✅ ORCID válido:', orcidRegex.test(orcid));
    
    if (!orcidRegex.test(orcid)) {
      console.log('❌ Validação falhou: formato do ORCID inválido');
      return res.status(400).json({ 
        error: 'Invalid ORCID format. Expected format: 0000-0000-0000-0000' 
      });
    }

    const profileUrl = `https://pub.sandbox.orcid.org/v3.0/${orcid}/record`;
    console.log('🔗 URL do perfil:', profileUrl);
    
    console.log('📤 Enviando requisição para ORCID...');
    const response = await fetch(profileUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log('📥 Resposta recebida do ORCID:');
    console.log('📊 Status:', response.status, response.statusText);
    console.log('📋 Headers da resposta:', JSON.stringify([...response.headers.entries()], null, 2));

    const data = await response.json();
    console.log('📄 Tamanho dos dados recebidos:', JSON.stringify(data).length, 'caracteres');
    console.log('📋 Estrutura dos dados:', Object.keys(data));

    if (response.ok) {
      console.log('✅ Perfil obtido com sucesso');
      res.json(data);
    } else {
      console.log('❌ Erro ao obter perfil');
      res.status(response.status).json({ 
        error: 'Failed to fetch ORCID profile', 
        details: data 
      });
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint de perfil:');
    console.error('📋 Detalhes do erro:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
  console.log('🔚 === FIM ENDPOINT PROFILE ===\n');
});

// Get specific sections of ORCID profile
app.get('/api/orcid/profile/:orcid/:section', async (req, res) => {
  console.log('\n📂 === ENDPOINT: GET PROFILE SECTION ===');
  console.log('📥 Parâmetros:', req.params);
  
  try {
    const { orcid, section } = req.params;
    const authHeader = req.headers.authorization;

    console.log('🔍 Dados extraídos:', { orcid, section });
    console.log('🔑 Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUSENTE');

    if (!authHeader) {
      console.log('❌ Validação falhou: Authorization header ausente');
      return res.status(401).json({ 
        error: 'Authorization header is required' 
      });
    }

    // Validate ORCID format
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    console.log('🔍 Validando formato do ORCID...');
    if (!orcidRegex.test(orcid)) {
      console.log('❌ Validação falhou: formato do ORCID inválido');
      return res.status(400).json({ 
        error: 'Invalid ORCID format. Expected format: 0000-0000-0000-0000' 
      });
    }

    // Valid sections - incluindo works e fundings
    const validSections = ['works', 'employments', 'educations', 'fundings', 'peer-reviews', 'person'];
    console.log('📋 Seções válidas:', validSections);
    console.log('🔍 Seção solicitada:', section);
    console.log('✅ Seção válida:', validSections.includes(section));
    
    if (!validSections.includes(section)) {
      console.log('❌ Validação falhou: seção inválida');
      return res.status(400).json({ 
        error: 'Invalid section. Valid sections: ' + validSections.join(', ') 
      });
    }

    const profileUrl = `https://pub.sandbox.orcid.org/v3.0/${orcid}/${section}`;
    console.log('🔗 URL da seção:', profileUrl);
    
    console.log('📤 Enviando requisição para ORCID...');
    const response = await fetch(profileUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log('📥 Resposta recebida do ORCID:');
    console.log('📊 Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('📄 Tamanho dos dados recebidos:', JSON.stringify(data).length, 'caracteres');

    if (response.ok) {
      console.log('✅ Seção obtida com sucesso');
      res.json(data);
    } else {
      console.log('❌ Erro ao obter seção');
      res.status(response.status).json({ 
        error: `Failed to fetch ORCID ${section}`, 
        details: data 
      });
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint de seção:');
    console.error('📋 Detalhes do erro:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
  console.log('🔚 === FIM ENDPOINT SECTION ===\n');
});

// Get individual work details
app.get('/api/orcid/profile/:orcid/work/:putCode', async (req, res) => {
  console.log('\n📄 === ENDPOINT: GET WORK DETAILS ===');
  console.log('📥 Parâmetros:', req.params);
  
  try {
    const { orcid, putCode } = req.params;
    const authHeader = req.headers.authorization;

    console.log('🔍 Dados extraídos:', { orcid, putCode });
    console.log('🔑 Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUSENTE');

    if (!authHeader) {
      console.log('❌ Validação falhou: Authorization header ausente');
      return res.status(401).json({ 
        error: 'Authorization header is required' 
      });
    }

    // Validate ORCID format
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    console.log('🔍 Validando formato do ORCID...');
    if (!orcidRegex.test(orcid)) {
      console.log('❌ Validação falhou: formato do ORCID inválido');
      return res.status(400).json({ 
        error: 'Invalid ORCID format. Expected format: 0000-0000-0000-0000' 
      });
    }

    const workUrl = `https://pub.sandbox.orcid.org/v3.0/${orcid}/work/${putCode}`;
    console.log('🔗 URL do trabalho:', workUrl);
    
    console.log('📤 Enviando requisição para ORCID...');
    const response = await fetch(workUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log('📥 Resposta recebida do ORCID:');
    console.log('📊 Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('📄 Dados do trabalho recebidos');

    if (response.ok) {
      console.log('✅ Detalhes do trabalho obtidos com sucesso');
      res.json(data);
    } else {
      console.log('❌ Erro ao obter detalhes do trabalho');
      res.status(response.status).json({ 
        error: 'Failed to fetch work details', 
        details: data 
      });
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint de trabalho:');
    console.error('📋 Detalhes do erro:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
  console.log('🔚 === FIM ENDPOINT WORK ===\n');
});

// ========================
// NOVOS ENDPOINTS PARA FUNDING
// ========================

// Get ORCID fundings list
app.get('/api/orcid/profile/:orcid/fundings', async (req, res) => {
  console.log('\n💰 === ENDPOINT: GET FUNDINGS LIST ===');
  console.log('📥 Parâmetros:', req.params);
  
  try {
    const { orcid } = req.params;
    const authHeader = req.headers.authorization;

    console.log('🔍 ORCID extraído:', orcid);
    console.log('🔑 Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUSENTE');

    if (!authHeader) {
      console.log('❌ Validação falhou: Authorization header ausente');
      return res.status(401).json({ 
        error: 'Authorization header is required' 
      });
    }

    // Validate ORCID format
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    console.log('🔍 Validando formato do ORCID...');
    if (!orcidRegex.test(orcid)) {
      console.log('❌ Validação falhou: formato do ORCID inválido');
      return res.status(400).json({ 
        error: 'Invalid ORCID format. Expected format: 0000-0000-0000-0000' 
      });
    }

    const fundingsUrl = `https://pub.sandbox.orcid.org/v3.0/${orcid}/fundings`;
    console.log('🔗 URL dos fundings:', fundingsUrl);
    
    console.log('📤 Enviando requisição para ORCID...');
    const response = await fetch(fundingsUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log('📥 Resposta recebida do ORCID:');
    console.log('📊 Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('📄 Dados dos fundings recebidos');
    console.log('📊 Número de grupos de funding:', data.group?.length || 0);

    if (response.ok) {
      console.log('✅ Lista de fundings obtida com sucesso');
      res.json(data);
    } else {
      console.log('❌ Erro ao obter lista de fundings');
      res.status(response.status).json({ 
        error: 'Failed to fetch ORCID fundings', 
        details: data 
      });
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint de fundings:');
    console.error('📋 Detalhes do erro:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
  console.log('🔚 === FIM ENDPOINT FUNDINGS ===\n');
});

// Get individual funding details
app.get('/api/orcid/profile/:orcid/funding/:putCode', async (req, res) => {
  console.log('\n💼 === ENDPOINT: GET FUNDING DETAILS ===');
  console.log('📥 Parâmetros:', req.params);
  
  try {
    const { orcid, putCode } = req.params;
    const authHeader = req.headers.authorization;

    console.log('🔍 Dados extraídos:', { orcid, putCode });
    console.log('🔑 Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUSENTE');

    if (!authHeader) {
      console.log('❌ Validação falhou: Authorization header ausente');
      return res.status(401).json({ 
        error: 'Authorization header is required' 
      });
    }

    // Validate ORCID format
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    console.log('🔍 Validando formato do ORCID...');
    if (!orcidRegex.test(orcid)) {
      console.log('❌ Validação falhou: formato do ORCID inválido');
      return res.status(400).json({ 
        error: 'Invalid ORCID format. Expected format: 0000-0000-0000-0000' 
      });
    }

    const fundingUrl = `https://pub.sandbox.orcid.org/v3.0/${orcid}/funding/${putCode}`;
    console.log('🔗 URL do funding:', fundingUrl);
    
    console.log('📤 Enviando requisição para ORCID...');
    const response = await fetch(fundingUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log('📥 Resposta recebida do ORCID:');
    console.log('📊 Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('📄 Dados do funding recebidos');
    console.log('📋 Título do funding:', data.title?.title?.value || 'N/A');
    console.log('📋 Organização:', data.organization?.name || 'N/A');
    console.log('📋 Tipo:', data.type || 'N/A');

    if (response.ok) {
      console.log('✅ Detalhes do funding obtidos com sucesso');
      res.json(data);
    } else {
      console.log('❌ Erro ao obter detalhes do funding');
      res.status(response.status).json({ 
        error: 'Failed to fetch funding details', 
        details: data 
      });
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint de funding:');
    console.error('📋 Detalhes do erro:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
  console.log('🔚 === FIM ENDPOINT FUNDING ===\n');
});

// Search ORCID profiles
app.get('/api/orcid/search', async (req, res) => {
  console.log('\n🔍 === ENDPOINT: SEARCH PROFILES ===');
  console.log('📥 Query params:', req.query);
  
  try {
    const { q, start = 0, rows = 10 } = req.query;
    const authHeader = req.headers.authorization;

    console.log('🔍 Parâmetros de busca:', { q, start, rows });
    console.log('🔑 Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUSENTE');

    if (!q) {
      console.log('❌ Validação falhou: parâmetro "q" ausente');
      return res.status(400).json({ 
        error: 'Query parameter "q" is required' 
      });
    }

    if (!authHeader) {
      console.log('❌ Validação falhou: Authorization header ausente');
      return res.status(401).json({ 
        error: 'Authorization header is required' 
      });
    }

    const searchUrl = `https://pub.sandbox.orcid.org/v3.0/search?q=${encodeURIComponent(q)}&start=${start}&rows=${rows}`;
    console.log('🔗 URL de busca:', searchUrl);
    
    console.log('📤 Enviando requisição de busca para ORCID...');
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log('📥 Resposta da busca recebida do ORCID:');
    console.log('📊 Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('📄 Resultados da busca recebidos');
    console.log('📊 Número de resultados:', data['num-found'] || 'N/A');

    if (response.ok) {
      console.log('✅ Busca realizada com sucesso');
      res.json(data);
    } else {
      console.log('❌ Erro na busca');
      res.status(response.status).json({ 
        error: 'Failed to search ORCID profiles', 
        details: data 
      });
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint de busca:');
    console.error('📋 Detalhes do erro:', error);
    console.error('📚 Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
  console.log('🔚 === FIM ENDPOINT SEARCH ===\n');
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('💓 Health check solicitado');
  const healthData = { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  };
  console.log('📊 Dados de saúde:', healthData);
  res.json(healthData);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 MIDDLEWARE DE ERRO ATIVADO');
  console.error('📋 Erro capturado:', err);
  console.error('📚 Stack trace:', err.stack);
  console.error('📋 Request que causou o erro:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  
  res.status(500).json({ 
    error: 'Something broke!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Endpoint não encontrado');
  console.log('📋 Request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });
  
  res.status(404).json({ 
    error: 'Endpoint not found',
    requested: `${req.method} ${req.url}`,
    available_endpoints: {
      'GET /': 'API information',
      'POST /api/orcid/token': 'Get access token',
      'GET /api/orcid/profile/:orcid': 'Get ORCID profile',
      'GET /api/orcid/profile/:orcid/:section': 'Get specific profile section',
      'GET /api/orcid/profile/:orcid/work/:putCode': 'Get individual work',
      'GET /api/orcid/profile/:orcid/fundings': 'Get ORCID fundings list',
      'GET /api/orcid/profile/:orcid/funding/:putCode': 'Get individual funding',
      'GET /api/orcid/search': 'Search ORCID profiles',
      'GET /health': 'Health check'
    }
  });
});

// Start server
console.log('\n🚀 Inicializando servidor...');
app.listen(PORT, () => {
  console.log('🎉 SERVIDOR INICIADO COM SUCESSO!');
  console.log(`🚀 ORCID Proxy Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Access at: http://localhost:${PORT}`);
  console.log(`⏰ Servidor iniciado em: ${new Date().toISOString()}`);
  console.log(`💾 Uso de memória inicial:`, process.memoryUsage());
  console.log(`🆔 PID do processo: ${process.pid}`);
  console.log('\n📋 ENDPOINTS DISPONÍVEIS:');
  console.log('  🏠 GET  / - Informações da API');
  console.log('  🔑 POST /api/orcid/token - Obter token de acesso');
  console.log('  👤 GET  /api/orcid/profile/:orcid - Obter perfil ORCID completo');
  console.log('  📂 GET  /api/orcid/profile/:orcid/:section - Obter seção específica (works, fundings, etc.)');
  console.log('  📄 GET  /api/orcid/profile/:orcid/work/:putCode - Obter detalhes de trabalho individual');
  console.log('  💰 GET  /api/orcid/profile/:orcid/fundings - Obter lista de financiamentos');
  console.log('  💼 GET  /api/orcid/profile/:orcid/funding/:putCode - Obter detalhes de financiamento individual');
  console.log('  🔍 GET  /api/orcid/search - Buscar perfis ORCID');
  console.log('  💓 GET  /health - Health check do servidor');
  console.log('\n🎯 Servidor pronto para receber requisições!');
});