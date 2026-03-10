import { describe, expect, it, vi } from 'vitest';

vi.mock('@repo/db', () => ({
  prisma: {},
}));

import { timetableService } from '../src/services/timetable.service.js';

describe('timetableService.previewTimetableImport', () => {
  it('parses timetable rows across multiple deterministic formats', () => {
    const result = timetableService.previewTimetableImport(`
      Mon 9-10 Math
      Monday 09:00-10:00 Mathematics
      9-10 Physics Tuesday
      Wednesday | 11-12 | Chemistry
    `);

    expect(result.entries).toHaveLength(4);
    expect(result.entries[0]).toMatchObject({ subjectName: 'Math', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' });
    expect(result.entries[1]).toMatchObject({ subjectName: 'Mathematics', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' });
    expect(result.entries[2]).toMatchObject({ subjectName: 'Physics', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' });
    expect(result.entries[3]).toMatchObject({ subjectName: 'Chemistry', dayOfWeek: 3, startTime: '11:00', endTime: '12:00' });
    expect(result.parser).toMatchObject({
      deterministicMatches: 4,
      aiMatches: 0,
    });
  });

  it('adds overlap and duplicate warnings to preview rows', () => {
    const result = timetableService.previewTimetableImport(`
      Mon 9-10 Math
      Mon 9:30-10:30 Physics
      Mon 9-10 Math
    `);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.warnings).toContain('Overlaps with Physics');
    expect(result.entries[0]?.warnings).toContain('Duplicate row in import');
    expect(result.entries[1]?.warnings).toContain('Overlaps with Math');
  });

  it('normalizes basic OCR artifacts in day and time parsing', () => {
    const result = timetableService.previewTimetableImport('M0n 9:O0-10:O0 Math');

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      subjectName: 'Math',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
    });
  });

  it('parses day/time table format into recurring class rows', () => {
    const result = timetableService.previewTimetableImport(`
      Day   9-10   10-11
      Mon   Math   Physics
      Tue   Chem   Bio
    `);

    expect(result.entries).toHaveLength(4);
    expect(result.entries[0]).toMatchObject({ subjectName: 'Math', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' });
    expect(result.entries[1]).toMatchObject({ subjectName: 'Physics', dayOfWeek: 1, startTime: '10:00', endTime: '11:00' });
    expect(result.entries[2]).toMatchObject({ subjectName: 'Chem', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' });
    expect(result.entries[3]).toMatchObject({ subjectName: 'Bio', dayOfWeek: 2, startTime: '10:00', endTime: '11:00' });
    expect(result.warnings).toHaveLength(0);
  });

  it('parses pipe-separated day/time table format', () => {
    const result = timetableService.previewTimetableImport(`
      Day | 9-10 | 10-11
      Mon | Math | Physics
      Tue | Chem | Bio
    `);

    expect(result.entries).toHaveLength(4);
    expect(result.entries[0]).toMatchObject({ subjectName: 'Math', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' });
    expect(result.entries[1]).toMatchObject({ subjectName: 'Physics', dayOfWeek: 1, startTime: '10:00', endTime: '11:00' });
    expect(result.entries[2]).toMatchObject({ subjectName: 'Chem', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' });
    expect(result.entries[3]).toMatchObject({ subjectName: 'Bio', dayOfWeek: 2, startTime: '10:00', endTime: '11:00' });
    expect(result.warnings).toHaveLength(0);
  });

  it('infers end time when only a start time is provided', () => {
    const result = timetableService.previewTimetableImport(`
      Mon 9 Math
      Mon 10 Physics
    `);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      subjectName: 'Math',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(result.entries[0]?.warnings).toContain('End time inferred from next class');
  });
});
