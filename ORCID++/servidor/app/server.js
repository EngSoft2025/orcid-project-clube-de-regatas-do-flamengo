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

  // Se não tem contributors, NÃO criar autor genérico
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

    // Salvar trabalhos SEM autores automáticos
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

// 🆕 FUNÇÃO CORRIGIDA: Buscar usuário com trabalhos e autores usando nova estrutura E COM ASSOCIAÇÕES PROJETO-PUBLICAÇÃO
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

    if (resultUsuario.rows.length === 0) {
      console.log(`❌ Usuário não encontrado no banco: ${orcidId}`)
      return null
    }

    const usuario = resultUsuario.rows[0]
    console.log(`✅ Usuário encontrado com ID: ${usuario.id}`)

    // Buscar links externos usando nova estrutura
    const linksExternos = await buscarLinksExternos(usuario.id)

    // 🔧 CORREÇÃO: Buscar trabalhos com autores E projetos associados
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
        ) FILTER (WHERE a.id IS NOT NULL) as todos_autores,
        -- 🆕 BUSCAR PROJETOS ASSOCIADOS
        (
          SELECT p.nome 
          FROM TrabalhosEProjetos tp 
          JOIN Projetos p ON tp.projeto_id = p.id 
          WHERE tp.trabalho_id = t.id 
          LIMIT 1
        ) as projeto_associado
      FROM Trabalhos t
      LEFT JOIN AutoresDeTrabalhos a ON t.id = a.trabalho_id
      WHERE t.usuario_proprietario_id = $1
      GROUP BY t.id
      ORDER BY t.ano DESC
    `

    const resultTrabalhos = await client.query(queryTrabalhos, [usuario.id])

    // 🔧 CORREÇÃO: Buscar projetos com publicações associadas
    const queryProjetos = `
      SELECT 
        p.*,
        -- 🆕 BUSCAR PUBLICAÇÕES ASSOCIADAS
        json_agg(
          json_build_object(
            'id', t.id,
            'title', t.nome,
            'year', t.ano,
            'type', t.tipo_de_trabalho
          )
        ) FILTER (WHERE t.id IS NOT NULL) as publicacoes_associadas
      FROM Projetos p
      JOIN UsuariosEProjetos up ON p.id = up.projeto_id
      LEFT JOIN TrabalhosEProjetos tp ON p.id = tp.projeto_id
      LEFT JOIN Trabalhos t ON tp.trabalho_id = t.id
      WHERE up.usuario_id = $1
      GROUP BY p.id
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
                // 🆕 INCLUIR PROJETO ASSOCIADO
                project: trabalho.projeto_associado || "",
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
                // 🆕 INCLUIR PUBLICAÇÕES ASSOCIADAS
                publications: projeto.publicacoes_associadas || [],
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

// 🆕 NOVOS ENDPOINTS PARA GERENCIAR ASSOCIAÇÕES PROJETO-PUBLICAÇÃO

