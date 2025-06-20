"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import type { Publication, Project } from "../types"
import { toast } from "@/hooks/use-toast"

interface EditPublicationPageProps {
  publications: Publication[]
  projects: Project[]
  onUpdatePublication: (publication: Publication) => void
  isAuthenticated: boolean
  token: string | null
  orcidId?: string
  researcher?: any
}

const EditPublicationPage: React.FC<EditPublicationPageProps> = ({
  publications,
  projects,
  onUpdatePublication,
  isAuthenticated,
  token,
  orcidId,
  researcher,
}) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [publication, setPublication] = useState<Publication | null>(null)
  const [saving, setSaving] = useState(false)

  // Debug: log dos dados recebidos
  useEffect(() => {
    console.log("🔧 EditPublicationPage - Dados recebidos:")
    console.log("- ORCID ID:", orcidId)
    console.log("- Researcher:", researcher)
    console.log("- Publications:", publications)
    console.log("- Publication ID from URL:", id)
  }, [orcidId, researcher, publications, id])

  // Carrega a publicação pelos dados já disponíveis
  useEffect(() => {
    if (!id) return

    const foundPub = publications.find((p) => p.id === id)

    if (foundPub) {
      const publicationCopy = JSON.parse(JSON.stringify(foundPub))
      setPublication(publicationCopy)
      console.log("✅ Publicação encontrada:", publicationCopy)
    } else if (id && publications.length > 0) {
      console.log("❌ Publicação não encontrada na lista")
      console.log("- Procurando ID:", id)
      console.log(
        "- IDs disponíveis:",
        publications.map((p) => p.id),
      )

      toast({
        title: "Publicação não encontrada",
        description: "A publicação solicitada não foi encontrada.",
        variant: "destructive",
      })
      navigate("/publications")
    }
  }, [id, publications, navigate])

  const handleSave = async () => {
    if (!publication) return
    setSaving(true)

    try {
      // Verificar se temos o ORCID ID
      let currentOrcidId = orcidId

      // Se não temos orcidId, tentar extrair do researcher
      if (!currentOrcidId && researcher) {
        currentOrcidId = researcher.orcidId || researcher["orcid-identifier"]?.path
      }

      console.log("🔧 Salvando publicação:")
      console.log("- ORCID ID usado:", currentOrcidId)
      console.log("- Publication ID:", publication.id)
      console.log("- Publication data:", publication)

      if (!currentOrcidId) {
        throw new Error("ORCID ID não encontrado. Verifique se o usuário está logado corretamente.")
      }

      // Preparar dados para envio
      const publicationData = {
        title: publication.title,
        year: publication.year,
        type: publication.type,
        source: publication.source,
        abstract: publication.abstract,
        identifier: publication.identifier,
        authors: publication.authors,
        links: publication.links,
      }

      console.log("📤 Enviando dados:", publicationData)

      // Fazer requisição para o endpoint
      const response = await fetch(`http://localhost:3000/api/publication/${currentOrcidId}/${publication.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(publicationData),
      })

      const result = await response.json()

      console.log("📥 Resposta do servidor:", result)

      if (!response.ok) {
        console.error("❌ Erro na resposta:", result)
        throw new Error(result.error || "Erro ao salvar publicação")
      }

      // Converter dados do banco para formato Publication se necessário
      if (result.data) {
        const updatedPublication = mapOrcidDataToPublication(result.data, publication.id)
        onUpdatePublication(updatedPublication)
      } else {
        onUpdatePublication(publication)
      }

      toast({
        title: "Publicação salva",
        description: "As alterações foram salvas com sucesso.",
      })

      navigate("/publications")
    } catch (error) {
      console.error("❌ Erro ao salvar publicação:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Função auxiliar para converter dados do ORCID para formato Publication
  const mapOrcidDataToPublication = (orcidData: any, publicationId: string): Publication => {
    return {
      id: publicationId,
      title: orcidData.title?.title?.value || orcidData.nome || "Publicação sem título",
      year: orcidData["publication-date"]?.year?.value || orcidData.ano || new Date().getFullYear(),
      type: orcidData.type || orcidData.tipo_de_trabalho || "journal-article",
      source: orcidData["journal-title"]?.value || orcidData.fonte || "",
      abstract: orcidData["short-description"] || orcidData.resumo || "",
      identifier: {
        type: orcidData["external-ids"]?.["external-id"]?.[0]?.["external-id-type"] || "",
        value: orcidData["external-ids"]?.["external-id"]?.[0]?.["external-id-value"] || "",
      },
      authors: [{ name: "Autor Principal", orcidId: "" }], // Simplificado
      links: [],
      project: "",
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPublication((prev) => {
      if (!prev) return prev
      return { ...prev, [name]: value }
    })
  }

  const handleAuthorChange = (index: number, field: string, value: string) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newAuthors = [...prev.authors]
      newAuthors[index] = { ...newAuthors[index], [field]: value }
      return { ...prev, authors: newAuthors }
    })
  }

  const addAuthor = () => {
    setPublication((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        authors: [...prev.authors, { name: "", orcidId: "" }],
      }
    })
  }

  const removeAuthor = (index: number) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newAuthors = [...prev.authors]
      newAuthors.splice(index, 1)
      return { ...prev, authors: newAuthors }
    })
  }

  const handleLinkChange = (index: number, field: string, value: string) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newLinks = [...prev.links]
      newLinks[index] = { ...newLinks[index], [field]: value }
      return { ...prev, links: newLinks }
    })
  }

  const addLink = () => {
    setPublication((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        links: [...prev.links, { name: "", url: "" }],
      }
    })
  }

  const removeLink = (index: number) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newLinks = [...prev.links]
      newLinks.splice(index, 1)
      return { ...prev, links: newLinks }
    })
  }

  // Loading state enquanto não carregou a publicação
  if (!publication) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="text-center">
          <p>Carregando dados da publicação...</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Debug Info:</p>
            <p>ORCID ID: {orcidId || "não encontrado"}</p>
            <p>Publication ID: {id}</p>
            <p>Total Publications: {publications.length}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-blue-800">Editar Publicação</h1>
      </div>

      {/* Debug info - remover em produção */}
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <p>
          <strong>Debug Info:</strong>
        </p>
        <p>ORCID ID: {orcidId || "não encontrado"}</p>
        <p>Publication ID: {publication.id}</p>
        <p>Publication Title: {publication.title}</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" value={publication.title} onChange={handleChange} className="mt-1" />
          </div>

          <div>
            <Label>Autores</Label>
            <div className="space-y-3 mt-2">
              {publication.authors.map((author, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome"
                    value={author.name}
                    onChange={(e) => handleAuthorChange(index, "name", e.target.value)}
                  />
                  <Input
                    placeholder="ORCID ID"
                    value={author.orcidId}
                    onChange={(e) => handleAuthorChange(index, "orcidId", e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeAuthor(index)}
                    disabled={publication.authors.length <= 1}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addAuthor} className="flex items-center gap-2">
                <Plus size={16} /> Adicionar autor
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                name="year"
                type="number"
                value={publication.year}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                value={publication.type}
                onChange={handleChange}
                className="w-full mt-1 border border-gray-300 rounded-md p-2"
              >
                <option value="Journal Article">Journal Article</option>
                <option value="Conference Paper">Conference Paper</option>
                <option value="Book Chapter">Book Chapter</option>
                <option value="Book">Book</option>
                <option value="Report">Report</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="source">Fonte</Label>
            <Input id="source" name="source" value={publication.source} onChange={handleChange} className="mt-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="identifier.type">Tipo de Identificador</Label>
              <select
                id="identifier.type"
                value={publication.identifier.type}
                onChange={(e) => {
                  setPublication((prev) => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      identifier: { ...prev.identifier, type: e.target.value },
                    }
                  })
                }}
                className="w-full mt-1 border border-gray-300 rounded-md p-2"
              >
                <option value="DOI">DOI</option>
                <option value="ISBN">ISBN</option>
                <option value="ISSN">ISSN</option>
                <option value="PMID">PMID</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="identifier.value">Valor do Identificador</Label>
              <Input
                id="identifier.value"
                value={publication.identifier.value}
                onChange={(e) => {
                  setPublication((prev) => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      identifier: { ...prev.identifier, value: e.target.value },
                    }
                  })
                }}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="project">Projeto</Label>
            <select
              id="project"
              name="project"
              value={publication.project || ""}
              onChange={handleChange}
              className="w-full mt-1 border border-gray-300 rounded-md p-2"
            >
              <option value="">Nenhum projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="abstract">Resumo</Label>
            <Textarea
              id="abstract"
              name="abstract"
              value={publication.abstract}
              onChange={handleChange}
              rows={5}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Links</Label>
            <div className="space-y-3 mt-2">
              {publication.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome"
                    value={link.name}
                    onChange={(e) => handleLinkChange(index, "name", e.target.value)}
                  />
                  <Input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                  />
                  <Button variant="destructive" size="icon" onClick={() => removeLink(index)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addLink} className="flex items-center gap-2">
                <Plus size={16} /> Adicionar link
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default EditPublicationPage
