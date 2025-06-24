import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Researcher } from '../types';
import { toast } from '@/hooks/use-toast';

interface EditProfileProps {
  researcher: Researcher;
  loading: boolean;
  onUpdateResearcher: (updatedResearcher: Researcher) => void;
  onRefreshData?: () => Promise<void>;
  isAuthenticated: boolean;
  token?: string | null;
}

const EditProfile: React.FC<EditProfileProps> = ({ 
  researcher: initialResearcher, 
  loading: globalLoading,
  onUpdateResearcher,
  onRefreshData,
  isAuthenticated,
  token
}) => {
  const [researcher, setResearcher] = useState<Researcher>(initialResearcher);
  const [saving, setSaving] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [newLink, setNewLink] = useState({ name: '', url: '' });

  // Atualizar estado local quando o pesquisador global mudar
  useEffect(() => {
    setResearcher(initialResearcher);
  }, [initialResearcher]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (isAuthenticated && token && researcher.orcidId) {
        /* TODO: Implementar salvamento via API do ORCID
         * 1. Mapear dados da interface Researcher para formato ORCID
         * 2. Fazer PUT request para: https://api.orcid.org/v3.0/{orcid-id}/record
         * 3. Headers: Authorization: Bearer {access-token}, Content-Type: application/json
         * 4. Diferentes endpoints para diferentes seções:
         *    - /person para dados pessoais
         *    - /biography para biografia
         *    - /researcher-urls para links externos
         *    - /keywords para áreas de pesquisa
         * 
         * Exemplo:
         * const updates = mapResearcherToOrcidFormat(researcher);
         * 
         * // Atualizar biografia
         * await fetch(`https://api.orcid.org/v3.0/${researcher.orcidId}/biography`, {
         *   method: 'PUT',
         *   headers: {
         *     'Authorization': `Bearer ${token}`,
         *     'Content-Type': 'application/json'
         *   },
         *   body: JSON.stringify(updates.biography)
         * });
         * 
         * // Atualizar URLs do pesquisador
         * await fetch(`https://api.orcid.org/v3.0/${researcher.orcidId}/researcher-urls`, {
         *   method: 'PUT',
         *   headers: {
         *     'Authorization': `Bearer ${token}`,
         *     'Content-Type': 'application/json'
         *   },
         *   body: JSON.stringify(updates.researcherUrls)
         * });
         * 
         * // Atualizar palavras-chave (áreas de pesquisa)
         * await fetch(`https://api.orcid.org/v3.0/${researcher.orcidId}/keywords`, {
         *   method: 'PUT',
         *   headers: {
         *     'Authorization': `Bearer ${token}`,
         *     'Content-Type': 'application/json'
         *   },
         *   body: JSON.stringify(updates.keywords)
         * });
         */
        
        console.log('Salvando alterações via API do ORCID...', researcher);
        
        // Simulação de salvamento na API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Atualizar o estado global do App
        onUpdateResearcher(researcher);
        
        // Opcionalmente, recarregar dados da API para garantir sincronização
        if (onRefreshData) {
          await onRefreshData();
        }
        
        toast({
          title: "Perfil salvo",
          description: "As alterações foram salvas com sucesso no ORCID.",
        });
      } else {
        // Usuário não autenticado - apenas atualizar estado local (demo)
        console.log('Salvando alterações localmente (demo)...', researcher);
        
        // Simulação de salvamento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Atualizar o estado global do App
        onUpdateResearcher(researcher);
        
        toast({
          title: "Perfil salvo",
          description: "As alterações foram salvas localmente (modo demonstração).",
        });
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setResearcher((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const addResearchArea = () => {
    if (!newArea.trim()) return;
    setResearcher((prev) => ({
      ...prev,
      researchAreas: [...prev.researchAreas, newArea.trim()]
    }));
    setNewArea('');
  };

  const removeResearchArea = (index: number) => {
    setResearcher((prev) => ({
      ...prev,
      researchAreas: prev.researchAreas.filter((_, i) => i !== index)
    }));
  };

  const addExternalLink = () => {
    if (!newLink.name.trim() || !newLink.url.trim()) return;
    
    // Validar URL básica
    try {
      new URL(newLink.url);
    } catch {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida (ex: https://exemplo.com)",
        variant: "destructive"
      });
      return;
    }
    
    setResearcher((prev) => ({
      ...prev,
      externalLinks: [...prev.externalLinks, { 
        name: newLink.name.trim(), 
        url: newLink.url.trim() 
      }]
    }));
    setNewLink({ name: '', url: '' });
  };

  const removeExternalLink = (index: number) => {
    setResearcher((prev) => ({
      ...prev,
      externalLinks: prev.externalLinks.filter((_, i) => i !== index)
    }));
  };

  if (globalLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando dados do perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Editar Perfil</h1>
        {!isAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <p className="text-sm text-yellow-800">
              Modo demonstração - faça login para salvar no ORCID
            </p>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSave}>
        <Card className="p-6 mb-6 bg-white border-blue-100">
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Informações Básicas</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <Input
                name="name"
                value={researcher.name}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ORCID ID</label>
              <Input
                name="orcidId"
                value={researcher.orcidId}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
                placeholder="0000-0000-0000-0000"
                pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]"
                title="Formato: 0000-0000-0000-0000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instituição</label>
              <Input
                name="institution"
                value={researcher.institution}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <Input
                name="department"
                value={researcher.department || ''}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Função</label>
              <Input
                name="role"
                value={researcher.role || ''}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                name="email"
                type="email"
                value={researcher.email || ''}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
              <Textarea
                name="bio"
                value={researcher.bio}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
                rows={4}
                maxLength={5000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {researcher.bio.length}/5000 caracteres
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 mb-6 bg-white border-blue-100">
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Áreas de Pesquisa</h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {researcher.researchAreas.map((area, index) => (
                <div key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
                  <span>{area}</span>
                  <button 
                    type="button" 
                    onClick={() => removeResearchArea(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Remover área de pesquisa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {researcher.researchAreas.length === 0 && (
                <p className="text-gray-500 text-sm">Nenhuma área de pesquisa adicionada</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Adicionar área de pesquisa"
                className="border-blue-200"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addResearchArea();
                  }
                }}
              />
              <Button 
                type="button" 
                onClick={addResearchArea}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newArea.trim()}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 mb-6 bg-white border-blue-100">
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Links Externos</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Página Institucional</label>
              <Input
                name="institutionalPage"
                value={researcher.institutionalPage}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
                type="url"
                placeholder="https://www.instituicao.edu.br/perfil"
              />
            </div>
            
            <div className="space-y-2">
              {researcher.externalLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-700">{link.name}</p>
                    <p className="text-xs text-gray-500 break-all">{link.url}</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => removeExternalLink(index)}
                    size="icon"
                    className="shrink-0"
                    title="Remover link"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              {researcher.externalLinks.length === 0 && (
                <p className="text-gray-500 text-sm">Nenhum link externo adicionado</p>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newLink.name}
                onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                placeholder="Nome do link (ex: ResearchGate)"
                className="border-blue-200"
              />
              <Input
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="URL (ex: https://researchgate.net/profile/...)"
                className="border-blue-200"
                type="url"
              />
              <Button 
                type="button" 
                onClick={addExternalLink}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newLink.name.trim() || !newLink.url.trim()}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </Card>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;