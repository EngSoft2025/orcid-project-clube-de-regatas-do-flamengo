import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage, 
  totalItems 
}: PaginationProps) => {
  // Função para gerar números das páginas visíveis
  const getVisiblePages = () => {
    const delta = 2; // Quantas páginas mostrar de cada lado da atual
    const range = [];
    const rangeWithDots = [];

    // Sempre mostrar primeira página
    range.push(1);

    // Calcular intervalo ao redor da página atual
    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    // Sempre mostrar última página (se existir mais de uma)
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Adicionar "..." onde necessário
    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200">
      {/* Informações sobre itens */}
      <div className="text-sm text-gray-600">
        Mostrando {startItem} a {endItem} de {totalItems} itens
      </div>

      {/* Controles de paginação */}
      <div className="flex items-center gap-2">
        {/* Botão página anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {/* Números das páginas */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => 
            page === '...' ? (
              <span key={index} className="px-2 py-1 text-gray-500">...</span>
            ) : (
              <Button
                key={index}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={`min-w-[2.5rem] ${
                  currentPage === page 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'hover:bg-blue-50'
                }`}
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Botão próxima página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;