const express = require("express")
const cors = require("cors")
const fetch = require("node-fetch")
const { Client } = require("pg")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Configuração do banco de dados
const client = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "pgadmin",
  database: "meubanco",
})

// Conectar ao banco de dados
async function connectDB() {
  try {
    await client.connect()
    console.log("📦 Conectado ao PostgreSQL")
  } catch (error) {
    console.error("❌ Erro ao conectar ao PostgreSQL:", error)
  }
}

connectDB()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))

// Funções auxiliares para salvar dados no banco
async function salvarAreaPesquisa(area) {
  try {
    const query = `
      INSERT INTO AreasDePesquisa (area) 
      VALUES ($1) 
      ON CONFLICT (area) DO NOTHING 
      RETURNING id
    `
    const result = await client.query(query, [area])

    if (result.rows.length > 0) {
      return result.rows[0].id
    }

    // Se não inseriu (conflito), busca o ID existente
    const selectQuery = "SELECT id FROM AreasDePesquisa WHERE area = $1"
    const selectResult = await client.query(selectQuery, [area])
    return selectResult.rows[0].id
  } catch (error) {
    console.error("Erro ao salvar área de pesquisa:", error)
    return null
  }
}

async function salvarUsuarioNoBanco(dadosOrcid) {
  try {
    await client.query("BEGIN")

    const orcidId = dadosOrcid["orcid-identifier"].path
    const person = dadosOrcid.person || {}
    const name = person.name || {}
    const givenNames = name["given-names"]?.value || ""
    const familyName = name["family-name"]?.value || ""
    const nomeCompleto = `${givenNames} ${familyName}`.trim()

    const biografia = person.biography?.content || null
    const email = person.emails?.email?.[0]?.email || null

    // Extrair informações de emprego
    const employments = dadosOrcid["activities-summary"]?.employments?.["affiliation-group"]?.[0]?.summaries?.[0]
    const instituicao = employments?.organization?.name || null
    const departamento = employments?.["department-name"] || null
    const cargo = employments?.["role-title"] || null

    // Extrair links externos
    const researcherUrls = person["researcher-urls"]?.["researcher-url"] || []
    const linksExternos = researcherUrls.map((url) => url.url.value)

    // Inserir usuário
    const insertUserQuery = `
      INSERT INTO Usuarios (orcid_id, nome, instituicao, departamento, cargo, email, biografia, links_externos)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `

    const userResult = await client.query(insertUserQuery, [
      orcidId,
      nomeCompleto || null,
      instituicao,
      departamento,
      cargo,
      email,
      biografia,
      linksExternos.length > 0 ? linksExternos : null,
    ])

    const usuarioId = userResult.rows[0].id
    console.log(`✅ Usuário salvo no banco com ID: ${usuarioId}`)

    // Salvar áreas de pesquisa
    const keywords = person.keywords?.keyword || []
    for (const keyword of keywords) {
      const areaId = await salvarAreaPesquisa(keyword.content)
      if (areaId) {
        await client.query(
          "INSERT INTO AreasDePesquisaEUsuarios (area_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [areaId, usuarioId],
        )
      }
    }

    // Salvar trabalhos
    const works = dadosOrcid["activities-summary"]?.works?.group || []
    for (const workGroup of works) {
      const workSummary = workGroup["work-summary"]?.[0]
      if (workSummary) {
        const insertWorkQuery = `
          INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `

        const workResult = await client.query(insertWorkQuery, [
          workSummary.title?.title?.value || "Trabalho sem título",
          Number.parseInt(workSummary["publication-date"]?.year?.value) || new Date().getFullYear(),
          workSummary.type || "journal-article",
          workSummary["journal-title"]?.value || null,
        ])

        const trabalhoId = workResult.rows[0].id

        // Associar trabalho ao usuário
        await client.query("INSERT INTO UsuariosETrabalhos (usuario_id, trabalho_id) VALUES ($1, $2)", [
          usuarioId,
          trabalhoId,
        ])
      }
    }

    // Salvar projetos/financiamentos
    const fundings = dadosOrcid["activities-summary"]?.fundings?.group || []
    for (const fundingGroup of fundings) {
      const fundingSummary = fundingGroup["funding-summary"]?.[0]
      if (fundingSummary) {
        const insertProjectQuery = `
          INSERT INTO Projetos (nome, ano_inicio, ano_termino, agencia_de_financiamento, financiamento)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `

        const projectResult = await client.query(insertProjectQuery, [
          fundingSummary.title?.title?.value || "Projeto sem título",
          Number.parseInt(fundingSummary["start-date"]?.year?.value) || new Date().getFullYear(),
          fundingSummary["end-date"]?.year?.value ? Number.parseInt(fundingSummary["end-date"].year.value) : null,
          fundingSummary.organization?.name || null,
          fundingSummary.amount?.value || null,
        ])

        const projetoId = projectResult.rows[0].id

        // Associar projeto ao usuário
        await client.query("INSERT INTO UsuariosEProjetos (usuario_id, projeto_id) VALUES ($1, $2)", [
          usuarioId,
          projetoId,
        ])
      }
    }

    await client.query("COMMIT")
    console.log(`✅ Dados completos do usuário ${orcidId} salvos no banco`)
    return usuarioId
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Erro ao salvar usuário no banco:", error)
    return null
  }
}

async function salvarTrabalhoDetalhado(usuarioId, dadosTrabalho, putCode) {
  try {
    const insertWorkQuery = `
      INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte, resumo, tipo_identificador, valor_identificador, links_adicionais)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
      RETURNING id
    `

    const externalId = dadosTrabalho["external-ids"]?.["external-id"]?.[0]

    const workResult = await client.query(insertWorkQuery, [
      dadosTrabalho.title?.title?.value || "Trabalho sem título",
      Number.parseInt(dadosTrabalho["publication-date"]?.year?.value) || new Date().getFullYear(),
      dadosTrabalho.type || "journal-article",
      dadosTrabalho["journal-title"]?.value || null,
      dadosTrabalho["short-description"] || null,
      externalId?.["external-id-type"] || null,
      externalId?.["external-id-value"] || null,
      null, // links_adicionais será preenchido quando necessário
    ])

    if (workResult.rows.length > 0) {
      const trabalhoId = workResult.rows[0].id

      // Associar trabalho ao usuário
      await client.query(
        "INSERT INTO UsuariosETrabalhos (usuario_id, trabalho_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [usuarioId, trabalhoId],
      )

      console.log(`✅ Trabalho detalhado ${putCode} salvo no banco`)
      return trabalhoId
    }

    return null
  } catch (error) {
    console.error("Erro ao salvar trabalho detalhado:", error)
    return null
  }
}

