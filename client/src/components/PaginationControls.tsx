import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  if (totalPages <= 1) {
    return (
      <div className={`flex justify-between items-center ${className}`}>
        <div className="text-sm text-gray-600">
          {startItem}-{endItem} de {totalItems.toLocaleString()} {totalItems === 1 ? 'elemento' : 'elementos'}
        </div>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline"
            className="px-3 py-1"
            disabled
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="px-3 py-1"
            disabled
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
  
  // Crear array de páginas a mostrar (sistema avanzado)
  const showMaxPages = 7; // Aumentamos a 7 páginas visibles
  let pages = [];
  let showFirstDots = false;
  let showLastDots = false;
  
  if (totalPages <= showMaxPages) {
    // Si hay pocas páginas, mostrar todas
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    // Sistema avanzado con puntos suspensivos
    if (currentPage <= 4) {
      // Inicio: mostrar 1-5 ... última
      pages = [1, 2, 3, 4, 5];
      showLastDots = true;
    } else if (currentPage >= totalPages - 3) {
      // Final: primera ... últimas-5
      pages = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
      showFirstDots = true;
    } else {
      // Medio: primera ... actual-1, actual, actual+1 ... última
      pages = [currentPage - 1, currentPage, currentPage + 1];
      showFirstDots = true;
      showLastDots = true;
    }
  }
  
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <div className="text-sm text-gray-600">
        {startItem}-{endItem} de {totalItems.toLocaleString()} {totalItems === 1 ? 'elemento' : 'elementos'}
      </div>
      
      <div className="flex gap-1 items-center">
        {/* Primera página */}
        <Button 
          size="sm" 
          variant="outline"
          className="px-3 py-1 hidden sm:flex"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        {/* Página anterior */}
        <Button 
          size="sm" 
          variant="outline"
          className="px-3 py-1"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Primera página si hay puntos */}
        {showFirstDots && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="px-3 py-1 min-w-[2.5rem] hidden sm:flex"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            <span className="px-2 text-gray-500 hidden sm:inline">...</span>
          </>
        )}
        
        {/* Números de página */}
        {pages.map(page => (
          <Button
            key={page}
            size="sm"
            variant={currentPage === page ? "default" : "outline"}
            className="px-3 py-1 min-w-[2.5rem] hidden sm:flex"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}
        
        {/* Última página si hay puntos */}
        {showLastDots && (
          <>
            <span className="px-2 text-gray-500 hidden sm:inline">...</span>
            <Button
              size="sm"
              variant="outline"
              className="px-3 py-1 min-w-[2.5rem] hidden sm:flex"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}
        
        {/* Indicador de página actual en móvil */}
        <span className="text-sm flex items-center px-2 sm:hidden">
          {currentPage} / {totalPages}
        </span>
        
        {/* Página siguiente */}
        <Button 
          size="sm" 
          variant="outline"
          className="px-3 py-1"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Última página */}
        <Button 
          size="sm" 
          variant="outline"
          className="px-3 py-1 hidden sm:flex"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;