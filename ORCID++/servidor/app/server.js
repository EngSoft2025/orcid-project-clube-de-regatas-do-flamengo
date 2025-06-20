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
  password: "Rodrigo01",
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

// 🆕 FUNÇÃO CORRIGIDA: Verificar se usuário já existe antes de salvar
async function verificarUsuarioExistente(orcidId) {
  try {
    const query = "SELECT id, nome FROM Usuarios WHERE orcid_id = $1"
    const result = await client.query(query, [orcidId])

    if (result.rows.length > 0) {
      console.log(`✅ Usuário já existe: ${orcidId} (ID: ${result.rows[0].id})`)
      return result.rows[0]
    }

    return null
  } catch (error) {
    console.error("❌ Erro ao verificar usuário existente:", error)
    return null
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Salvar links externos do usuário
async function salvarLinksExternos(usuarioId, linksExternos) {
  try {
    console.log(`💾 Salvando ${linksExternos.length} links para usuário ${usuarioId}`)

    // Remove links existentes
    await client.query("DELETE FROM LinksExternos WHERE usuario_id = $1", [usuarioId])

    // Adiciona novos links
    for (let i = 0; i < linksExternos.length; i++) {
      const link = linksExternos[i]

      if (!link.name || !link.name.trim() || !link.url || !link.url.trim()) {
        console.log(`⚠️ Pulando link ${i + 1} - dados incompletos`)
        continue
      }

      // Validar URL
      try {
        new URL(link.url)
      } catch {
        console.log(`⚠️ Pulando link ${i + 1} - URL inválida: ${link.url}`)
        continue
      }

      // Inserir link na tabela
      await client.query(
        `
        INSERT INTO LinksExternos 
        (usuario_id, nome, url, ordem, ativo)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [
          usuarioId,
          link.name.trim(),
          link.url.trim(),
          i + 1, // ordem
          true, // ativo
        ],
      )

      console.log(`✅ Link ${i + 1}: ${link.name} salvo`)
    }

    console.log(`✅ Todos os links salvos para usuário ${usuarioId}`)
  } catch (error) {
    console.error("❌ Erro ao salvar links externos:", error)
    throw error
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Buscar links externos do usuário
async function buscarLinksExternos(usuarioId) {
  try {
    const query = `
      SELECT id, nome, url, ordem, ativo
      FROM LinksExternos 
      WHERE usuario_id = $1 AND ativo = true
      ORDER BY ordem
    `

    const result = await client.query(query, [usuarioId])

    return result.rows.map((link) => ({
      id: link.id,
      name: link.nome,
      url: link.url,
      ordem: link.ordem,
      ativo: link.ativo,
    }))
  } catch (error) {
    console.error("❌ Erro ao buscar links externos:", error)
    return []
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Salvar autores diretamente na tabela de autores
async function salvarAutoresDoTrabalho(trabalhoId, autores) {
  try {
    console.log(`💾 Salvando ${autores.length} autores para trabalho ${trabalhoId}`)

    // Remove autores existentes
    await client.query("DELETE FROM AutoresDeTrabalhos WHERE trabalho_id = $1", [trabalhoId])

    // Adiciona novos autores
    for (let i = 0; i < autores.length; i++) {
      const autor = autores[i]

      if (!autor.name || !autor.name.trim()) {
        console.log(`⚠️ Pulando autor ${i + 1} - nome vazio`)
        continue
      }

      // Verificar se existe usuário cadastrado com este ORCID
      let usuarioId = null
      if (autor.orcidId && autor.orcidId.trim()) {
        const usuarioExistente = await client.query("SELECT id FROM Usuarios WHERE orcid_id = $1", [
          autor.orcidId.trim(),
        ])
        if (usuarioExistente.rows.length > 0) {
          usuarioId = usuarioExistente.rows[0].id
          console.log(`✅ Autor ${autor.name} vinculado ao usuário ID ${usuarioId}`)
        }
      }

      // Inserir autor na tabela de autores
      await client.query(
        `
        INSERT INTO AutoresDeTrabalhos 
        (trabalho_id, nome_autor, orcid_autor, email_autor, afiliacao_autor, ordem_autor, usuario_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          trabalhoId,
          autor.name.trim(),
          autor.orcidId && autor.orcidId.trim() ? autor.orcidId.trim() : null,
          autor.email && autor.email.trim() ? autor.email.trim() : null,
          autor.affiliation && autor.affiliation.trim() ? autor.affiliation.trim() : null,
          i + 1, // ordem_autor
          usuarioId,
        ],
      )

      console.log(`✅ Autor ${i + 1}: ${autor.name} salvo`)
    }

    console.log(`✅ Todos os autores salvos para trabalho ${trabalhoId}`)
  } catch (error) {
    console.error("❌ Erro ao salvar autores:", error)
    throw error
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Buscar trabalho com autores usando a nova estrutura
async function buscarTrabalhoComAutores(trabalhoId) {
  try {
    const query = `
      SELECT 
        t.*,
        json_agg(
          json_build_object(
            'id', a.id,
            'name', a.nome_autor,
            'orcidId', a.orcid_autor,
            'email', a.email_autor,
            'affiliation', a.afiliacao_autor,
            'ordem', a.ordem_autor,
            'isRegisteredUser', CASE WHEN a.usuario_id IS NOT NULL THEN true ELSE false END
          ) ORDER BY a.ordem_autor
        ) FILTER (WHERE a.id IS NOT NULL) as autores
      FROM Trabalhos t
      LEFT JOIN AutoresDeTrabalhos a ON t.id = a.trabalho_id
      WHERE t.id = $1
      GROUP BY t.id
    `

    const result = await client.query(query, [trabalhoId])

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
        contributor: (trabalho.autores || [])
          .filter((a) => a.name)
          .map((autor) => ({
            "credit-name": { value: autor.name },
            "contributor-orcid": autor.orcidId
              ? {
                  uri: `https://orcid.org/${autor.orcidId}`,
                  path: autor.orcidId,
                  host: "orcid.org",
                }
              : null,
            "contributor-email": autor.email || null,
            "contributor-attributes": {
              "contributor-sequence": autor.ordem === 1 ? "first" : "additional",
              "contributor-role": "author",
            },
          })),
      },
      _source: "database",
      _authors_details: trabalho.autores || [], // Dados extras para o frontend
    }
  } catch (error) {
    console.error("❌ Erro ao buscar trabalho com autores:", error)
    return null
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Extrair autores de dados do ORCID
// 🔧 CORREÇÃO 3: Extrair autores corretamente do ORCID
function extrairAutoresDoOrcid(dadosOrcid) {
  const autores = []

  // Tentar extrair autores dos contributors
  if (dadosOrcid.contributors && dadosOrcid.contributors.contributor) {
    dadosOrcid.contributors.contributor.forEach((contrib, index) => {
      const autor = {
        name: contrib["credit-name"]?.value || `Autor ${index + 1}`,
        orcidId: contrib["contributor-orcid"]?.path || null,
        email: contrib["contributor-email"] || null,
        affiliation: contrib["contributor-attributes"]?.["contributor-affiliation"] || null,
      }
      autores.push(autor)
    })
  }

  // 🔧 CORREÇÃO: Se não tem contributors, NÃO criar autor genérico
  // Deixar vazio para ser preenchido manualmente
  if (autores.length === 0) {
    console.log("⚠️ Nenhum autor encontrado nos dados do ORCID - será necessário adicionar manualmente")
  }

  return autores
}

// Função auxiliar para encontrar ou criar usuário por ORCID (CORRIGIDA)
async function encontrarOuCriarUsuario(orcidId, nomeAutor = null) {
  try {
    // Primeiro, tenta encontrar o usuário existente
    const usuarioExistente = await verificarUsuarioExistente(orcidId)

    if (usuarioExistente) {
      return usuarioExistente.id
    }

    // Se não encontrou, cria um novo usuário básico
    const insertUsuario = `
      INSERT INTO Usuarios (orcid_id, nome) 
      VALUES ($1, $2) 
      RETURNING id
    `
    const novoUsuario = await client.query(insertUsuario, [orcidId, nomeAutor || `Usuário ${orcidId}`])

    console.log(`✅ Novo usuário criado para ORCID: ${orcidId}`)
    return novoUsuario.rows[0].id
  } catch (error) {
    console.error("❌ Erro ao encontrar/criar usuário:", error)
    return null
  }
}

// Função auxiliar para associar autores a um trabalho (MANTIDA PARA COMPATIBILIDADE)
async function associarAutoresAoTrabalho(trabalhoId, autores) {
  try {
    // Usar nova função
    await salvarAutoresDoTrabalho(trabalhoId, autores)

    console.log(`✅ ${autores.length} autores associados ao trabalho ${trabalhoId}`)
  } catch (error) {
    console.error("❌ Erro ao associar autores ao trabalho:", error)
    throw error
  }
}

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
    console.error("❌ Erro ao salvar área de pesquisa:", error)
    return null
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Salvar usuário no banco com verificação de existência
// 🔧 CORREÇÃO 4: Não salvar automaticamente o usuário como autor de todos os trabalhos
async function salvarUsuarioNoBanco(dadosOrcid) {
  try {
    const orcidId = dadosOrcid["orcid-identifier"].path

    // Verificar se usuário já existe
    const usuarioExistente = await verificarUsuarioExistente(orcidId)
    if (usuarioExistente) {
      console.log(`⚠️ Usuário ${orcidId} já existe no banco, pulando inserção`)
      return usuarioExistente.id
    }

    await client.query("BEGIN")

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

    // Inserir usuário
    const insertUserQuery = `
      INSERT INTO Usuarios (orcid_id, nome, instituicao, departamento, cargo, email, biografia, pagina_institucional)
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
      null,
    ])

    const usuarioId = userResult.rows[0].id
    console.log(`✅ Usuário salvo no banco com ID: ${usuarioId}`)

    // Salvar links externos
    const researcherUrls = person["researcher-urls"]?.["researcher-url"] || []
    const linksExternos = researcherUrls.map((url, index) => ({
      name: url["url-name"] || `Link ${index + 1}`,
      url: url.url.value,
    }))

    if (linksExternos.length > 0) {
      await salvarLinksExternos(usuarioId, linksExternos)
    }

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

    // 🔧 CORREÇÃO: Salvar trabalhos SEM autores automáticos
    const works = dadosOrcid["activities-summary"]?.works?.group || []
    for (const workGroup of works) {
      const workSummary = workGroup["work-summary"]?.[0]
      if (workSummary) {
        const insertWorkQuery = `
          INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte, usuario_proprietario_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `

        const workResult = await client.query(insertWorkQuery, [
          workSummary.title?.title?.value || "Trabalho sem título",
          Number.parseInt(workSummary["publication-date"]?.year?.value) || new Date().getFullYear(),
          workSummary.type || "journal-article",
          workSummary["journal-title"]?.value || null,
          usuarioId,
        ])

        const trabalhoId = workResult.rows[0].id

        // 🔧 CORREÇÃO: NÃO adicionar automaticamente o usuário como autor
        // Os autores serão extraídos dos dados detalhados do trabalho ou adicionados manualmente
        console.log(`✅ Trabalho ${trabalhoId} salvo SEM autores automáticos - aguardando dados detalhados`)
      }
    }

    // Salvar projetos/financiamentos (mantido como estava)
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
    console.error("❌ Erro ao salvar usuário no banco:", error)
    return null
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Salvar trabalho detalhado com autores
async function salvarTrabalhoDetalhado(usuarioId, dadosTrabalho, putCode) {
  try {
    const insertWorkQuery = `
      INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte, resumo, tipo_identificador, valor_identificador, links_adicionais, usuario_proprietario_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      null, // links_adicionais será preenchida quando necessário
      usuarioId, // Marcar como proprietário
    ])

    if (workResult.rows.length > 0) {
      const trabalhoId = workResult.rows[0].id

      // Extrair e salvar autores do ORCID
      const autores = extrairAutoresDoOrcid(dadosTrabalho)
      await salvarAutoresDoTrabalho(trabalhoId, autores)

      console.log(`✅ Trabalho detalhado ${putCode} salvo no banco com ${autores.length} autores`)
      return trabalhoId
    }

    return null
  } catch (error) {
    console.error("❌ Erro ao salvar trabalho detalhado:", error)
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
    console.error("❌ Erro ao salvar projeto detalhado:", error)
    return null
  }
}

// 🆕 FUNÇÃO CORRIGIDA: Buscar usuário com trabalhos e autores usando nova estrutura
async function buscarUsuarioNoBanco(orcidId) {
  try {
    console.log(`🔍 Buscando usuário com ORCID: ${orcidId}`)

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
    console.log(`📊 Resultado da busca:`, resultUsuario.rows)

    if (resultUsuario.rows.length === 0) {
      console.log(`❌ Usuário não encontrado no banco: ${orcidId}`)
      return null
    }

    const usuario = resultUsuario.rows[0]
    console.log(`✅ Usuário encontrado com ID: ${usuario.id}`)

    // Buscar links externos usando nova estrutura
    const linksExternos = await buscarLinksExternos(usuario.id)

    // Buscar trabalhos com autores usando nova estrutura
    const queryTrabalhos = `
      SELECT 
        t.*,
        json_agg(
          json_build_object(
            'id', a.id,
            'name', a.nome_autor,
            'orcidId', a.orcid_autor,
            'email', a.email_autor,
            'affiliation', a.afiliacao_autor,
            'ordem', a.ordem_autor,
            'isRegisteredUser', CASE WHEN a.usuario_id IS NOT NULL THEN true ELSE false END
          ) ORDER BY a.ordem_autor
        ) FILTER (WHERE a.id IS NOT NULL) as todos_autores
      FROM Trabalhos t
      LEFT JOIN AutoresDeTrabalhos a ON t.id = a.trabalho_id
      WHERE t.usuario_proprietario_id = $1
      GROUP BY t.id
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
        // Links externos usando nova estrutura
        "researcher-urls":
          linksExternos.length > 0
            ? {
                "researcher-url": linksExternos.map((link) => ({
                  "url-name": link.name,
                  url: { value: link.url },
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
                contributors: {
                  contributor: (trabalho.todos_autores || [])
                    .filter((a) => a.name)
                    .map((autor) => ({
                      "credit-name": { value: autor.name },
                      "contributor-orcid": autor.orcidId
                        ? {
                            uri: `https://orcid.org/${autor.orcidId}`,
                            path: autor.orcidId,
                            host: "orcid.org",
                          }
                        : null,
                      "contributor-email": autor.email || null,
                      "contributor-affiliation": autor.affiliation || null,
                    })),
                },
                _authors_details: trabalho.todos_autores || [], // Dados extras
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
      _source: "database",
      _links_externos: linksExternos, // Dados extras para o frontend
    }

    return response
  } catch (error) {
    console.error("❌ Erro ao buscar usuário no banco:", error)
    return null
  }
}

