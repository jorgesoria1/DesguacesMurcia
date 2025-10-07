import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
  }[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  onRowClick,
  rowClassName,
  emptyState,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return emptyState;
  }

  // Calcular páginas para la paginación
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 0;
  const currentPage = pagination
    ? Math.floor(pagination.offset / pagination.limit) + 1
    : 1;

  // Generar array de páginas a mostrar en la paginación
  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={cn("font-montserrat", column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted",
                  rowClassName && rowClassName(item)
                )}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={`${rowIndex}-${colIndex}`}
                    className={column.className}
                  >
                    {typeof column.accessor === "function"
                      ? column.accessor(item)
                      : (item[column.accessor] as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) {
                      pagination.onPageChange(currentPage - 1);
                    }
                  }}
                  className={cn(
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              
              {getPageNumbers().map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      pagination.onPageChange(page);
                    }}
                    isActive={page === currentPage}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) {
                      pagination.onPageChange(currentPage + 1);
                    }
                  }}
                  className={cn(
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
