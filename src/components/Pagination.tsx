import { ChevronLeft, ChevronRight } from 'lucide-react';
import s from './Pagination.module.css';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const sizeSelect = onLimitChange && (
    <label className={s.selectWrapper}>
      <span>Rows per page</span>
      <select
        value={limit}
        onChange={(e) => {
          onLimitChange(Number(e.target.value));
          onPageChange(1); // Reset to page 1 on limit change
        }}
        className={s.pageSizeSelect}
      >
        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );

  if (total === 0 || totalPages <= 1) {
    // Still show the page size selector even if there is only 1 page
    return sizeSelect ? <div className={`${s.paginationContainer} ${s.endOnly}`}>{sizeSelect}</div> : null;
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
    <nav className={s.paginationContainer} aria-label="Pagination">
      <div className={s.paginationInfo}>
        <span>
          <span className={s.highlight}>{startEntry}–{endEntry}</span> of <span className={s.highlight}>{total}</span>
        </span>
        {sizeSelect}
      </div>

      <div className={s.paginationControls}>
        <button
          type="button"
          className={s.paginationBtn}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        {getPageNumbers().map((num, index) => {
          if (num === '...') {
            return <span key={`ellipsis-${index}`} className={s.ellipsis} aria-hidden="true">…</span>;
          }
          return (
            <button
              type="button"
              key={`page-${num}`}
              className={`${s.paginationBtn} ${page === num ? s.paginationBtnActive : ''}`}
              onClick={() => onPageChange(num as number)}
              aria-label={`Page ${num}`}
              aria-current={page === num ? 'page' : undefined}
            >
              {num}
            </button>
          );
        })}

        <button
          type="button"
          className={s.paginationBtn}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
