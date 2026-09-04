import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from '../../components/Sidebar';
import { UserRole } from '../../types/auth';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      firstName: 'A',
      lastName: 'Nguyễn',
      role: 'ADMIN' as UserRole,
      department: 'Sản xuất',
      secondaryDepartments: [],
    },
    logout: vi.fn(),
  }),
}));

vi.mock('../../services/notificationService', () => ({
  default: { getUnreadCount: vi.fn().mockResolvedValue({ data: { count: 0 } }) },
}));

function renderSidebar(collapsed: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Sidebar collapsed={collapsed} onToggle={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Sidebar branding', () => {
  it('keeps the logo visible when expanded', () => {
    renderSidebar(false);

    const logo = screen.getByAltText('An Binh Foods');
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute('src')).toContain('abf-logo');
    expect(logo.className).toContain('h-8');
  });

  it('shrinks the logo instead of hiding it when collapsed', () => {
    renderSidebar(true);

    const logo = screen.getByAltText('An Binh Foods');
    expect(logo).toBeInTheDocument();
    expect(logo.className).toContain('h-6');

    // The 64px rail cannot fit logo and toggle on one row; a squeezed flex item
    // is how the logo used to disappear, so both must opt out of shrinking.
    expect(logo.className).toContain('shrink-0');
    expect(logo.className).not.toContain('hidden');

    const header = logo.closest('div');
    expect(header?.className).toContain('flex-col');
  });

  it('exposes an accessible name for the collapse toggle in both states', () => {
    const { unmount } = renderSidebar(false);
    expect(screen.getByRole('button', { name: 'Thu gọn menu' })).toBeInTheDocument();
    unmount();

    renderSidebar(true);
    expect(screen.getByRole('button', { name: 'Mở menu' })).toBeInTheDocument();
  });
});