async function salvarProjetoDetalhado(usuarioId, dadosProjeto, putCode) {
  try {
    const insertProjectQuery = `
      INSERT INTO Projetos (nome, ano_inicio, ano_termino, agencia_de_financiamento, descricao, financiamento)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
      RETURNING id
    `

    const projectResult = await client.query(insertProjectQuery, [
      dadosProjeto.title?.title?.value || "Projeto sem título",
      Number.parseInt(dadosProjeto["start-date"]?.year?.value) || new Date().getFullYear(),
      dadosProjeto["end-date"]?.year?.value ? Number.parseInt(dadosProjeto["end-date"].year.value) : null,
      dadosProjeto.organization?.name || null,
      dadosProjeto["short-description"] || null,
      dadosProjeto.amount?.value || null,
    ])

    if (projectResult.rows.length > 0) {
      const projetoId = projectResult.rows[0].id

      // Associar projeto ao usuário
      await client.query(
        "INSERT INTO UsuariosEProjetos (usuario_id, projeto_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [usuarioId, projetoId],
      )

      console.log(`✅ Projeto detalhado ${putCode} salvo no banco`)
      return projetoId
    }

    return null
  } catch (error) {
    console.error("Erro ao salvar projeto detalhado:", error)
    return null
  }
}

// Funções auxiliares para buscar dados no banco
async function buscarUsuarioNoBanco(orcidId) {
  try {
    const queryUsuario = `
      SELECT 
        u.*,
        array_agg(DISTINCT a.area) FILTER (WHERE a.area IS NOT NULL) as areas_pesquisa
      FROM Usuarios u
      LEFT JOIN AreasDePesquisaEUsuarios apu ON u.id = apu.usuario_id
      LEFT JOIN AreasDePesquisa a ON apu.area_id = a.id
      WHERE u.orcid_id = $1
      GROUP BY u.id
    `

    const resultUsuario = await client.query(queryUsuario, [orcidId])

    if (resultUsuario.rows.length === 0) {
      return null
    }

    const usuario = resultUsuario.rows[0]

    // Buscar trabalhos do usuário
    const queryTrabalhos = `
      SELECT t.* 
      FROM Trabalhos t
      JOIN UsuariosETrabalhos ut ON t.id = ut.trabalho_id
      WHERE ut.usuario_id = $1
      ORDER BY t.ano DESC
    `

    const resultTrabalhos = await client.query(queryTrabalhos, [usuario.id])

    // Buscar projetos do usuário
    const queryProjetos = `
      SELECT p.* 
      FROM Projetos p
      JOIN UsuariosEProjetos up ON p.id = up.projeto_id
      WHERE up.usuario_id = $1
      ORDER BY p.ano_inicio DESC
    `

    const resultProjetos = await client.query(queryProjetos, [usuario.id])

    // Montar resposta no formato ORCID
    const response = {
      "orcid-identifier": {
        uri: `https://orcid.org/${orcidId}`,
        path: orcidId,
        host: "orcid.org",
      },
      person: {
        name: {
          "given-names": { value: usuario.nome ? usuario.nome.split(" ")[0] : "" },
          "family-name": { value: usuario.nome ? usuario.nome.split(" ").slice(1).join(" ") : "" },
        },
        biography: { content: usuario.biografia || "" },
        emails: usuario.email ? { email: [{ email: usuario.email }] } : null,
        keywords: usuario.areas_pesquisa
          ? {
              keyword: usuario.areas_pesquisa.filter((area) => area).map((area) => ({ content: area })),
            }
          : null,
        "researcher-urls": usuario.links_externos
          ? {
              "researcher-url": usuario.links_externos.map((link, index) => ({
                "url-name": `Link ${index + 1}`,
                url: { value: link },
              })),
            }
          : null,
      },
      "activities-summary": {
        employments: usuario.instituicao
          ? {
              "affiliation-group": [
                {
                  summaries: [
                    {
                      organization: { name: usuario.instituicao },
                      "department-name": usuario.departamento || "",
                      "role-title": usuario.cargo || "",
                    },
                  ],
                },
              ],
            }
          : null,
        works: {
          group: resultTrabalhos.rows.map((trabalho) => ({
            "work-summary": [
              {
                "put-code": trabalho.id,
                title: { title: { value: trabalho.nome } },
                "publication-date": { year: { value: trabalho.ano.toString() } },
                type: trabalho.tipo_de_trabalho,
                "journal-title": { value: trabalho.fonte || "" },
              },
            ],
          })),
        },
        fundings: {
          group: resultProjetos.rows.map((projeto) => ({
            "funding-summary": [
              {
                "put-code": projeto.id,
                title: { title: { value: projeto.nome } },
                "start-date": { year: { value: projeto.ano_inicio.toString() } },
                "end-date": projeto.ano_termino ? { year: { value: projeto.ano_termino.toString() } } : null,
                type: "grant",
                organization: { name: projeto.agencia_de_financiamento || "N/A" },
                amount: projeto.financiamento ? { value: projeto.financiamento } : null,
              },
            ],
          })),
        },
      },
      _source: "database", // Flag para identificar que veio do banco
    }

    return response
  } catch (error) {
    console.error("Erro ao buscar usuário no banco:", error)
    return null
  }
}