async function buscarTrabalhoNoBanco(usuarioId, putCode) {
  try {
    // Usar a função que busca com autores
    return await buscarTrabalhoComAutores(putCode)
  } catch (error) {
    console.error("❌ Erro ao buscar trabalho no banco:", error)
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
    console.error("❌ Erro ao buscar projeto no banco:", error)
    return null
  }
}

// Função auxiliar para obter ID do usuário por ORCID
async function obterUsuarioIdPorOrcid(orcidId) {
  try {
    const query = "SELECT id FROM Usuarios WHERE orcid_id = $1"
    const result = await client.query(query, [orcidId])
    if (result.rows.length > 0) {
      return result.rows[0].id
    }
    return null
  } catch (error) {
    console.error("❌ Erro ao obter ID do usuário por ORCID:", error)
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
    note: "🆕 Versão corrigida com verificação de usuários existentes e tratamento adequado de erros!",
  })
})

// ENDPOINTS PARA GERENCIAMENTO DE PERFIL

// 🆕 ENDPOINT CORRIGIDO: Salvar/atualizar perfil do usuário com nova estrutura de links
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
        if (!link.name || !link.name.trim()) {
          return res.status(400).json({
            error: "Nome do link é obrigatório",
          })
        }
        if (!link.url || !link.url.trim()) {
          return res.status(400).json({
            error: "URL do link é obrigatória",
          })
        }
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
              data_atualizacao = CURRENT_TIMESTAMP
          WHERE orcid_id = $8
        `

        await client.query(updateUserQuery, [
          name,
          institution,
          department || null,
          role || null,
          email || null,
          bio || null,
          institutionalPage || null,
          orcid,
        ])

        console.log(`✅ Usuário ${orcid} atualizado no banco`)
      } else {
        // Criar novo usuário
        const insertUserQuery = `
          INSERT INTO Usuarios (orcid_id, nome, instituicao, departamento, cargo, email, biografia, pagina_institucional)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `

        const userResult = await client.query(insertUserQuery, [
          orcid,
          name,
          institution,
          department || null,
          role || null,
          email || null,
          bio || null,
          institutionalPage || null,
        ])

        usuarioId = userResult.rows[0].id
        console.log(`✅ Novo usuário ${orcid} criado no banco com ID: ${usuarioId}`)
      }

      // Atualizar links externos usando nova estrutura
      if (externalLinks && Array.isArray(externalLinks)) {
        await salvarLinksExternos(usuarioId, externalLinks)
      } else {
        // Se não foram fornecidos links, remover os existentes
        await client.query("DELETE FROM LinksExternos WHERE usuario_id = $1", [usuarioId])
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
    console.error("❌ Erro ao salvar perfil:", error)
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
    console.error("❌ Erro ao buscar perfil:", error)
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

    // Verificar se o usuário existe ANTES de iniciar transação
    const usuarioId = await obterUsuarioIdPorOrcid(orcid)
    if (!usuarioId) {
      return res.status(404).json({
        error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se já existe um projeto com o mesmo nome para este usuário
      const checkExistingProject = `
        SELECT p.id, p.nome
        FROM Projetos p
        JOIN UsuariosEProjetos up ON p.id = up.projeto_id
        WHERE up.usuario_id = $1 AND LOWER(TRIM(p.nome)) = LOWER(TRIM($2))
      `

      const existingProject = await client.query(checkExistingProject, [usuarioId, name])

      if (existingProject.rows.length > 0) {
        await client.query("ROLLBACK")
        return res.status(409).json({
          error: "Já existe um projeto com este nome para este usuário",
          existingProject: existingProject.rows[0]
        })
      }

      // Criar APENAS o novo projeto - sem tocar nos existentes
      const insertProjectQuery = `
        INSERT INTO Projetos (nome, ano_inicio, ano_termino, agencia_de_financiamento, financiamento, funcao_no_projeto, descricao)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `

      const projectResult = await client.query(insertProjectQuery, [
        name.trim(),
        Number.parseInt(startYear),
        endYear ? Number.parseInt(endYear) : null,
        fundingAgency?.trim() || null,
        funding?.trim() || null,
        role?.trim() || null,
        description?.trim() || null,
      ])

      const projetoId = projectResult.rows[0].id

      // Associar APENAS o novo projeto ao usuário
      await client.query(
        "INSERT INTO UsuariosEProjetos (usuario_id, projeto_id) VALUES ($1, $2)",
        [usuarioId, projetoId]
      )

      await client.query("COMMIT")

      console.log(`✅ APENAS o novo projeto ${projetoId} foi criado para usuário ${orcid}`)

      // Buscar projeto criado
      const newProject = await buscarProjetoNoBanco(usuarioId, projetoId)

      res.json({
        success: true,
        message: "Projeto criado com sucesso",
        data: newProject,
      })

    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("❌ Erro ao criar projeto:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para atualizar projeto específico
app.put("/api/project/:orcid/:projectId", async (req, res) => {
  try {
    const { orcid, projectId } = req.params

    console.log(`🔧 Atualizando APENAS projeto ${projectId} para ORCID: ${orcid}`)

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

    // Verificar se o usuário existe ANTES de iniciar transação
    const usuarioId = await obterUsuarioIdPorOrcid(orcid)
    if (!usuarioId) {
      return res.status(404).json({
        error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
      })
    }

    await client.query("BEGIN")

    try {
      // Verificar se o projeto existe e pertence ao usuário
      const checkProjectQuery = `
        SELECT p.id, p.nome
        FROM Projetos p
        JOIN UsuariosEProjetos up ON p.id = up.projeto_id
        WHERE p.id = $1 AND up.usuario_id = $2
      `

      const projectExists = await client.query(checkProjectQuery, [projectId, usuarioId])

      if (projectExists.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Projeto não encontrado ou não pertence ao usuário",
        })
      }

      // Verificar se já existe outro projeto com o mesmo nome (exceto o atual)
      const checkDuplicateName = `
        SELECT p.id, p.nome
        FROM Projetos p
        JOIN UsuariosEProjetos up ON p.id = up.projeto_id
        WHERE up.usuario_id = $1 AND LOWER(TRIM(p.nome)) = LOWER(TRIM($2)) AND p.id != $3
      `

      const duplicateProject = await client.query(checkDuplicateName, [usuarioId, name, projectId])

      if (duplicateProject.rows.length > 0) {
        await client.query("ROLLBACK")
        return res.status(409).json({
          error: "Já existe outro projeto com este nome para este usuário",
          existingProject: duplicateProject.rows[0]
        })
      }

      // Atualizar APENAS este projeto específico
      const updateProjectQuery = `
        UPDATE Projetos 
        SET nome = $1, ano_inicio = $2, ano_termino = $3, 
            agencia_de_financiamento = $4, financiamento = $5, 
            funcao_no_projeto = $6, descricao = $7
        WHERE id = $8
      `

      const updateResult = await client.query(updateProjectQuery, [
        name.trim(),
        Number.parseInt(startYear),
        endYear ? Number.parseInt(endYear) : null,
        fundingAgency?.trim() || null,
        funding?.trim() || null,
        role?.trim() || null,
        description?.trim() || null,
        projectId,
      ])

      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Projeto não foi encontrado para atualização",
        })
      }

      await client.query("COMMIT")

      console.log(`✅ APENAS projeto ${projectId} foi atualizado para usuário ${orcid}`)

      // Buscar projeto atualizado
      const updatedProject = await buscarProjetoNoBanco(usuarioId, projectId)

      res.json({
        success: true,
        message: "Projeto atualizado com sucesso",
        data: updatedProject,
      })

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
      // Verificar si o usuário existe
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
    console.error("❌ Erro ao deletar projeto:", error)
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
    console.error("❌ Erro ao buscar projetos:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// 🆕 ENDPOINTS CORRIGIDOS PARA GERENCIAMENTO DE PUBLICAÇÕES

// Endpoint corrigido para criar nova publicação
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
      // Verificar se o usuário principal existe
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        return res.status(404).json({
          error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
        })
      }

      // Criar publicação com proprietário
      const insertPublicationQuery = `
        INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte, resumo, tipo_identificador, valor_identificador, links_adicionais, usuario_proprietario_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        usuarioId, // Marcar como proprietário
      ])

      const publicationId = publicationResult.rows[0].id

      // Salvar autores usando nova estrutura
      await salvarAutoresDoTrabalho(publicationId, authors)

      await client.query("COMMIT")

      // Buscar publicação criada com autores
      const newPublication = await buscarTrabalhoComAutores(publicationId)

      res.json({
        success: true,
        message: "Publicação criada com sucesso",
        data: newPublication,
      })

      console.log(`✅ Nova publicação ${publicationId} criada para usuário ${orcid} com ${authors.length} autores`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("❌ Erro ao criar publicação:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint corrigido para editar publicação
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
      // Verificar si o usuário existe
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

      // Verificar se a publicação pertence ao usuário
      const checkPublicationQuery = `
        SELECT t.id, t.nome
        FROM Trabalhos t
        WHERE t.id = $1 AND t.usuario_proprietario_id = $2
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

      // Atualizar autores usando nova estrutura
      await salvarAutoresDoTrabalho(publicationId, authors)

      await client.query("COMMIT")

      // Buscar publicação atualizada com autores
      const updatedPublication = await buscarTrabalhoComAutores(publicationId)

      res.json({
        success: true,
        message: "Publicação atualizada com sucesso",
        data: updatedPublication,
      })

      console.log(`✅ Publicação ${publicationId} atualizada para usuário ${orcid} com ${authors.length} autores`)
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

      // Verificar se a publicação pertence ao usuário
      const checkPublicationQuery = `
        SELECT t.id, t.nome
        FROM Trabalhos t
        WHERE t.id = $1 AND t.usuario_proprietario_id = $2
      `

      const publicationExists = await client.query(checkPublicationQuery, [publicationId, usuarioId])

      if (publicationExists.rows.length === 0) {
        return res.status(404).json({
          error: "Publicação não encontrada ou não pertence ao usuário",
        })
      }

      // Remover autores primeiro
      await client.query("DELETE FROM AutoresDeTrabalhos WHERE trabalho_id = $1", [publicationId])

      // Remover publicação
      await client.query("DELETE FROM Trabalhos WHERE id = $1", [publicationId])

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
    console.error("❌ Erro ao deletar publicação:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint corrigido para listar publicações do usuário com autores
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

    // Buscar publicações com autores usando nova estrutura
    const queryPublicacoes = `
      SELECT 
        t.*,
        json_agg(
          json_build_object(
            'id', a.id,
            'name', a.nome_autor,
            'orcidId', a.orcid_autor,
            'email', a.email_autor,
            'affiliation', a.afiliacao_autor,
            'ordem', a.ordem_autor,
            'isRegisteredUser', CASE WHEN a.usuario_id IS NOT NULL THEN true ELSE false END
          ) ORDER BY a.ordem_autor
        ) FILTER (WHERE a.id IS NOT NULL) as todos_autores
      FROM Trabalhos t
      LEFT JOIN AutoresDeTrabalhos a ON t.id = a.trabalho_id
      WHERE t.usuario_proprietario_id = $1
      GROUP BY t.id
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
      authors: (trabalho.todos_autores || [])
        .filter((a) => a.name)
        .map((autor) => ({
          name: autor.name,
          orcidId: autor.orcidId || "",
          email: autor.email || "",
          affiliation: autor.affiliation || "",
        })),
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
    console.error("❌ Erro ao buscar publicações:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// ENDPOINTS ORCID ORIGINAIS (mantidos como estavam)

app.post("/api/orcid/token", async (req, res) =>
{
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
}
)

app.get("/api/orcid/search", async (req, res) =>
{
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
}
)

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

    // 🔧 CORREÇÃO: SEMPRE buscar no banco primeiro, independente de autenticação
    console.log(`🔍 Buscando perfil no banco para ORCID: ${orcid}`)
    const dadosBanco = await buscarUsuarioNoBanco(orcid)

    if (dadosBanco) {
      console.log(`✅ Perfil encontrado no banco para ORCID: ${orcid} - RETORNANDO DADOS DO BANCO`)
      return res.json(dadosBanco)
    }

    console.log(`📡 Perfil não encontrado no banco, buscando no ORCID: ${orcid}`)

    // Se tem autenticação, busca no ORCID e salva
    if (authHeader) {
      const baseUrl = "https://pub.orcid.org"
      const profileUrl = `${baseUrl}/v3.0/${orcid}/record`

      const headers = {
        Accept: "application/json",
        Authorization: authHeader,
      }

      const response = await fetch(profileUrl, { headers })

      if (response.ok) {
        const data = await response.json()

        // Salvar dados no banco APENAS se não existir
        console.log(`💾 Salvando dados do ORCID ${orcid} no banco pela PRIMEIRA VEZ...`)
        const usuarioId = await salvarUsuarioNoBanco(data)

        if (usuarioId) {
          // Retornar dados salvos do banco para garantir consistência
          const dadosSalvos = await buscarUsuarioNoBanco(orcid)
          if (dadosSalvos) {
            console.log(`✅ Retornando dados salvos do banco para ORCID: ${orcid}`)
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

    // Busca pública no ORCID (sem autenticação) - APENAS se não tem no banco
    const baseUrl = "https://pub.orcid.org"
    const profileUrl = `${baseUrl}/v3.0/${orcid}/record`

    const headers = {
      Accept: "application/json",
    }

    const response = await fetch(profileUrl, { headers })
    const data = await response.json()

    if (response.ok) {
      console.log(`✅ Retornando dados públicos do ORCID para: ${orcid}`)
      res.json(data)
    } else {
      res.status(response.status).json({
        error: "Failed to fetch ORCID profile",
        details: data,
      })
    }
  } catch (error) {
    console.error("❌ Erro ao buscar perfil:", error)
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
})

// 🔧 CORREÇÃO 1: Buscar seção fundings no banco primeiro
app.get("/api/orcid/profile/:orcid/:section", async (req, res) => {
  try {
    const { orcid, section } = req.params
    const authHeader = req.headers.authorization

    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Valid sections: " + validSections.join(", "),
      })
    }

    const validSections = ["works", "employments", "educations", "fundings", "peer-reviews", "person"]

    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: "Invalid section. Valid sections: " + validSections.join(", "),
      })
    }

    // 🔧 CORREÇÃO: Buscar no banco primeiro para works E fundings
    if ((section === "works" || section === "fundings") && authHeader) {
      console.log(`🔍 Buscando seção autenticada '${section}' para ORCID: ${orcid}`)
      const dadosBanco = await buscarUsuarioNoBanco(orcid)

      if (dadosBanco && dadosBanco["activities-summary"]?.[section]) {
        console.log(`✅ Seção '${section}' encontrada no banco para ORCID: ${orcid}`)
        return res.json(dadosBanco["activities-summary"][section])
      }

      console.log(`📡 Seção '${section}' não encontrada no banco, buscando no ORCID: ${orcid}`)
    }

    const baseUrl = "https://pub.orcid.org"
    const sectionUrl = `${baseUrl}/v3.0/${orcid}/${section}`

    const headers = {
      Accept: "application/json",
    }

    if (authHeader) {
      headers.Authorization = authHeader
    }

    const response = await fetch(sectionUrl, { headers })
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

app.get("/api/orcid/profile/:orcid/work/:putCode", async (req, res) =>
{
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
      const usuarioId = await obterUsuarioIdPorOrcid(orcid)

      if (!usuarioId) {
        console.log(`🔍 Buscando usuário com ORCID: ${orcid}`)
        const dadosBanco = await buscarUsuarioNoBanco(orcid)

        if (!dadosBanco) {
          return res.status(404).json({
            error: "Usuário não encontrado. Certifique-se de que o perfil foi carregado primeiro.",
          })
        }
      }

      const dadosBanco = await buscarTrabalhoComAutores(putCode)

      if (dadosBanco) {
        console.log(`✅ Trabalho ${putCode} encontrado no banco para ORCID: ${orcid}`)
        return res.json(dadosBanco)
      }

      console.log(`📡 Trabalho ${putCode} não encontrado no banco, buscando no ORCID: ${orcid}`)

      // Busca no ORCID com autenticação
      const baseUrl = "https://pub.orcid.org"
      const workUrl = `${baseUrl}/v3.0/${orcid}/work/${putCode}`

      const headers = {
        Accept: "application/json",
        Authorization: authHeader,
      }

      const response = await fetch(workUrl, { headers })

      if (response.ok) {
        const data = await response.json()

        // Salvar dados no banco se temos usuário
        if (usuarioId) {
          console.log(`💾 Salvando trabalho ${putCode} do ORCID ${orcid} no banco...`)
          const trabalhoId = await salvarTrabalhoDetalhado(usuarioId, data, putCode)

          if (trabalhoId) {
            // Retornar dados salvos do banco para garantir consistência
            const dadosSalvos = await buscarTrabalhoComAutores(trabalhoId)
            if (dadosSalvos) {
              return res.json(dadosSalvos)
            }
          }
        }

        // Se falhou ao salvar, retorna dados do ORCID mesmo assim
        return res.json(data)
      } else {
        const errorData = await response.json()
        return res.status(response.status).json({
          error: `Failed to fetch ORCID work ${putCode}`,
          details: errorData,
        })
      }
    }

    // Busca pública no ORCID (sem autenticação)
    const baseUrl = "https://pub.orcid.org"
    const workUrl = `${baseUrl}/v3.0/${orcid}/work/${putCode}`

    const headers = {
      Accept: "application/json",
    }

    const response = await fetch(workUrl, { headers })
    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: `Failed to fetch ORCID work ${putCode}`,
        details: data,
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}
)

// 🔧 CORREÇÃO 2: Buscar funding no banco primeiro
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

    // 🔧 CORREÇÃO: SEMPRE buscar no banco primeiro
    console.log(`🔍 Buscando financiamento ${putCode} no banco para ORCID: ${orcid}`)
    const usuarioId = await obterUsuarioIdPorOrcid(orcid)

    if (usuarioId) {
      const dadosBanco = await buscarProjetoNoBanco(usuarioId, putCode)

      if (dadosBanco) {
        console.log(`✅ Financiamento ${putCode} encontrado no banco para ORCID: ${orcid}`)
        return res.json(dadosBanco)
      }
    }

    console.log(`📡 Financiamento ${putCode} não encontrado no banco, buscando no ORCID: ${orcid}`)

    // Se tem autenticação, busca no ORCID
    if (authHeader) {
      const baseUrl = "https://pub.orcid.org"
      const fundingUrl = `${baseUrl}/v3.0/${orcid}/funding/${putCode}`

      const headers = {
        Accept: "application/json",
        Authorization: authHeader,
      }

      const response = await fetch(fundingUrl, { headers })

      if (response.ok) {
        const data = await response.json()

        // Salvar dados no banco se temos usuário
        if (usuarioId) {
          console.log(`💾 Salvando financiamento ${putCode} do ORCID ${orcid} no banco...`)
          const projetoId = await salvarProjetoDetalhado(usuarioId, data, putCode)

          if (projetoId) {
            const dadosSalvos = await buscarProjetoNoBanco(usuarioId, projetoId)
            if (dadosSalvos) {
              return res.json(dadosSalvos)
            }
          }
        }

        return res.json(data)
      } else {
        const errorData = await response.json()
        return res.status(response.status).json({
          error: `Failed to fetch ORCID funding ${putCode}`,
          details: errorData,
        })
      }
    }

    // Busca pública no ORCID (sem autenticação)
    const baseUrl = "https://pub.orcid.org"
    const fundingUrl = `${baseUrl}/v3.0/${orcid}/funding/${putCode}`

    const headers = {
      Accept: "application/json",
    }

    const response = await fetch(fundingUrl, { headers })
    const data = await response.json()

    if (response.ok) {
      res.json(data)
    } else {
      res.status(response.status).json({
        error: `Failed to fetch ORCID funding ${putCode}`,
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

app.listen(PORT, () =>
{
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
}
)