// Endpoint para associar publicação a projeto
app.post("/api/projetoTrabalho/:trabalhoId/:projetoId", async (req, res) => {
  try {
    const { trabalhoId, projetoId } = req.params

    console.log(`🔗 Associando publicação ${trabalhoId} ao projeto ${projetoId}`)

    // Verificar se ambos existem
    const checkPublication = await client.query("SELECT id FROM Trabalhos WHERE id = $1", [trabalhoId])
    const checkProject = await client.query("SELECT id FROM Projetos WHERE id = $1", [projetoId])

    if (checkPublication.rows.length === 0) {
      return res.status(404).json({ error: "Publicação não encontrada" })
    }

    if (checkProject.rows.length === 0) {
      return res.status(404).json({ error: "Projeto não encontrado" })
    }

    // Criar associação (ON CONFLICT DO NOTHING evita duplicatas)
    await client.query(
      "INSERT INTO TrabalhosEProjetos (trabalho_id, projeto_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [trabalhoId, projetoId],
    )

    console.log(`✅ Publicação ${trabalhoId} associada ao projeto ${projetoId}`)

    res.json({
      success: true,
      message: "Publicação associada ao projeto com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao associar publicação ao projeto:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para remover associação entre publicação e projeto
app.delete("/api/projetoTrabalho/:trabalhoId/:projetoId", async (req, res) => {
  try {
    const { trabalhoId, projetoId } = req.params

    console.log(`🔗 Removendo associação entre publicação ${trabalhoId} e projeto ${projetoId}`)

    const result = await client.query("DELETE FROM TrabalhosEProjetos WHERE trabalho_id = $1 AND projeto_id = $2", [
      trabalhoId,
      projetoId,
    ])

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Associação não encontrada",
      })
    }

    console.log(`✅ Associação removida entre publicação ${trabalhoId} e projeto ${projetoId}`)

    res.json({
      success: true,
      message: "Associação removida com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao remover associação:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para obter projetos associados a uma publicação
app.get("/api/publication/:publicationId/projects", async (req, res) => {
  try {
    const { publicationId } = req.params

    const query = `
      SELECT p.* 
      FROM Projetos p
      JOIN TrabalhosEProjetos tp ON p.id = tp.projeto_id
      WHERE tp.trabalho_id = $1
      ORDER BY p.nome
    `

    const result = await client.query(query, [publicationId])

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar projetos da publicação:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para obter publicações associadas a um projeto
app.get("/api/project/:projectId/publications", async (req, res) => {
  try {
    const { projectId } = req.params

    const query = `
      SELECT t.*, 
        json_agg(
          json_build_object(
            'id', a.id,
            'name', a.nome_autor,
            'orcidId', a.orcid_autor,
            'email', a.email_autor,
            'affiliation', a.afiliacao_autor,
            'ordem', a.ordem_autor
          ) ORDER BY a.ordem_autor
        ) FILTER (WHERE a.id IS NOT NULL) as autores
      FROM Trabalhos t
      JOIN TrabalhosEProjetos tp ON t.id = tp.trabalho_id
      LEFT JOIN AutoresDeTrabalhos a ON t.id = a.trabalho_id
      WHERE tp.projeto_id = $1
      GROUP BY t.id
      ORDER BY t.ano DESC
    `

    const result = await client.query(query, [projectId])

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar publicações do projeto:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

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
      "/api/projetoTrabalho/:trabalhoId/:projetoId": "POST - Associate project with publication",
      "/api/projetoTrabalho/:trabalhoId/:projetoId": "DELETE - Dissociate project from publication",
      "/api/publication/:publicationId/projects": "GET - Get projects associated with publication",
      "/api/project/:projectId/publications": "GET - Get publications associated with project",
    },
    note: "🆕 Versão com suporte completo a associações projeto-publicação!",
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
          existingProject: existingProject.rows[0],
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
      await client.query("INSERT INTO UsuariosEProjetos (usuario_id, projeto_id) VALUES ($1, $2)", [
        usuarioId,
        projetoId,
      ])

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
          existingProject: duplicateProject.rows[0],
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

    res.json({
      success: true,
      data: resultProjetos.rows,
    })
  } catch (error) {
    console.error("❌ Erro ao listar projetos:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// ENDPOINTS PARA GERENCIAMENTO DE PUBLICAÇÕES

// 🆕 ENDPOINT CORRIGIDO: Criar nova publicação com autores usando nova estrutura
app.post("/api/publication/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params

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
    if (!title || !year) {
      return res.status(400).json({
        error: "Título e ano são obrigatórios",
      })
    }

    // Validar ano
    const currentYear = new Date().getFullYear()
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        error: "Ano inválido",
      })
    }

    // Validar autores
    if (!authors || !Array.isArray(authors) || authors.length === 0) {
      return res.status(400).json({
        error: "Pelo menos um autor é obrigatório",
      })
    }

    const validAuthors = authors.filter((author) => author.name && author.name.trim())
    if (validAuthors.length === 0) {
      return res.status(400).json({
        error: "Pelo menos um autor com nome válido é obrigatório",
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
      // Verificar se já existe uma publicação com o mesmo título para este usuário
      const checkExistingPublication = `
        SELECT id, nome
        FROM Trabalhos
        WHERE usuario_proprietario_id = $1 AND LOWER(TRIM(nome)) = LOWER(TRIM($2))
      `

      const existingPublication = await client.query(checkExistingPublication, [usuarioId, title])

      if (existingPublication.rows.length > 0) {
        await client.query("ROLLBACK")
        return res.status(409).json({
          error: "Já existe uma publicação com este título para este usuário",
          existingPublication: existingPublication.rows[0],
        })
      }

      // Criar nova publicação
      const insertPublicationQuery = `
        INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte, resumo, tipo_identificador, valor_identificador, links_adicionais, usuario_proprietario_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `

      const publicationResult = await client.query(insertPublicationQuery, [
        title.trim(),
        Number.parseInt(year),
        type || "journal-article",
        source?.trim() || null,
        abstract?.trim() || null,
        identifier?.type || null,
        identifier?.value?.trim() || null,
        links && Array.isArray(links) ? JSON.stringify(links) : null,
        usuarioId,
      ])

      const publicationId = publicationResult.rows[0].id

      // Salvar autores usando nova estrutura
      await salvarAutoresDoTrabalho(publicationId, validAuthors)

      await client.query("COMMIT")

      console.log(`✅ Nova publicação ${publicationId} criada para usuário ${orcid} com ${validAuthors.length} autores`)

      // Buscar publicação criada
      const newPublication = await buscarTrabalhoComAutores(publicationId)

      res.json({
        success: true,
        message: "Publicação criada com sucesso",
        data: newPublication,
      })
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

// 🆕 ENDPOINT CORRIGIDO: Atualizar publicação específica com autores usando nova estrutura
app.put("/api/publication/:orcid/:publicationId", async (req, res) => {
  try {
    const { orcid, publicationId } = req.params

    console.log(`🔧 Atualizando publicação ${publicationId} para ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    const { title, year, type, source, abstract, identifier, authors, links } = req.body

    // Validações básicas
    if (!title || !year) {
      return res.status(400).json({
        error: "Título e ano são obrigatórios",
      })
    }

    // Validar ano
    const currentYear = new Date().getFullYear()
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        error: "Ano inválido",
      })
    }

    // Validar autores
    if (!authors || !Array.isArray(authors) || authors.length === 0) {
      return res.status(400).json({
        error: "Pelo menos um autor é obrigatório",
      })
    }

    const validAuthors = authors.filter((author) => author.name && author.name.trim())
    if (validAuthors.length === 0) {
      return res.status(400).json({
        error: "Pelo menos um autor com nome válido é obrigatório",
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
      // Verificar se a publicação existe e pertence ao usuário
      const checkPublicationQuery = `
        SELECT id, nome
        FROM Trabalhos
        WHERE id = $1 AND usuario_proprietario_id = $2
      `

      const publicationExists = await client.query(checkPublicationQuery, [publicationId, usuarioId])

      if (publicationExists.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Publicação não encontrada ou não pertence ao usuário",
        })
      }

      // Verificar se já existe outra publicação com o mesmo título (exceto a atual)
      const checkDuplicateTitle = `
        SELECT id, nome
        FROM Trabalhos
        WHERE usuario_proprietario_id = $1 AND LOWER(TRIM(nome)) = LOWER(TRIM($2)) AND id != $3
      `

      const duplicatePublication = await client.query(checkDuplicateTitle, [usuarioId, title, publicationId])

      if (duplicatePublication.rows.length > 0) {
        await client.query("ROLLBACK")
        return res.status(409).json({
          error: "Já existe outra publicação com este título para este usuário",
          existingPublication: duplicatePublication.rows[0],
        })
      }

      // Atualizar publicação
      const updatePublicationQuery = `
        UPDATE Trabalhos 
        SET nome = $1, ano = $2, tipo_de_trabalho = $3, fonte = $4, 
            resumo = $5, tipo_identificador = $6, valor_identificador = $7, 
            links_adicionais = $8
        WHERE id = $9
      `

      const updateResult = await client.query(updatePublicationQuery, [
        title.trim(),
        Number.parseInt(year),
        type || "journal-article",
        source?.trim() || null,
        abstract?.trim() || null,
        identifier?.type || null,
        identifier?.value?.trim() || null,
        links && Array.isArray(links) ? JSON.stringify(links) : null,
        publicationId,
      ])

      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({
          error: "Publicação não foi encontrada para atualização",
        })
      }

      // Atualizar autores usando nova estrutura
      await salvarAutoresDoTrabalho(publicationId, validAuthors)

      await client.query("COMMIT")

      console.log(`✅ Publicação ${publicationId} atualizada para usuário ${orcid} com ${validAuthors.length} autores`)

      // Buscar publicação atualizada
      const updatedPublication = await buscarTrabalhoComAutores(publicationId)

      res.json({
        success: true,
        message: "Publicação atualizada com sucesso",
        data: updatedPublication,
      })
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
        SELECT id, nome
        FROM Trabalhos
        WHERE id = $1 AND usuario_proprietario_id = $2
      `

      const publicationExists = await client.query(checkPublicationQuery, [publicationId, usuarioId])

      if (publicationExists.rows.length === 0) {
        return res.status(404).json({
          error: "Publicação não encontrada ou não pertence ao usuário",
        })
      }

      // Remover autores da publicação
      await client.query("DELETE FROM AutoresDeTrabalhos WHERE trabalho_id = $1", [publicationId])

      // Remover a publicação
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

    // Buscar publicações do usuário com autores
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
            'ordem', a.ordem_autor
          ) ORDER BY a.ordem_autor
        ) FILTER (WHERE a.id IS NOT NULL) as autores
      FROM Trabalhos t
      LEFT JOIN AutoresDeTrabalhos a ON t.id = a.trabalho_id
      WHERE t.usuario_proprietario_id = $1
      GROUP BY t.id
      ORDER BY t.ano DESC
    `

    const resultPublicacoes = await client.query(queryPublicacoes, [usuarioId])

    res.json({
      success: true,
      data: resultPublicacoes.rows,
    })
  } catch (error) {
    console.error("❌ Erro ao listar publicações:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// ENDPOINTS PARA ORCID API

// Endpoint para obter token de acesso
app.post("/api/orcid/token", async (req, res) => {
  try {
    const { client_id, client_secret, grant_type, code, redirect_uri } = req.body

    const tokenUrl = "https://orcid.org/oauth/token"

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type,
        code,
        redirect_uri,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (error) {
    console.error("❌ Erro no proxy de token:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Endpoint para buscar perfis ORCID (público, sem autenticação)
app.get("/api/orcid/search", async (req, res) => {
  try {
    const { q, start = 0, rows = 10 } = req.query

    if (!q) {
      return res.status(400).json({
        error: "Parâmetro de busca 'q' é obrigatório",
      })
    }

    const searchUrl = `https://pub.orcid.org/v3.0/search/?q=${encodeURIComponent(q)}&start=${start}&rows=${rows}`

    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao buscar na API do ORCID",
      })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error("❌ Erro na busca ORCID:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// 🆕 ENDPOINT CORRIGIDO: Obter perfil ORCID com fallback para banco de dados
app.get("/api/orcid/profile/:orcid", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    console.log(`🔍 Buscando perfil ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Primeiro, tentar buscar no banco de dados
    const dadosBanco = await buscarUsuarioNoBanco(orcid)

    if (dadosBanco) {
      console.log(`✅ Dados encontrados no banco para ${orcid}`)
      return res.json(dadosBanco)
    }

    // Se não encontrou no banco, tentar buscar na API do ORCID
    console.log(`🌐 Buscando na API do ORCID para ${orcid}`)

    const profileUrl = `https://pub.orcid.org/v3.0/${orcid}`

    const headers = {
      Accept: "application/json",
    }

    // Se tem token de autorização, usar endpoint privado
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      headers.Authorization = `Bearer ${token}`
      // Usar endpoint privado se autenticado
      profileUrl.replace("pub.orcid.org", "api.orcid.org")
    }

    const response = await fetch(profileUrl, { headers })

    if (!response.ok) {
      console.log(`❌ Erro na API do ORCID: ${response.status}`)
      return res.status(response.status).json({
        error: "Erro ao buscar perfil na API do ORCID",
        status: response.status,
      })
    }

    const data = await response.json()

    // Se conseguiu dados da API, salvar no banco para próximas consultas
    if (data && data["orcid-identifier"]) {
      console.log(`💾 Salvando dados do ORCID ${orcid} no banco...`)
      await salvarUsuarioNoBanco(data)
    }

    console.log(`✅ Dados obtidos da API do ORCID para ${orcid}`)
    res.json(data)
  } catch (error) {
    console.error("❌ Erro ao buscar perfil ORCID:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// 🆕 ENDPOINT CORRIGIDO: Obter trabalhos ORCID com fallback para banco de dados
app.get("/api/orcid/profile/:orcid/works", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    console.log(`📚 Buscando trabalhos ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Primeiro, tentar buscar no banco de dados
    const dadosBanco = await buscarUsuarioNoBanco(orcid)

    if (dadosBanco && dadosBanco["activities-summary"]?.works) {
      console.log(`✅ Trabalhos encontrados no banco para ${orcid}`)
      return res.json(dadosBanco["activities-summary"].works)
    }

    // Se não encontrou no banco, tentar buscar na API do ORCID
    console.log(`🌐 Buscando trabalhos na API do ORCID para ${orcid}`)

    let worksUrl = `https://pub.orcid.org/v3.0/${orcid}/works`

    const headers = {
      Accept: "application/json",
    }

    // Se tem token de autorização, usar endpoint privado
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      headers.Authorization = `Bearer ${token}`
      worksUrl = `https://api.orcid.org/v3.0/${orcid}/works`
    }

    const response = await fetch(worksUrl, { headers })

    if (!response.ok) {
      console.log(`❌ Erro na API do ORCID: ${response.status}`)
      return res.status(response.status).json({
        error: "Erro ao buscar trabalhos na API do ORCID",
        status: response.status,
      })
    }

    const data = await response.json()

    console.log(`✅ Trabalhos obtidos da API do ORCID para ${orcid}`)
    res.json(data)
  } catch (error) {
    console.error("❌ Erro ao buscar trabalhos ORCID:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// 🆕 ENDPOINT CORRIGIDO: Obter trabalho individual ORCID com fallback para banco de dados
app.get("/api/orcid/profile/:orcid/work/:putCode", async (req, res) => {
  try {
    const { orcid, putCode } = req.params
    const authHeader = req.headers.authorization

    console.log(`📄 Buscando trabalho individual ORCID: ${orcid}/${putCode}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Primeiro, tentar buscar no banco de dados
    const usuarioId = await obterUsuarioIdPorOrcid(orcid)
    if (usuarioId) {
      const dadosBanco = await buscarTrabalhoNoBanco(usuarioId, putCode)
      if (dadosBanco) {
        console.log(`✅ Trabalho ${putCode} encontrado no banco para ${orcid}`)
        return res.json(dadosBanco)
      }
    }

    // Se não encontrou no banco, tentar buscar na API do ORCID
    console.log(`🌐 Buscando trabalho ${putCode} na API do ORCID para ${orcid}`)

    let workUrl = `https://pub.orcid.org/v3.0/${orcid}/work/${putCode}`

    const headers = {
      Accept: "application/json",
    }

    // Se tem token de autorização, usar endpoint privado
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      headers.Authorization = `Bearer ${token}`
      workUrl = `https://api.orcid.org/v3.0/${orcid}/work/${putCode}`
    }

    const response = await fetch(workUrl, { headers })

    if (!response.ok) {
      console.log(`❌ Erro na API do ORCID: ${response.status}`)
      return res.status(response.status).json({
        error: "Erro ao buscar trabalho na API do ORCID",
        status: response.status,
      })
    }

    const data = await response.json()

    // Se conseguiu dados da API e tem usuário no banco, salvar trabalho detalhado
    if (data && usuarioId) {
      console.log(`💾 Salvando trabalho detalhado ${putCode} no banco...`)
      await salvarTrabalhoDetalhado(usuarioId, data, putCode)
    }

    console.log(`✅ Trabalho ${putCode} obtido da API do ORCID para ${orcid}`)
    res.json(data)
  } catch (error) {
    console.error("❌ Erro ao buscar trabalho ORCID:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// 🆕 ENDPOINT CORRIGIDO: Obter financiamentos ORCID com fallback para banco de dados
app.get("/api/orcid/profile/:orcid/fundings", async (req, res) => {
  try {
    const { orcid } = req.params
    const authHeader = req.headers.authorization

    console.log(`💰 Buscando financiamentos ORCID: ${orcid}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Primeiro, tentar buscar no banco de dados
    const dadosBanco = await buscarUsuarioNoBanco(orcid)

    if (dadosBanco && dadosBanco["activities-summary"]?.fundings) {
      console.log(`✅ Financiamentos encontrados no banco para ${orcid}`)
      return res.json(dadosBanco["activities-summary"].fundings)
    }

    // Se não encontrou no banco, tentar buscar na API do ORCID
    console.log(`🌐 Buscando financiamentos na API do ORCID para ${orcid}`)

    let fundingsUrl = `https://pub.orcid.org/v3.0/${orcid}/fundings`

    const headers = {
      Accept: "application/json",
    }

    // Se tem token de autorização, usar endpoint privado
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      headers.Authorization = `Bearer ${token}`
      fundingsUrl = `https://api.orcid.org/v3.0/${orcid}/fundings`
    }

    const response = await fetch(fundingsUrl, { headers })

    if (!response.ok) {
      console.log(`❌ Erro na API do ORCID: ${response.status}`)
      return res.status(response.status).json({
        error: "Erro ao buscar financiamentos na API do ORCID",
        status: response.status,
      })
    }

    const data = await response.json()

    console.log(`✅ Financiamentos obtidos da API do ORCID para ${orcid}`)
    res.json(data)
  } catch (error) {
    console.error("❌ Erro ao buscar financiamentos ORCID:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// 🆕 ENDPOINT CORRIGIDO: Obter financiamento individual ORCID com fallback para banco de dados
app.get("/api/orcid/profile/:orcid/funding/:putCode", async (req, res) => {
  try {
    const { orcid, putCode } = req.params
    const authHeader = req.headers.authorization

    console.log(`💰 Buscando financiamento individual ORCID: ${orcid}/${putCode}`)

    // Validar formato do ORCID
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return res.status(400).json({
        error: "Invalid ORCID format. Expected format: 0000-0000-0000-0000",
      })
    }

    // Primeiro, tentar buscar no banco de dados
    const usuarioId = await obterUsuarioIdPorOrcid(orcid)
    if (usuarioId) {
      const dadosBanco = await buscarProjetoNoBanco(usuarioId, putCode)
      if (dadosBanco) {
        console.log(`✅ Financiamento ${putCode} encontrado no banco para ${orcid}`)
        return res.json(dadosBanco)
      }
    }

    // Se não encontrou no banco, tentar buscar na API do ORCID
    console.log(`🌐 Buscando financiamento ${putCode} na API do ORCID para ${orcid}`)

    let fundingUrl = `https://pub.orcid.org/v3.0/${orcid}/funding/${putCode}`

    const headers = {
      Accept: "application/json",
    }

    // Se tem token de autorização, usar endpoint privado
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      headers.Authorization = `Bearer ${token}`
      fundingUrl = `https://api.orcid.org/v3.0/${orcid}/funding/${putCode}`
    }

    const response = await fetch(fundingUrl, { headers })

    if (!response.ok) {
      console.log(`❌ Erro na API do ORCID: ${response.status}`)
      return res.status(response.status).json({
        error: "Erro ao buscar financiamento na API do ORCID",
        status: response.status,
      })
    }

    const data = await response.json()

    // Se conseguiu dados da API e tem usuário no banco, salvar projeto detalhado
    if (data && usuarioId) {
      console.log(`💾 Salvando projeto detalhado ${putCode} no banco...`)
      await salvarProjetoDetalhado(usuarioId, data, putCode)
    }

    console.log(`✅ Financiamento ${putCode} obtido da API do ORCID para ${orcid}`)
    res.json(data)
  } catch (error) {
    console.error("❌ Erro ao buscar financiamento ORCID:", error)
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    })
  }
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`📡 Endpoints disponíveis em http://localhost:${PORT}`)
  console.log(`🆕 Versão com suporte completo a associações projeto-publicação!`)
})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Encerrando servidor...")
  await client.end()
  console.log("📦 Conexão com PostgreSQL encerrada")
  process.exit(0)
})