async function buscarTrabalhoNoBanco(usuarioId, putCode) {
  try {
    const query = `
      SELECT t.* 
      FROM Trabalhos t
      JOIN UsuariosETrabalhos ut ON t.id = ut.trabalho_id
      WHERE ut.usuario_id = $1 AND t.id = $2
    `

    const result = await client.query(query, [usuarioId, putCode])

    if (result.rows.length === 0) {
      return null
    }

    const trabalho = result.rows[0]

    return {
      "put-code": trabalho.id,
      title: { title: { value: trabalho.nome } },
      "publication-date": { year: { value: trabalho.ano.toString() } },
      type: trabalho.tipo_de_trabalho,
      "journal-title": { value: trabalho.fonte || "" },
      "short-description": trabalho.resumo || "",
      "external-ids":
        trabalho.tipo_identificador && trabalho.valor_identificador
          ? {
              "external-id": [
                {
                  "external-id-type": trabalho.tipo_identificador,
                  "external-id-value": trabalho.valor_identificador,
                },
              ],
            }
          : null,
      contributors: {
        contributor: [
          {
            "credit-name": { value: "Autor Principal" },
            "contributor-orcid": null,
          },
        ],
      },
      _source: "database",
    }
  } catch (error) {
    console.error("Erro ao buscar trabalho no banco:", error)
    return null
  }
}

async function buscarProjetoNoBanco(usuarioId, putCode) {
  try {
    const query = `
      SELECT p.* 
      FROM Projetos p
      JOIN UsuariosEProjetos up ON p.id = up.projeto_id
      WHERE up.usuario_id = $1 AND p.id = $2
    `

    const result = await client.query(query, [usuarioId, putCode])

    if (result.rows.length === 0) {
      return null
    }

    const projeto = result.rows[0]

    return {
      "put-code": projeto.id,
      title: { title: { value: projeto.nome } },
      "short-description": projeto.descricao || "",
      "start-date": { year: { value: projeto.ano_inicio.toString() } },
      "end-date": projeto.ano_termino ? { year: { value: projeto.ano_termino.toString() } } : null,
      type: "grant",
      organization: {
        name: projeto.agencia_de_financiamento || "N/A",
        address: { city: "", country: "" },
      },
      amount: projeto.financiamento
        ? {
            value: projeto.financiamento,
            "currency-code": "BRL",
          }
        : null,
      "external-ids": null,
      _source: "database",
    }
  } catch (error) {
    console.error("Erro ao buscar projeto no banco:", error)
    return null
  }
}

async function obterUsuarioIdPorOrcid(orcidId) {
  try {
    console.log(`🔍 Buscando usuário com ORCID: ${orcidId}`)

    const query = "SELECT id, orcid_id FROM Usuarios WHERE orcid_id = $1"
    const result = await client.query(query, [orcidId])

    console.log(`📊 Resultado da busca:`, result.rows)

    if (result.rows.length > 0) {
      console.log(`✅ Usuário encontrado com ID: ${result.rows[0].id}`)
      return result.rows[0].id
    } else {
      console.log(`❌ Nenhum usuário encontrado com ORCID: ${orcidId}`)

      // Vamos listar todos os usuários para debug
      const allUsers = await client.query("SELECT id, orcid_id, nome FROM Usuarios")
      console.log(`📋 Todos os usuários no banco:`, allUsers.rows)

      return null
    }
  } catch (error) {
    console.error("❌ Erro ao obter ID do usuário:", error)
    return null
  }
}

// Rotas

app.get("/", (req, res) => {
  res.json({
    message: "ORCID Proxy Server is running!",
    endpoints: {
      "/api/orcid/token": "POST - Get access token",
      "/api/orcid/search": "GET - Search ORCID profiles (public, no auth required)",
      "/api/orcid/profile/:orcid": "GET - Get ORCID profile (auth optional)",
      "/api/orcid/profile/:orcid/works": "GET - Get ORCID works (auth optional)",
      "/api/orcid/profile/:orcid/work/:putCode": "GET - Get individual work (auth optional)",
      "/api/orcid/profile/:orcid/fundings": "GET - Get ORCID fundings (auth optional)",
      "/api/orcid/profile/:orcid/funding/:putCode": "GET - Get individual funding (auth optional)",
      "/api/profile/:orcid": "GET/PUT - Get/Update user profile in database",
      "/api/project/:orcid": "POST - Create new project",
      "/api/project/:orcid/:projectId": "PUT/DELETE - Update/Delete project",
      "/api/projects/:orcid": "GET - List user projects",
      "/api/publication/:orcid": "POST - Create new publication",
      "/api/publication/:orcid/:publicationId": "PUT/DELETE - Update/Delete publication",
      "/api/publications/:orcid": "GET - List user publications",
    },
    note: "Authorization header is optional for profile endpoints. Public data will be returned without auth. With auth, data is fetched from local database first, then from ORCID and saved locally if not found.",
  })
})

// ENDPOINTS PARA GERENCIAMENTO DE PERFIL

