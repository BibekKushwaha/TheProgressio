import '@testing-library/jest-dom';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the calendar hook (initial schedule) and replace CreateHolidayForm with a stub
type Holiday = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  pauseNotifications: boolean;
};

vi.mock('@repo/store', () => ({
  useGetCalendarDailyScheduleQuery: (params: { date: string | Date }) => ({ data: { date: params.date, dayOfWeek: 6, isHoliday: false, holidayName: null, pauseNotifications: false, conflicts: [], items: [] }, refetch: vi.fn() })
}));

const MockCreateHolidayForm: React.FC<{ defaultDate: string | Date; onCreated: (h: Holiday) => void }> = ({ defaultDate, onCreated }) => (
  <button onClick={() => onCreated({ id: 'h1', name: 'Stub Holiday', startDate: defaultDate, endDate: defaultDate, pauseNotifications: true })}>Simulate Create</button>
);

vi.mock('../components/calendar/CreateHolidayForm', () => ({
  default: MockCreateHolidayForm,
}));

import { ScheduleDetailPanel } from '../components/calendar/ScheduleDetailPanel';

describe('ScheduleDetailPanel optimistic update', () => {
  it('shows holiday banner immediately when CreateHolidayForm invokes onCreated', () => {
    const date = new Date('2026-02-07');
    render(<ScheduleDetailPanel date={date} />);

    // Initially no holiday
    expect(screen.queryByText(/Holiday/)).toBeNull();

    // Click the stub button to simulate creation
    fireEvent.click(screen.getByText('Simulate Create'));

    // Banner should now appear
    expect(screen.getByText('Stub Holiday')).toBeTruthy();
  });
});
