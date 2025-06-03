
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const NewProjectPage = () => {
  const navigate = useNavigate();
  
  const [project, setProject] = useState({
    name: '',
    startYear: new Date().getFullYear(),
    endYear: '',
    funding: '',
    fundingAgency: '',
    role: '',
    description: '',
    status: 'Em andamento'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Validação básica
    if (!project.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do projeto é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (!project.description.trim()) {
      toast({
        title: "Erro",
        description: "A descrição do projeto é obrigatória.",
        variant: "destructive"
      });
      return;
    }

    if (project.endYear && parseInt(project.endYear) < project.startYear) {
      toast({
        title: "Erro",
        description: "O ano de término não pode ser anterior ao ano de início.",
        variant: "destructive"
      });
      return;
    }

    // Em um app real, enviaria para a API
    toast({
      title: "Projeto criado",
      description: "O novo projeto foi criado com sucesso.",
    });
    navigate('/projects');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-blue-800">Novo Projeto de Pesquisa</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input 
              id="name" 
              name="name" 
              value={project.name} 
              onChange={handleChange} 
              className="mt-1"
              placeholder="Digite o nome do projeto"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startYear">Ano de Início *</Label>
              <Input 
                id="startYear" 
                name="startYear" 
                type="number"
                value={project.startYear} 
                onChange={handleChange} 
                className="mt-1"
                min="1900"
                max={new Date().getFullYear() + 10}
              />
            </div>
            <div>
              <Label htmlFor="endYear">Ano de Término</Label>
              <Input 
                id="endYear" 
                name="endYear" 
                type="number"
                value={project.endYear} 
                onChange={handleChange} 
                className="mt-1"
                placeholder="Deixe em branco se em andamento"
                min={project.startYear}
                max={new Date().getFullYear() + 20}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status do Projeto</Label>
            <select
              id="status" 
              name="status" 
              value={project.status} 
              onChange={handleChange} 
              className="w-full mt-1 border border-gray-300 rounded-md p-2"
            >
              <option value="Em andamento">Em andamento</option>
              <option value="Planejado">Planejado</option>
              <option value="Concluído">Concluído</option>
              <option value="Suspenso">Suspenso</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <Label htmlFor="role">Seu Papel no Projeto</Label>
            <select
              id="role" 
              name="role" 
              value={project.role} 
              onChange={handleChange} 
              className="w-full mt-1 border border-gray-300 rounded-md p-2"
            >
              <option value="">Selecione seu papel</option>
              <option value="Coordenador">Coordenador</option>
              <option value="Pesquisador Principal">Pesquisador Principal</option>
              <option value="Pesquisador">Pesquisador</option>
              <option value="Colaborador">Colaborador</option>
              <option value="Estudante">Estudante</option>
              <option value="Consultor">Consultor</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fundingAgency">Agência de Fomento</Label>
              <Input 
                id="fundingAgency" 
                name="fundingAgency" 
                value={project.fundingAgency} 
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
                value={project.funding} 
                onChange={handleChange} 
                className="mt-1"
                placeholder="Ex: R$ 100.000,00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição do Projeto *</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={project.description} 
              onChange={handleChange} 
              rows={6}
              className="mt-1"
              placeholder="Descreva os objetivos, metodologia e relevância do projeto"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Dicas para uma boa descrição:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Descreva claramente os objetivos do projeto</li>
              <li>• Mencione a metodologia que será utilizada</li>
              <li>• Explique a relevância e impacto esperado</li>
              <li>• Inclua palavras-chave da sua área de pesquisa</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Save size={18} /> Criar projeto
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NewProjectPage;
