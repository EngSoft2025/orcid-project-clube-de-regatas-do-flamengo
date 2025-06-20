"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import type { Project } from "../types"
import { toast } from "@/hooks/use-toast"

interface EditProjectPageProps {
  projects: Project[]
  onUpdateProject: (project: Project) => void
  isAuthenticated: boolean
  token: string | null
  orcidId?: string
}

const EditProjectPage: React.FC<EditProjectPageProps> = ({
  projects,
  onUpdateProject,
  isAuthenticated,
  token,
  orcidId,
}) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)

  // Carrega o projeto pelos dados já disponíveis
  useEffect(() => {
    if (!id) return
    console.log(projects)

    const foundProject = projects.find((p) => p.id === id)
    const meu_item = JSON.parse(JSON.stringify(foundProject))

    if (foundProject) {
      // Cria uma cópia para edição
      setProject(meu_item)
    }

    if (id && projects.length > 0 && !meu_item) {
      toast({
        title: "Projeto não encontrado",
        description: "O projeto solicitado não foi encontrado.",
        variant: "destructive",
      })
      navigate("/projects")
    }
  }, [id, projects])

  const handleSave = async () => {
    if (!project) return
    setSaving(true)

    try {
      if (!orcidId) {
        throw new Error("ORCID ID não encontrado")
      }

      console.log("Salvando projeto via API...", project)

      // Preparar dados para envio
      const projectData = {
        name: project.name,
        startYear: project.startYear,
        endYear: project.endYear,
        fundingAgency: project.fundingAgency,
        funding: project.funding,
        role: project.role,
        description: project.description,
      }

      // Fazer requisição para o endpoint
      const response = await fetch(`http://localhost:3000/api/project/${orcidId}/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(projectData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar projeto")
      }

      // Converter dados do banco para formato Project se necessário
      if (result.data) {
        const updatedProject = mapOrcidDataToProject(result.data, project.id)
        onUpdateProject(updatedProject)
      } else {
        onUpdateProject(project)
      }

      toast({
        title: "Projeto salvo",
        description: "As alterações foram salvas com sucesso.",
      })

      navigate("/projects")
    } catch (error) {
      console.error("Erro ao salvar projeto:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Função auxiliar para converter dados do ORCID para formato Project
  const mapOrcidDataToProject = (orcidData: any, projectId: string): Project => {
    return {
      id: projectId,
      name: orcidData.title?.title?.value || orcidData.nome || "Projeto sem título",
      startYear: orcidData["start-date"]?.year?.value || orcidData.ano_inicio || new Date().getFullYear(),
      endYear: orcidData["end-date"]?.year?.value || orcidData.ano_termino || undefined,
      fundingAgency: orcidData.organization?.name || orcidData.agencia_de_financiamento || "",
      funding: orcidData.amount?.value || orcidData.financiamento || "",
      role: orcidData.funcao_no_projeto || "",
      description: orcidData["short-description"] || orcidData.descricao || "",
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProject((prev) => {
      if (!prev) return prev
      return { ...prev, [name]: value }
    })
  }

  // Loading state enquanto não carregou o projeto
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <p>Carregando dados do projeto...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-blue-800">Editar Projeto</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="name">Nome do Projeto</Label>
            <Input id="name" name="name" value={project.name} onChange={handleChange} className="mt-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startYear">Ano de Início</Label>
              <Input
                id="startYear"
                name="startYear"
                type="number"
                value={project.startYear}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endYear">Ano de Término</Label>
              <Input
                id="endYear"
                name="endYear"
                type="number"
                value={project.endYear || ""}
                onChange={handleChange}
                className="mt-1"
                placeholder="Em andamento..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fundingAgency">Agência de Fomento</Label>
              <Input
                id="fundingAgency"
                name="fundingAgency"
                value={project.fundingAgency || ""}
                onChange={handleChange}
                className="mt-1"
                placeholder="Ex: FAPESP, CNPq, CAPES"
              />
            </div>
            <div>
              <Label htmlFor="funding">Valor do Financiamento</Label>
              <Input
                id="funding"
                name="funding"
                value={project.funding || ""}
                onChange={handleChange}
                className="mt-1"
                placeholder="Ex: R$ 100.000,00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role">Seu Papel no Projeto</Label>
            <Input
              id="role"
              name="role"
              value={project.role || ""}
              onChange={handleChange}
              className="mt-1"
              placeholder="Ex: Coordenador, Pesquisador, etc."
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={project.description}
              onChange={handleChange}
              rows={5}
              className="mt-1"
            />
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

export default EditProjectPage
