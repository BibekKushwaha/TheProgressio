import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HabitsClient } from '../app/(dashboard)/habits/HabitsClient';
import { useGetHabitsQuery } from '@repo/store';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

vi.mock('@repo/store', () => ({
  useGetHabitsQuery: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('@/hooks/useNetworkWaterfall', () => ({
  useNetworkWaterfall: vi.fn(),
}));

vi.mock('@/components/habit/HabitCard', () => ({
  HabitCard: ({ habit }: { habit: { name: string } }) => <div>{habit.name}</div>,
}));

vi.mock('@/components/habit/HabitQuickCreate', () => ({
  HabitQuickCreate: () => <div>__quick_create__</div>,
}));

vi.mock('@/components/habit/HabitDialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>__habit_dialog__</div> : null),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');

  const MenuContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
    open: false,
    setOpen: () => undefined,
  });

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = React.useState(false);

      return (
        <MenuContext.Provider value={{ open, setOpen }}>
          <div>{children}</div>
        </MenuContext.Provider>
      );
    },
    DropdownMenuTrigger: ({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) => {
      const { setOpen } = React.useContext(MenuContext);

      if (asChild) {
        return React.cloneElement(children, {
          onClick: (event: React.MouseEvent) => {
            children.props.onClick?.(event);
            setOpen(true);
          },
        });
      }

      return (
        <button type="button" onClick={() => setOpen(true)}>
          {children}
        </button>
      );
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = React.useContext(MenuContext);
      return open ? <div>{children}</div> : null;
    },
    DropdownMenuItem: ({ children, onSelect, ...props }: { children: React.ReactNode; onSelect?: () => void }) => {
      const { setOpen } = React.useContext(MenuContext);

      return (
        <button
          type="button"
          {...props}
          onClick={() => {
            onSelect?.();
            setOpen(false);
          }}
        >
          {children}
        </button>
      );
    },
  };
});

describe('HabitsClient create mode chooser', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      replace: vi.fn(),
    });
    (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue('/habits');
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    });

    (useGetHabitsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        habits: [
          {
            id: 'habit-1',
            name: 'Deep Work',
          },
        ],
      },
      isLoading: false,
    });
  });

  it('opens chooser with AI and manual options from Add Habit', () => {
    render(<HabitsClient />);

    expect(screen.queryByText('__quick_create__')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add habit/i }));

    expect(screen.getByRole('button', { name: /ai create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual create/i })).toBeInTheDocument();
  });

  it('opens manual habit dialog when Manual Create is selected', () => {
    render(<HabitsClient />);

    fireEvent.click(screen.getByRole('button', { name: /add habit/i }));
    fireEvent.click(screen.getByRole('button', { name: /manual create/i }));

    expect(screen.getByText('__habit_dialog__')).toBeInTheDocument();
    expect(screen.queryByText('__quick_create__')).not.toBeInTheDocument();
  });

  it('reveals quick create when AI Create is selected', () => {
    render(<HabitsClient />);

    fireEvent.click(screen.getByRole('button', { name: /add habit/i }));
    fireEvent.click(screen.getByRole('button', { name: /ai create/i }));

    expect(screen.getByText('__quick_create__')).toBeInTheDocument();
    expect(screen.queryByText('__habit_dialog__')).not.toBeInTheDocument();
  });
});
