import React from 'react';
import s from './Pagination.module.css';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (total === 0 || totalPages <= 1) {
    if (onLimitChange) {
      // Still show page size selector even if there is only 1 page
      return (
        <div className={s.paginationContainer} style={{ justifyContent: 'flex-end' }}>
          <div className={s.selectWrapper}>
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className={s.pageSizeSelect}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const startEntry = (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  // Generate page numbers to show, with ellipsis if necessary
  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show page 1
      pageNumbers.push(1);

      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 2) {
        end = 4;
      } else if (page >= totalPages - 1) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pageNumbers.push('...');
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      if (end < totalPages - 1) {
        pageNumbers.push('...');
      }

      // Always show last page
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  return (
    <div className={s.paginationContainer}>
      <div className={s.paginationInfo}>
        <span>
          Showing <span className={s.highlight}>{startEntry}</span> to{' '}
          <span className={s.highlight}>{endEntry}</span> of{' '}
          <span className={s.highlight}>{total}</span> entries
        </span>
        {onLimitChange && (
          <div className={s.selectWrapper} style={{ marginLeft: '12px' }}>
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1); // Reset to page 1 on limit change
              }}
              className={s.pageSizeSelect}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
        )}
      </div>

      <div className={s.paginationControls}>
        <button
          className={s.paginationBtn}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>

        {getPageNumbers().map((num, index) => {
          if (num === '...') {
            return (
              <span key={`ellipsis-${index}`} style={{ padding: '0 8px' }}>
                ...
              </span>
            );
          }
          return (
            <button
              key={`page-${num}`}
              className={`${s.paginationBtn} ${page === num ? s.paginationBtnActive : ''}`}
              onClick={() => onPageChange(num as number)}
            >
              {num}
            </button>
          );
        })}

        <button
          className={s.paginationBtn}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
