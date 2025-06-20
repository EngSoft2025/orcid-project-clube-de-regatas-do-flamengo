"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Save, LinkIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { Publication, Project } from "../types"

interface EditPublicationPageProps {
  publications: Publication[]
  projects: Project[]
  onUpdatePublication: (publication: Publication) => void
  isAuthenticated?: boolean
  token?: string | null
  orcidId?: string
}

const EditPublicationPage: React.FC<EditPublicationPageProps> = ({
  publications,
  projects = [],
  onUpdatePublication,
  isAuthenticated,
  token,
  orcidId,
}) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [publication, setPublication] = useState<Publication | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Carregar publicação e projeto associado
  useEffect(() => {
    const loadPublicationData = async () => {
      if (!id) {
        navigate("/publications")
        return
      }

      // Encontrar publicação
      const foundPublication = publications.find((pub) => pub.id === id)
      if (!foundPublication) {
        toast({
          title: "Erro",
          description: "Publicação não encontrada.",
          variant: "destructive",
        })
        navigate("/publications")
        return
      }

      setPublication(foundPublication)

      // Carregar projeto associado se existir
      if (foundPublication.id && orcidId) {
        try {
          const response = await fetch(`http://localhost:3000/api/publication/${foundPublication.id}/projects`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data.length > 0) {
              setSelectedProjectId(result.data[0].id.toString())
            }
          }
        } catch (error) {
          console.error("Erro ao carregar projeto associado:", error)
        }
      }

      setLoading(false)
    }

    loadPublicationData()
  }, [id, publications, navigate, orcidId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!publication) return

    const { name, value } = e.target
    setPublication((prev) => ({
      ...prev!,
      [name]: value,
    }))
  }

  const handleAuthorChange = (index: number, field: string, value: string) => {
    if (!publication) return

    setPublication((prev) => {
      const newAuthors = [...prev!.authors]
      newAuthors[index] = { ...newAuthors[index], [field]: value }
      return { ...prev!, authors: newAuthors }
    })
  }

  const addAuthor = () => {
    if (!publication) return

    setPublication((prev) => ({
      ...prev!,
      authors: [...prev!.authors, { name: "", orcidId: "" }],
    }))
  }

  const removeAuthor = (index: number) => {
    if (!publication) return

    setPublication((prev) => {
      const newAuthors = [...prev!.authors]
      newAuthors.splice(index, 1)
      return { ...prev!, authors: newAuthors }
    })
  }

  const handleLinkChange = (index: number, field: string, value: string) => {
    if (!publication) return

    setPublication((prev) => {
      const newLinks = [...prev!.links]
      newLinks[index] = { ...newLinks[index], [field]: value }
      return { ...prev!, links: newLinks }
    })
  }

  const addLink = () => {
    if (!publication) return

    setPublication((prev) => ({
      ...prev!,
      links: [...prev!.links, { name: "", url: "" }],
    }))
  }

  const removeLink = (index: number) => {
    if (!publication) return

    setPublication((prev) => {
      const newLinks = [...prev!.links]
      newLinks.splice(index, 1)
      return { ...prev!, links: newLinks }
    })
  }

  const handleProjectAssociation = async (newProjectId: string) => {
    if (!publication?.id || !orcidId) return

    try {
      // Se havia um projeto associado anteriormente, remover a associação
      if (selectedProjectId && selectedProjectId !== newProjectId) {
        await fetch(`http://localhost:3000/api/projetoTrabalho/${publication.id}/${selectedProjectId}`, {
          method: "DELETE",
        })
      }

      // Se selecionou um novo projeto, criar a associação
      if (newProjectId && newProjectId !== selectedProjectId) {
        const response = await fetch(`http://localhost:3000/api/projetoTrabalho/${publication.id}/${newProjectId}`, {
          method: "POST",
        })

        if (!response.ok) {
          throw new Error("Erro ao associar projeto")
        }
      }

      setSelectedProjectId(newProjectId)

      toast({
        title: "Sucesso",
        description: newProjectId ? "Projeto associado com sucesso" : "Associação com projeto removida",
      })
    } catch (error) {
      console.error("Erro ao gerenciar associação:", error)
      toast({
        title: "Erro",
        description: "Não foi possível gerenciar a associação com o projeto.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!publication) return

    // Validação básica
    if (!publication.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da publicação é obrigatório.",
        variant: "destructive",
      })
      return
    }

    // Validar autores - pelo menos um autor com nome
    const validAuthors = publication.authors.filter((author) => author.name.trim())
    if (validAuthors.length === 0) {
      toast({
        title: "Erro",
        description: "Pelo menos um autor com nome é obrigatório.",
        variant: "destructive",
      })
      return
    }

    if (!orcidId) {
      toast({
        title: "Erro",
        description: "ORCID ID não encontrado. Faça login novamente.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      console.log("Atualizando publicação via API...", publication)

      // Filtrar links válidos
      const validLinks = publication.links.filter((link) => link.name.trim() && link.url.trim())

      // Preparar dados para envio
      const publicationData = {
        title: publication.title.trim(),
        year: publication.year,
        type: publication.type,
        source: publication.source.trim() || null,
        abstract: publication.abstract.trim() || null,
        identifier: publication.identifier.value.trim()
          ? {
              type: publication.identifier.type,
              value: publication.identifier.value.trim(),
            }
          : null,
        authors: validAuthors, // Enviar apenas autores válidos
        links: validLinks.length > 0 ? validLinks : null,
      }

      console.log("📤 Enviando dados atualizados:", publicationData)

      // Fazer requisição para o endpoint
      const response = await fetch(`http://localhost:3000/api/publication/${orcidId}/${publication.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(publicationData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar publicação")
      }

      // Atualizar publicação localmente
      const updatedPublication = {
        ...publication,
        title: publicationData.title,
        year: publicationData.year,
        type: publicationData.type,
        source: publicationData.source || "",
        abstract: publicationData.abstract || "",
        identifier: publicationData.identifier || { type: "doi", value: "" },
        authors: validAuthors,
        links: validLinks,
      }

      onUpdatePublication(updatedPublication)

      toast({
        title: "Publicação atualizada",
        description: `A publicação foi atualizada com sucesso com ${validAuthors.length} autor(es).`,
      })

      navigate("/publications")
    } catch (error) {
      console.error("Erro ao atualizar publicação:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar a publicação.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!publication) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Publicação não encontrada</h1>
          <Button onClick={() => navigate("/publications")}>Voltar para Publicações</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-blue-800">Editar Publicação</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  value={publication.title}
                  onChange={handleChange}
                  className="mt-1"
                  placeholder="Digite o título da publicação"
                />
              </div>

              <div>
                <Label>Autores *</Label>
                <div className="space-y-3 mt-2">
                  {publication.authors.map((author, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Nome do autor"
                        value={author.name}
                        onChange={(e) => handleAuthorChange(index, "name", e.target.value)}
                      />
                      <Input
                        placeholder="ORCID ID (opcional)"
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
                  <Label htmlFor="year">Ano *</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    value={publication.year}
                    onChange={handleChange}
                    className="mt-1"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <select
                    id="type"
                    name="type"
                    value={publication.type}
                    onChange={handleChange}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2"
                  >
                    <option value="journal-article">Artigo de Revista</option>
                    <option value="conference-paper">Artigo de Conferência</option>
                    <option value="book-chapter">Capítulo de Livro</option>
                    <option value="book">Livro</option>
                    <option value="report">Relatório</option>
                    <option value="thesis">Tese</option>
                    <option value="dissertation">Dissertação</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="source">Fonte/Revista</Label>
                <Input
                  id="source"
                  name="source"
                  value={publication.source}
                  onChange={handleChange}
                  className="mt-1"
                  placeholder="Nome da revista, conferência ou editora"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="identifier.type">Tipo de Identificador</Label>
                  <select
                    id="identifier.type"
                    value={publication.identifier.type}
                    onChange={(e) => {
                      setPublication((prev) => ({
                        ...prev!,
                        identifier: { ...prev!.identifier, type: e.target.value },
                      }))
                    }}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2"
                  >
                    <option value="doi">DOI</option>
                    <option value="isbn">ISBN</option>
                    <option value="issn">ISSN</option>
                    <option value="pmid">PMID</option>
                    <option value="arxiv">arXiv</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="identifier.value">Valor do Identificador</Label>
                  <Input
                    id="identifier.value"
                    value={publication.identifier.value}
                    onChange={(e) => {
                      setPublication((prev) => ({
                        ...prev!,
                        identifier: { ...prev!.identifier, value: e.target.value },
                      }))
                    }}
                    className="mt-1"
                    placeholder="Ex: 10.1000/xyz123"
                  />
                </div>
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
                  placeholder="Digite o resumo da publicação"
                />
              </div>

              <div>
                <Label>Links Adicionais (opcional)</Label>
                <div className="space-y-3 mt-2">
                  {publication.links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Nome do link"
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
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                  <Save size={16} />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar - Associação com Projetos */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <LinkIcon size={18} />
              Projeto Associado
            </h3>

            {projects.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-select">Selecionar Projeto</Label>
                  <select
                    id="project-select"
                    value={selectedProjectId}
                    onChange={(e) => handleProjectAssociation(e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2"
                  >
                    <option value="">Nenhum projeto</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProjectId && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Projeto Selecionado:</h4>
                    {(() => {
                      const selectedProject = projects.find((p) => p.id === selectedProjectId)
                      return selectedProject ? (
                        <div className="text-sm text-blue-700">
                          <p className="font-medium">{selectedProject.name}</p>
                          <p>
                            {selectedProject.startYear} - {selectedProject.endYear || "Em andamento"}
                          </p>
                          {selectedProject.fundingAgency && <p>{selectedProject.fundingAgency}</p>}
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-sm">Nenhum projeto disponível</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/new-project")}>
                  Criar Projeto
                </Button>
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Dica:</h4>
              <p className="text-xs text-gray-600">
                Associe esta publicação a um projeto para facilitar a organização e relatórios.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default EditPublicationPage