// Endpoint para salvar/atualizar perfil do usuário
app.put("/api/profile/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const { name, institution, department, role, email, bio, institutionalPage, researchAreas, externalLinks } =
      req.body

    // Validações básicas
    if (!name || !institution) {
      return res.status(400).json({
        error: "Nome e instituição são obrigatórios",
      })
    }

    // Validar email se fornecido
    if (email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return res.status(400).json({
        error: "Formato de email inválido",
      })
    }

    // Validar links externos
    if (externalLinks && Array.isArray(externalLinks)) {
      for (const link of externalLinks) {
        try {
          new URL(link.url)
        } catch {
          return res.status(400).json({
            error: `URL inválida: ${link.url}`,
          })
        }
      }
    }

    await client.query("BEGIN")

    try {
      // Verificar se o usuário já existe
      const userExistsQuery = "SELECT id FROM Usuarios WHERE orcid_id = $1"
      const userExistsResult = await client.query(userExistsQuery, [orcid])

      let usuarioId

      if (userExistsResult.rows.length > 0) {
        // Atualizar usuário existente
        usuarioId = userExistsResult.rows[0].id

        const updateUserQuery = `
          UPDATE Usuarios 
          SET nome = $1, instituicao = $2, departamento = $3, cargo = $4, 
              email = $5, biografia = $6, pagina_institucional = $7,
              links_externos = $8
          WHERE orcid_id = $9
        `

        const linksExternosArray = externalLinks ? externalLinks.map((link) => link.url) : null

        await client.query(updateUserQuery, [
          name,
          institution,
          department || null,
          role || null,
          email || null,
          bio || null,
          institutionalPage || null,
          linksExternosArray,
          orcid,
        ])

        console.log(`✅ Usuário ${orcid} atualizado no banco`)
      } else {
        // Criar novo usuário
        const insertUserQuery = `
          INSERT INTO Usuarios (orcid_id, nome, instituicao, departamento, cargo, email, biografia, pagina_institucional, links_externos)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `

        const linksExternosArray = externalLinks ? externalLinks.map((link) => link.url) : null

        const userResult = await client.query(insertUserQuery, [
          orcid,
          name,
          institution,
          department || null,
          role || null,
          email || null,
          bio || null,
          institutionalPage || null,
          linksExternosArray,
        ])

        usuarioId = userResult.rows[0].id
        console.log(`✅ Novo usuário ${orcid} criado no banco com ID: ${usuarioId}`)
      }

      // Atualizar áreas de pesquisa
      if (researchAreas && Array.isArray(researchAreas)) {
        // Remover áreas existentes
        await client.query("DELETE FROM AreasDePesquisaEUsuarios WHERE usuario_id = $1", [usuarioId])

        // Adicionar novas áreas
        for (const area of researchAreas) {
          if (area.trim()) {
            const areaId = await salvarAreaPesquisa(area.trim())
            if (areaId) {
              await client.query("INSERT INTO AreasDePesquisaEUsuarios (area_id, usuario_id) VALUES ($1, $2)", [
                areaId,
                usuarioId,
              ])
            }
          }
        }
      }

      await client.query("COMMIT")

      // Buscar dados atualizados para retornar
      const dadosAtualizados = await buscarUsuarioNoBanco(orcid)

      res.json({
        success: true,
        message: "Perfil atualizado com sucesso",
        data: dadosAtualizados,
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Erro ao salvar perfil:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para obter perfil do usuário (GET)
app.get("/api/profile/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const dadosUsuario = await buscarUsuarioNoBanco(orcid)

    if (!dadosUsuario) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      })
    }

    res.json({
      success: true,
      data: dadosUsuario,
    })
  } catch (error) {
    console.error("Erro ao buscar perfil:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// ENDPOINTS PARA GERENCIAMENTO DE PROJETOS

// Endpoint para criar novo projeto
app.post("/api/project/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    console.log(`🆕 Criando novo projeto para ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const { name, startYear, endYear, fundingAgency, funding, role, description } = req.body

    // Validações básicas
    if (!name || !startYear) {
      return res.status(400).json({
        error: "Nome do projeto e ano de início são obrigatórios",
      })
    }

    // Validar anos
    const currentYear = new Date().getFullYear()
    if (startYear < 1900 || startYear > currentYear + 10) {
      return res.status(400).json({
        error: "Ano de início inválido",
      })
    }

    if (endYear && (endYear < startYear || endYear > currentYear + 10)) {
      return res.status(400).json({
        error: "Ano de término inválido",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se o usuário existe
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        return res.status(404).json({
          error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
        })
      }

      // Criar novo projeto
      const insertProjectQuery = `
        INSERT INTO Projetos (nome, ano_inicio, ano_termino, agencia_de_financiamento, financiamento, funcao_no_projeto, descricao)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `

      const projectResult = await client.query(insertProjectQuery, [
        name,
        Number.parseInt(startYear),
        endYear ? Number.parseInt(endYear) : null,
        fundingAgency || null,
        funding || null,
        role || null,
        description || null,
      ])

      const projetoId = projectResult.rows[0].id

      // Associar projeto ao usuário
      await client.query("INSERT INTO UsuariosEProjetos (usuario_id, projeto_id) VALUES ($1, $2)", [
        usuarioId,
        projetoId,
      ])

      await client.query("COMMIT")

      // Buscar projeto criado
      const newProject = await buscarProjetoNoBanco(usuarioId, projetoId)

      res.json({
        success: true,
        message: "Projeto criado com sucesso",
        data: newProject,
      })

      console.log(`✅ Novo projeto ${projetoId} criado para usuário ${orcid}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Erro ao criar projeto:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para salvar/atualizar projeto específico
app.put("/api/project/:orcid/:projectId", async (req, res) => {
  try {
    const { orcid, projectId } = req.params
    const authHeader = req.headers.authorization

    console.log(`🔧 Tentando atualizar projeto ${projectId} para ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      console.log(`❌ Formato ORCID inválido: ${orcid}`)
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const { name, startYear, endYear, fundingAgency, funding, role, description } = req.body

    // Validações básicas
    if (!name || !startYear) {
      return res.status(400).json({
        error: "Nome do projeto e ano de início são obrigatórios",
      })
    }

    // Validar anos
    const currentYear = new Date().getFullYear()
    if (startYear < 1900 || startYear > currentYear + 10) {
      return res.status(400).json({
        error: "Ano de início inválido",
      })
    }

    if (endYear && (endYear < startYear || endYear > currentYear + 10)) {
      return res.status(400).json({
        error: "Ano de término inválido",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se o usuário existe com logs detalhados
      console.log(`🔍 Procurando usuário com ORCID: ${orcid}`)
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        console.log(`❌ Usuário não encontrado para ORCID: ${orcid}`)

        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
          debug: {
            searchedOrcid: orcid,
            message: "Verifique se o ORCID está correto e se o usuário existe no banco de dados",
          },
        })
      }

      console.log(`✅ Usuário encontrado com ID: ${usuarioId}`)

      // Verificar se o projeto existe e pertence ao usuário
      const checkProjectQuery = `
        SELECT p.id, p.nome
        FROM Projetos p
        JOIN UsuariosEProjetos up ON p.id = up.projeto_id
        WHERE p.id = $1 AND up.usuario_id = $2
      `

      console.log(`🔍 Verificando projeto ${projectId} para usuário ${usuarioId}`)
      const projectExists = await client.query(checkProjectQuery, [projectId, usuarioId])

      if (projectExists.rows.length === 0) {
        console.log(`❌ Projeto ${projectId} não encontrado para usuário ${usuarioId}`)

        // Debug: listar todos os projetos do usuário
        const userProjects = await client.query(
          `
          SELECT p.id, p.nome 
          FROM Projetos p
          JOIN UsuariosEProjetos up ON p.id = up.projeto_id
          WHERE up.usuario_id = $1
        `,
          [usuarioId],
        )

        console.log(`📋 Projetos do usuário ${usuarioId}:`, userProjects.rows)

        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Projeto não encontrado ou não pertence ao usuário",
          debug: {
            projectId: projectId,
            userId: usuarioId,
            userProjects: userProjects.rows,
          },
        })
      }

      console.log(`✅ Projeto encontrado: ${projectExists.rows[0].nome}`)

      // Atualizar projeto
      const updateProjectQuery = `
        UPDATE Projetos 
        SET nome = $1, ano_inicio = $2, ano_termino = $3, 
            agencia_de_financiamento = $4, financiamento = $5, funcao_no_projeto = $6, descricao = $7
        WHERE id = $8
      `

      await client.query(updateProjectQuery, [
        name,
        Number.parseInt(startYear),
        endYear ? Number.parseInt(endYear) : null,
        fundingAgency || null,
        funding || null,
        role || null,
        description || null,
        projectId,
      ])

      await client.query("COMMIT")

      // Buscar projeto atualizado
      const updatedProject = await buscarProjetoNoBanco(usuarioId, projectId)

      res.json({
        success: true,
        message: "Projeto atualizado com sucesso",
        data: updatedProject,
      })

      console.log(`✅ Projeto ${projectId} atualizado para usuário ${orcid}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("❌ Erro ao atualizar projeto:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para deletar projeto
app.delete("/api/project/:orcid/:projectId", async (req, res) => {
  try {
    const { orcid, projectId } = req.params
    const authHeader = req.headers.authorization

    console.log(`🗑️ Tentando deletar projeto ${projectId} para ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se o usuário existe
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        return res.status(404).json({
          error: "Usuário não encontrado",
        })
      }

      // Verificar se o projeto existe e pertence ao usuário
      const checkProjectQuery = `
        SELECT p.id, p.nome
        FROM Projetos p
        JOIN UsuariosEProjetos up ON p.id = up.projeto_id
        WHERE p.id = $1 AND up.usuario_id = $2
      `

      const projectExists = await client.query(checkProjectQuery, [projectId, usuarioId])

      if (projectExists.rows.length === 0) {
        return res.status(404).json({
          error: "Projeto não encontrado ou não pertence ao usuário",
        })
      }

      // Remover associação usuário-projeto
      await client.query("DELETE FROM UsuariosEProjetos WHERE usuario_id = $1 AND projeto_id = $2", [
        usuarioId,
        projectId,
      ])

      // Verificar se o projeto tem outras associações
      const otherAssociations = await client.query(
        "SELECT COUNT(*) as count FROM UsuariosEProjetos WHERE projeto_id = $1",
        [projectId],
      )

      // Se não tem outras associações, deletar o projeto
      if (Number.parseInt(otherAssociations.rows[0].count) === 0) {
        await client.query("DELETE FROM Projetos WHERE id = $1", [projectId])
      }

      await client.query("COMMIT")

      res.json({
        success: true,
        message: "Projeto removido com sucesso",
      })

      console.log(`✅ Projeto ${projectId} removido para usuário ${orcid}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Erro ao deletar projeto:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para listar projetos do usuário
app.get("/api/projects/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Verificar se o usuário existe
    const usuarioId = await obterUsuarioIdPorOrcid(orcid)

    if (!usuarioId) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      })
    }

    // Buscar projetos do usuário
    const queryProjetos = `
      SELECT p.* 
      FROM Projetos p
      JOIN UsuariosEProjetos up ON p.id = up.projeto_id
      WHERE up.usuario_id = $1
      ORDER BY p.ano_inicio DESC
    `

    const resultProjetos = await client.query(queryProjetos, [usuarioId])

    const projects = resultProjetos.rows.map((projeto) => ({
      id: projeto.id.toString(),
      name: projeto.nome,
      startYear: projeto.ano_inicio,
      endYear: projeto.ano_termino,
      fundingAgency: projeto.agencia_de_financiamento,
      funding: projeto.financiamento,
      role: projeto.funcao_no_projeto,
      description: projeto.descricao,
    }))

    res.json({
      success: true,
      data: projects,
    })
  } catch (error) {
    console.error("Erro ao buscar projetos:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// ENDPOINTS PARA GERENCIAMENTO DE PUBLICAÇÕES

// Endpoint para criar nova publicação
app.post("/api/publication/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    console.log(`🆕 Criando nova publicação para ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const { title, year, type, source, abstract, identifier, authors, links } = req.body

    // Validações básicas
    if (!title || !year || !type) {
      return res.status(400).json({
        error: "Título, ano e tipo são obrigatórios",
      })
    }

    if (!authors || authors.length === 0 || !authors[0].name) {
      return res.status(400).json({
        error: "Pelo menos um autor é obrigatório",
      })
    }

    // Validar ano
    const currentYear = new Date().getFullYear()
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        error: "Ano inválido",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se o usuário existe
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        return res.status(404).json({
          error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
        })
      }

      // Criar nova publicação
      const insertPublicationQuery = `
        INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte, resumo, tipo_identificador, valor_identificador, links_adicionais)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `

      const linksArray = links && Array.isArray(links) ? links.map((link) => link.url) : null

      const publicationResult = await client.query(insertPublicationQuery, [
        title,
        Number.parseInt(year),
        type,
        source || null,
        abstract || null,
        identifier?.type || null,
        identifier?.value || null,
        linksArray,
      ])

      const publicationId = publicationResult.rows[0].id

      // Associar publicação ao usuário
      await client.query("INSERT INTO UsuariosETrabalhos (usuario_id, trabalho_id) VALUES ($1, $2)", [
        usuarioId,
        publicationId,
      ])

      await client.query("COMMIT")

      // Buscar publicação criada
      const newPublication = await buscarTrabalhoNoBanco(usuarioId, publicationId)

      res.json({
        success: true,
        message: "Publicação criada com sucesso",
        data: newPublication,
      })

      console.log(`✅ Nova publicação ${publicationId} criada para usuário ${orcid}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Erro ao criar publicação:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para salvar/atualizar publicação específica
app.put("/api/publication/:orcid/:publicationId", async (req, res) => {
  try {
    const { orcid, publicationId } = req.params
    const authHeader = req.headers.authorization

    console.log(`🔧 Tentando atualizar publicação ${publicationId} para ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      console.log(`❌ Formato ORCID inválido: ${orcid}`)
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const { title, year, type, source, abstract, identifier, authors, links } = req.body

    // Validações básicas
    if (!title || !year || !type) {
      return res.status(400).json({
        error: "Título, ano e tipo são obrigatórios",
      })
    }

    // Validar ano
    const currentYear = new Date().getFullYear()
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        error: "Ano inválido",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se o usuário existe
      console.log(`🔍 Procurando usuário com ORCID: ${orcid}`)
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        console.log(`❌ Usuário não encontrado para ORCID: ${orcid}`)
        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
        })
      }

      console.log(`✅ Usuário encontrado com ID: ${usuarioId}`)

      // Verificar se a publicação existe e pertence ao usuário
      const checkPublicationQuery = `
        SELECT t.id, t.nome
        FROM Trabalhos t
        JOIN UsuariosETrabalhos ut ON t.id = ut.trabalho_id
        WHERE t.id = $1 AND ut.usuario_id = $2
      `

      console.log(`🔍 Verificando publicação ${publicationId} para usuário ${usuarioId}`)
      const publicationExists = await client.query(checkPublicationQuery, [publicationId, usuarioId])

      if (publicationExists.rows.length === 0) {
        console.log(`❌ Publicação ${publicationId} não encontrada para usuário ${usuarioId}`)
        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Publicação não encontrada ou não pertence ao usuário",
        })
      }

      console.log(`✅ Publicação encontrada: ${publicationExists.rows[0].nome}`)

      // Atualizar publicação
      const updatePublicationQuery = `
        UPDATE Trabalhos 
        SET nome = $1, ano = $2, tipo_de_trabalho = $3, fonte = $4, 
            resumo = $5, tipo_identificador = $6, valor_identificador = $7,
            links_adicionais = $8
        WHERE id = $9
      `

      const linksArray = links && Array.isArray(links) ? links.map((link) => link.url) : null

      await client.query(updatePublicationQuery, [
        title,
        Number.parseInt(year),
        type,
        source || null,
        abstract || null,
        identifier?.type || null,
        identifier?.value || null,
        linksArray,
        publicationId,
      ])

      await client.query("COMMIT")

      // Buscar publicação atualizada
      const updatedPublication = await buscarTrabalhoNoBanco(usuarioId, publicationId)

      res.json({
        success: true,
        message: "Publicação atualizada com sucesso",
        data: updatedPublication,
      })

      console.log(`✅ Publicação ${publicationId} atualizada para usuário ${orcid}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("❌ Erro ao atualizar publicação:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para deletar publicação
app.delete("/api/publication/:orcid/:publicationId", async (req, res) => {
  try {
    const { orcid, publicationId } = req.params
    const authHeader = req.headers.authorization

    console.log(`🗑️ Tentando deletar publicação ${publicationId} para ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se o usuário existe
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        return res.status(404).json({
          error: "Usuário não encontrado",
        })
      }

      // Verificar se a publicação existe e pertence ao usuário
      const checkPublicationQuery = `
        SELECT t.id, t.nome
        FROM Trabalhos t
        JOIN UsuariosETrabalhos ut ON t.id = ut.trabalho_id
        WHERE t.id = $1 AND ut.usuario_id = $2
      `

      const publicationExists = await client.query(checkPublicationQuery, [publicationId, usuarioId])

      if (publicationExists.rows.length === 0) {
        return res.status(404).json({
          error: "Publicação não encontrada ou não pertence ao usuário",
        })
      }

      // Remover associação usuário-publicação
      await client.query("DELETE FROM UsuariosETrabalhos WHERE usuario_id = $1 AND trabalho_id = $2", [
        usuarioId,
        publicationId,
      ])

      // Verificar se a publicação tem outras associações
      const otherAssociations = await client.query(
        "SELECT COUNT(*) as count FROM UsuariosETrabalhos WHERE trabalho_id = $1",
        [publicationId],
      )

      // Se não tem outras associações, deletar a publicação
      if (Number.parseInt(otherAssociations.rows[0].count) === 0) {
        await client.query("DELETE FROM Trabalhos WHERE id = $1", [publicationId])
      }

      await client.query("COMMIT")

      res.json({
        success: true,
        message: "Publicação removida com sucesso",
      })

      console.log(`✅ Publicação ${publicationId} removida para usuário ${orcid}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Erro ao deletar publicação:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para listar publicações do usuário
app.get("/api/publications/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Verificar se o usuário existe
    const usuarioId = await obterUsuarioIdPorOrcid(orcid)

    if (!usuarioId) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      })
    }

    // Buscar publicações do usuário
    const queryPublicacoes = `
      SELECT t.* 
      FROM Trabalhos t
      JOIN UsuariosETrabalhos ut ON t.id = ut.trabalho_id
      WHERE ut.usuario_id = $1
      ORDER BY t.ano DESC
    `

    const resultPublicacoes = await client.query(queryPublicacoes, [usuarioId])

    const publications = resultPublicacoes.rows.map((trabalho) => ({
      id: trabalho.id.toString(),
      title: trabalho.nome,
      year: trabalho.ano,
      type: trabalho.tipo_de_trabalho,
      source: trabalho.fonte || "",
      abstract: trabalho.resumo || "",
      identifier: {
        type: trabalho.tipo_identificador || "",
        value: trabalho.valor_identificador || "",
      },
      authors: [{ name: "Autor Principal", orcidId: "" }], // Simplificado
      links: trabalho.links_adicionais
        ? trabalho.links_adicionais.map((url, index) => ({
            name: `Link ${index + 1}`,
            url: url,
          }))
        : [],
    }))

    res.json({
      success: true,
      data: publications,
    })
  } catch (error) {
    console.error("Erro ao buscar publicações:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// ENDPOINTS ORCID ORIGINAIS (mantidos como estavam)

app.post("/api/orcid/token", async (req, res) => {
  try {
    const {
      client_id,
      client_secret,
      grant_type = "client_credentials",
      scope = "/read-public",
      code,
      redirect_uri,
    } = req.body

    if (!client_id || !client_secret) {
      return res.status(400).json({
        error: "client_id and client_secret are required",
      })
    }

    const tokenUrl = "https://orcid.org/oauth/token"

    const body = new URLSearchParams({
      client_id,
      client_secret,
      grant_type,
    })

    if (grant_type === "authorization_code") {
      if (!code || !redirect_uri) {
        return res.status(400).json({
          error: "code and redirect_uri are required for authorization_code grant",
        })
      }
      body.append("code", code)
      body.append("redirect_uri", redirect_uri)
    } else {
      body.append("scope", scope)
    }

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
    })

    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: "Failed to get access token",
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

app.get("/api/orcid/search", async (req, res) => {
  try {
    const { q, start = 0, rows = 10 } = req.query

    if (!q) {
      return res.status(400).json({
        error: 'Query parameter "q" is required',
      })
    }

    const searchUrl = `https://pub.orcid.org/v3.0/search?q=${encodeURIComponent(q)}&start=${start}&rows=${rows}`

    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ORCID-Proxy-Server/1.0",
      },
    })

    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: "Failed to search ORCID profiles",
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

