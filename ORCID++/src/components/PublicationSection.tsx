
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PublicationItem from './PublicationItem';
import { useNavigate } from 'react-router-dom';
import { Publication } from '../types';

// Props que este componente recebe
interface PublicationSectionProps {
  publications: Publication[];
}

const PublicationSection = ({ publications }: PublicationSectionProps) => {
  const navigate = useNavigate();
  
  // Estado para controlar quais seções estão expandidas
  const [expandedTypes, setExpandedTypes] = useState({
    'Journal Article': true,
    'Conference Paper': true,
    'Book Chapter': true,
  });

  // Função para expandir/contrair uma seção
  const toggleExpand = (type: string) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Agrupa publicações por tipo
  const groupedPublications = publications.reduce((acc: Record<string, Publication[]>, pub) => {
    if (!acc[pub.type]) {
      acc[pub.type] = [];
    }
    acc[pub.type].push(pub);
    return acc;
  }, {});

  return (
    <Card className="p-4 mb-6">
      {/* Cabeçalho da seção */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title">Publicações Acadêmicas</h2>
        <Button 
          variant="outline" 
          onClick={() => navigate('/publications')}
          className="text-sm"
        >
          Ver todas
        </Button>
      </div>
      
      {/* Se não há publicações */}
      {publications.length === 0 ? (
        <p className="text-gray-500">Nenhuma publicação encontrada.</p>
      ) : (
        <>
          {/* Para cada tipo de publicação */}
          {['Journal Article', 'Conference Paper', 'Book Chapter'].map((type) => {
            const typePubs = groupedPublications[type] || [];
            if (typePubs.length === 0) return null;
            
            return (
              <div key={type} className="mb-6">
                {/* Cabeçalho clicável para expandir/contrair */}
                <div 
                  className="accordion-header cursor-pointer flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                  onClick={() => toggleExpand(type)}
                >
                  <h3 className="font-medium">{type} ({typePubs.length})</h3>
                  {expandedTypes[type] ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
                
                {/* Conteúdo da seção (só aparece se expandida) */}
                {expandedTypes[type] && (
                  <div className="mt-2 space-y-4">
                    {typePubs.map((pub, index) => (
                      <div key={index}>
                        <PublicationItem publication={pub} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
};

export default PublicationSection;