app.get("/api/orcid/profile/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/

    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Se tem autenticação, busca primeiro no banco
    if (authHeader) {
      console.log(`🔍 Buscando perfil autenticado para ORCID: ${orcid}`)
      const dadosBanco = await buscarUsuarioNoBanco(orcid)

      if (dadosBanco) {
        console.log(`✅ Perfil encontrado no banco para ORCID: ${orcid}`)
        return res.json(dadosBanco)
      }

      console.log(`📡 Perfil não encontrado no banco, buscando no ORCID: ${orcid}`)

      // Busca no ORCID com autenticação
      const baseUrl = "https://pub.orcid.org"
      const profileUrl = `${baseUrl}/v3.0/${orcid}/record`

      const headers = {
        Accept: "application/json",
        Authorization: authHeader,
      }

      const response = await fetch(profileUrl, { headers })

      if (response.ok) {
        const data = await response.json()

        // Salvar dados no banco
        console.log(`💾 Salvando dados do ORCID ${orcid} no banco...`)
        const usuarioId = await salvarUsuarioNoBanco(data)

        if (usuarioId) {
          // Retornar dados salvos do banco para garantir consistência
          const dadosSalvos = await buscarUsuarioNoBanco(orcid)
          if (dadosSalvos) {
            return res.json(dadosSalvos)
          }
        }

        // Se falhou ao salvar, retorna dados do ORCID mesmo assim
        return res.json(data)
      } else {
        const errorData = await response.json()
        return res.status(response.status).json({
          error: "Failed to fetch ORCID profile",
          details: errorData,
        })
      }
    }

    // Busca pública no ORCID (sem autenticação)
    const baseUrl = "https://pub.orcid.org"
    const profileUrl = `${baseUrl}/v3.0/${orcid}/record`

    const headers = {
      Accept: "application/json",
    }

    const response = await fetch(profileUrl, { headers })
    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: "Failed to fetch ORCID profile",
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

app.get("/api/orcid/profile/:orcid/:section", async (req, res) => {
  try {
    const { orcid, section } = req.params
    const authHeader = req.headers.authorization

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const validSections = ["works", "employments", "educations", "fundings", "peer-reviews", "person"]

    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: "Invalid section. Valid sections: " + validSections.join(", "),
      })
    }

    // Se tem autenticação e é uma seção que temos no banco, busca primeiro no banco
    if (authHeader) {
      console.log(`🔍 Buscando seção autenticada '${section}' para ORCID: ${orcid}`)
      const dadosBanco = await buscarUsuarioNoBanco(orcid)

      if (dadosBanco && dadosBanco["activities-summary"]) {
        let secaoData = null

        if (section === "works" && dadosBanco["activities-summary"].works) {
          secaoData = dadosBanco["activities-summary"].works
        } else if (section === "fundings" && dadosBanco["activities-summary"].fundings) {
          secaoData = dadosBanco["activities-summary"].fundings
        } else if (section === "employments" && dadosBanco["activities-summary"].employments) {
          secaoData = dadosBanco["activities-summary"].employments
        } else if (section === "person" && dadosBanco.person) {
          secaoData = dadosBanco.person
        }

        if (secaoData) {
          console.log(`✅ Seção '${section}' encontrada no banco para ORCID: ${orcid}`)
          return res.json(secaoData)
        }
      }

      console.log(`📡 Seção '${section}' não encontrada no banco, buscando no ORCID: ${orcid}`)

      // Se não encontrou no banco, busca no ORCID e salva o usuário completo
      if (!dadosBanco) {
        // Buscar perfil completo primeiro para salvar
        const profileUrl = `https://pub.orcid.org/v3.0/${orcid}/record`
        const profileResponse = await fetch(profileUrl, {
          headers: {
            Accept: "application/json",
            Authorization: authHeader,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          await salvarUsuarioNoBanco(profileData)
        }
      }
    }

    // Busca no ORCID
    const baseUrl = "https://pub.orcid.org"
    const profileUrl = `${baseUrl}/v3.0/${orcid}/${section}`

    const headers = {
      Accept: "application/json",
    }

    if (authHeader) {
      headers["Authorization"] = authHeader
    }

    const response = await fetch(profileUrl, { headers })
    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: `Failed to fetch ORCID ${section}`,
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

app.get("/api/orcid/profile/:orcid/work/:putCode", async (req, res) => {
  try {
    const { orcid, putCode } = req.params
    const authHeader = req.headers.authorization

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Se tem autenticação, busca primeiro no banco
    if (authHeader) {
      console.log(`🔍 Buscando trabalho autenticado ${putCode} para ORCID: ${orcid}`)
      let usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (usuarioId) {
        const trabalhoBanco = await buscarTrabalhoNoBanco(usuarioId, putCode)

        if (trabalhoBanco) {
          console.log(`✅ Trabalho ${putCode} encontrado no banco`)
          return res.json(trabalhoBanco)
        }
      }

      console.log(`📡 Trabalho ${putCode} não encontrado no banco, buscando no ORCID`)

      // Busca no ORCID
      const baseUrl = "https://pub.orcid.org"
      const workUrl = `${baseUrl}/v3.0/${orcid}/work/${putCode}`

      const response = await fetch(workUrl, {
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
      })

      if (response.ok) {
        const data = await response.json()

        // Se não temos o usuário no banco, buscar e salvar primeiro
        if (!usuarioId) {
          const profileResponse = await fetch(`${baseUrl}/v3.0/${orcid}/record`, {
            headers: {
              Accept: "application/json",
              Authorization: authHeader,
            },
          })

          if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            usuarioId = await salvarUsuarioNoBanco(profileData)
          }
        }

        // Salvar trabalho detalhado
        if (usuarioId) {
          await salvarTrabalhoDetalhado(usuarioId, data, putCode)
        }

        return res.json(data)
      } else {
        const errorData = await response.json()
        return res.status(response.status).json({
          error: "Failed to fetch work details",
          details: errorData,
        })
      }
    }

    // Busca pública no ORCID
    const baseUrl = "https://pub.orcid.org"
    const workUrl = `${baseUrl}/v3.0/${orcid}/work/${putCode}`

    const response = await fetch(workUrl, {
      headers: {
        Accept: "application/json",
      },
    })

    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: "Failed to fetch work details",
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

app.get("/api/orcid/profile/:orcid/fundings", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Se tem autenticação, busca primeiro no banco
    if (authHeader) {
      console.log(`🔍 Buscando financiamentos autenticados para ORCID: ${orcid}`)
      const dadosBanco = await buscarUsuarioNoBanco(orcid)

      if (dadosBanco && dadosBanco["activities-summary"] && dadosBanco["activities-summary"].fundings) {
        console.log(`✅ Financiamentos encontrados no banco para ORCID: ${orcid}`)
        return res.json(dadosBanco["activities-summary"].fundings)
      }

      console.log(`📡 Financiamentos não encontrados no banco, buscando no ORCID: ${orcid}`)

      // Se não encontrou no banco, busca no ORCID e salva o usuário completo
      if (!dadosBanco) {
        const profileResponse = await fetch(`https://pub.orcid.org/v3.0/${orcid}/record`, {
          headers: {
            Accept: "application/json",
            Authorization: authHeader,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          await salvarUsuarioNoBanco(profileData)
        }
      }
    }

    // Busca no ORCID
    const baseUrl = "https://pub.orcid.org"
    const fundingsUrl = `${baseUrl}/v3.0/${orcid}/fundings`

    const headers = {
      Accept: "application/json",
    }

    if (authHeader) {
      headers["Authorization"] = authHeader
    }

    const response = await fetch(fundingsUrl, { headers })
    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: "Failed to fetch ORCID fundings",
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

app.get("/api/orcid/profile/:orcid/funding/:putCode", async (req, res) => {
  try {
    const { orcid, putCode } = req.params
    const authHeader = req.headers.authorization

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Se tem autenticação, busca primeiro no banco
    if (authHeader) {
      console.log(`🔍 Buscando financiamento autenticado ${putCode} para ORCID: ${orcid}`)
      let usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (usuarioId) {
        const projetoBanco = await buscarProjetoNoBanco(usuarioId, putCode)

        if (projetoBanco) {
          console.log(`✅ Financiamento ${putCode} encontrado no banco`)
          return res.json(projetoBanco)
        }
      }

      console.log(`📡 Financiamento ${putCode} não encontrado no banco, buscando no ORCID`)

      // Busca no ORCID
      const baseUrl = "https://pub.orcid.org"
      const fundingUrl = `${baseUrl}/v3.0/${orcid}/funding/${putCode}`

      const response = await fetch(fundingUrl, {
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
      })

      if (response.ok) {
        const data = await response.json()

        // Se não temos o usuário no banco, buscar e salvar primeiro
        if (!usuarioId) {
          const profileResponse = await fetch(`${baseUrl}/v3.0/${orcid}/record`, {
            headers: {
              Accept: "application/json",
              Authorization: authHeader,
            },
          })

          if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            usuarioId = await salvarUsuarioNoBanco(profileData)
          }
        }

        // Salvar projeto detalhado
        if (usuarioId) {
          await salvarProjetoDetalhado(usuarioId, data, putCode)
        }

        return res.json(data)
      } else {
        const errorData = await response.json()
        return res.status(response.status).json({
          error: "Failed to fetch funding details",
          details: errorData,
        })
      }
    }

    // Busca pública no ORCID
    const baseUrl = "https://pub.orcid.org"
    const fundingUrl = `${baseUrl}/v3.0/${orcid}/funding/${putCode}`

    const response = await fetch(fundingUrl, {
      headers: {
        Accept: "application/json",
      },
    })

    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: "Failed to fetch funding details",
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

// Endpoint para debug - listar todos os usuários
app.get("/api/debug/users", async (req, res) => {
  try {
    const result = await client.query("SELECT id, orcid_id, nome FROM Usuarios ORDER BY id")
    res.json({
      success: true,
      users: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    res.status(500).json({
      error: "Erro ao buscar usuários",
      message: error.message,
    })
  }
})

// Endpoint para debug - listar todos os projetos
app.get("/api/debug/projects", async (req, res) => {
  try {
    const result = await client.query(`
      SELECT p.id, p.nome, u.orcid_id, u.nome as usuario_nome
      FROM Projetos p
      JOIN UsuariosEProjetos up ON p.id = up.projeto_id
      JOIN Usuarios u ON up.usuario_id = u.id
      ORDER BY p.id
    `)
    res.json({
      success: true,
      projects: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    res.status(500).json({
      error: "Erro ao buscar projetos",
      message: error.message,
    })
  }
})

// Endpoint para debug - listar todas as publicações
app.get("/api/debug/publications", async (req, res) => {
  try {
    const result = await client.query(`
      SELECT t.id, t.nome, u.orcid_id, u.nome as usuario_nome
      FROM Trabalhos t
      JOIN UsuariosETrabalhos ut ON t.id = ut.trabalho_id
      JOIN Usuarios u ON ut.usuario_id = u.id
      ORDER BY t.id
    `)
    res.json({
      success: true,
      publications: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    res.status(500).json({
      error: "Erro ao buscar publicações",
      message: error.message,
    })
  }
})

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: client._connected ? "Connected" : "Disconnected",
  })
})

app.use((err, req, res, next) => {
  console.error("Server error:", err)
  res.status(500).json({
    error: "Something broke!",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    requested: `${req.method} ${req.url}`,
  })
})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔄 Fechando servidor...")
  try {
    await client.end()
    console.log("📦 Conexão com PostgreSQL encerrada")
  } catch (error) {
    console.error("❌ Erro ao fechar conexão com PostgreSQL:", error)
  }
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`🚀 ORCID Proxy Server running on port ${PORT}`)
})
